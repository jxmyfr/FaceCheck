"""
FaceCheck — เตรียมรูปนักเรียนสำหรับ import-zip
อ่าน Excel → กรอกรหัสนักเรียน → เลือกรูป 3 มุม → rename + copy ไป output folder

ติดตั้ง: pip install openpyxl pillow
รัน:     python tools/prepare_photos.py
"""

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path
import ctypes

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    pass

import openpyxl
from PIL import Image, ImageTk, ImageStat

ANGLES = [("front", "มุมตรง"), ("left", "มุมซ้าย"), ("right", "มุมขวา")]

SLOT_SIZE  = 130
MIN_DIM    = 80
MIN_STD    = 6.0

C = {
    "bg":          "#F1F5F9",
    "card":        "#FFFFFF",
    "primary":     "#4F46E5",
    "primary_dk":  "#3730A3",
    "success":     "#16A34A",
    "success_bg":  "#DCFCE7",
    "error":       "#DC2626",
    "error_bg":    "#FEE2E2",
    "warn":        "#D97706",
    "text":        "#0F172A",
    "sub":         "#64748B",
    "border":      "#CBD5E1",
    "slot_empty":  "#E2E8F0",
    "slot_ok":     "#BBF7D0",
    "slot_fail":   "#FECACA",
    "slot_border_ok":   "#16A34A",
    "slot_border_fail": "#DC2626",
    "slot_border_idle": "#94A3B8",
    "btn_clear":   "#E2E8F0",
    "save_ready":  "#16A34A",
    "save_wait":   "#94A3B8",
}


def _validate(path: str) -> tuple[bool, str]:
    try:
        img = Image.open(path)
        img.verify()
        img = Image.open(path)
        w, h = img.size
        if w < MIN_DIM or h < MIN_DIM:
            return False, f"เล็กเกิน {w}×{h}"
        if ImageStat.Stat(img.convert("L")).stddev[0] < MIN_STD:
            return False, "รูปว่างเปล่า"
        return True, f"{w}×{h}px"
    except Exception:
        return False, "เปิดไม่ได้"


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("FaceCheck — เตรียมรูปนักเรียน")
        self.configure(bg=C["bg"])
        self.resizable(False, False)

        self.students:   dict[str, dict] = {}
        self.output_dir: Path | None     = None
        self.photos:  dict[str, Path | None]      = {a: None for a, _ in ANGLES}
        self._thumbs: dict[str, ImageTk.PhotoImage] = {}
        self._img_ok: dict[str, bool | None]       = {a: None for a, _ in ANGLES}
        self._done_count = 0

        self._build()
        self._center(500, 660)

    def _center(self, w: int, h: int):
        self.update_idletasks()
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")

    # ── Build ─────────────────────────────────────────────────────
    def _build(self):
        p = dict(padx=14)

        # ── Top bar: Excel + session count ──
        top = tk.Frame(self, bg=C["card"], pady=10)
        top.pack(fill="x", **p, pady=(14, 0))

        left = tk.Frame(top, bg=C["card"])
        left.pack(side="left", fill="x", expand=True)
        self._excel_name = tk.Label(left, text="ยังไม่ได้โหลด Excel",
                                    font=("Segoe UI", 9, "bold"), bg=C["card"], fg=C["text"], anchor="w")
        self._excel_name.pack(anchor="w")
        self._excel_sub = tk.Label(left, text="กดปุ่มเพื่อเลือกไฟล์ข้อมูลนักเรียน",
                                   font=("Segoe UI", 8), bg=C["card"], fg=C["sub"], anchor="w")
        self._excel_sub.pack(anchor="w")

        right = tk.Frame(top, bg=C["card"])
        right.pack(side="right")
        self._done_lbl = tk.Label(right, text="บันทึกแล้ว 0 คน",
                                  font=("Segoe UI", 8), bg=C["card"], fg=C["sub"])
        self._done_lbl.pack(anchor="e")
        tk.Button(right, text="เลือก Excel", command=self._load_excel,
                  bg=C["primary"], fg="white", font=("Segoe UI", 8, "bold"),
                  relief="flat", padx=10, pady=4, cursor="hand2").pack(anchor="e", pady=(4, 0))

        _sep(self, C["border"])

        # ── Student lookup ──
        stu = _card(self, C["card"], pad=(14, 10))
        stu.pack(fill="x", **p, pady=(10, 0))

        row = tk.Frame(stu, bg=C["card"])
        row.pack(fill="x")
        tk.Label(row, text="รหัสนักเรียน", font=("Segoe UI", 8),
                 bg=C["card"], fg=C["sub"]).pack(anchor="w")

        inp = tk.Frame(stu, bg=C["card"])
        inp.pack(fill="x", pady=(4, 0))
        self.sid_var = tk.StringVar()
        self.sid_combo = ttk.Combobox(inp, textvariable=self.sid_var,
                                      font=("Segoe UI", 11), state="normal")
        self.sid_combo.pack(side="left", fill="x", expand=True, ipady=5, padx=(0, 8))
        self.sid_combo.bind("<<ComboboxSelected>>", lambda _: self._lookup())
        self.sid_combo.bind("<Return>",             lambda _: self._lookup())
        tk.Button(inp, text="ค้นหา", command=self._lookup,
                  bg=C["primary"], fg="white", font=("Segoe UI", 9, "bold"),
                  relief="flat", padx=16, pady=6, cursor="hand2").pack(side="right")

        self._info_fr = tk.Frame(stu, bg=C["card"], pady=6)
        self._info_fr.pack(fill="x", pady=(8, 0))
        self._info_lbl = tk.Label(self._info_fr, text="กรอกรหัสแล้วกด Enter",
                                  font=("Segoe UI", 10), bg=C["card"], fg=C["sub"],
                                  anchor="w", justify="left")
        self._info_lbl.pack(anchor="w")

        _sep(self, C["border"])

        # ── Photo slots ──
        photo_fr = tk.Frame(self, bg=C["bg"])
        photo_fr.pack(fill="x", **p, pady=10)

        self._slots:        dict[str, tk.Frame]  = {}
        self._slot_img:     dict[str, tk.Label]  = {}
        self._slot_status:  dict[str, tk.Label]  = {}

        for i, (angle, label) in enumerate(ANGLES):
            col = tk.Frame(photo_fr, bg=C["bg"])
            col.grid(row=0, column=i, padx=6, sticky="n")
            photo_fr.columnconfigure(i, weight=1)

            # Label + check indicator row
            head = tk.Frame(col, bg=C["bg"])
            head.pack(fill="x", pady=(0, 4))
            tk.Label(head, text=label, font=("Segoe UI", 9, "bold"),
                     bg=C["bg"], fg=C["text"]).pack(side="left")
            chk = tk.Label(head, text="", font=("Segoe UI", 9),
                           bg=C["bg"], fg=C["success"])
            chk.pack(side="right")
            self._slot_status[angle] = chk

            # Slot (clickable)
            slot = tk.Frame(col, bg=C["slot_empty"], width=SLOT_SIZE, height=SLOT_SIZE,
                            highlightthickness=2, highlightbackground=C["slot_border_idle"],
                            cursor="hand2")
            slot.pack()
            slot.pack_propagate(False)
            slot.bind("<Button-1>", lambda e, a=angle: self._pick(a))
            self._slots[angle] = slot

            plus = tk.Label(slot, text="+", font=("Segoe UI", 28), bg=C["slot_empty"], fg=C["sub"],
                            cursor="hand2")
            plus.place(relx=0.5, rely=0.5, anchor="center")
            plus.bind("<Button-1>", lambda e, a=angle: self._pick(a))
            self._slot_img[angle] = plus

            # Clear button (hidden until photo selected)
            clr = tk.Button(col, text="ล้าง", command=lambda a=angle: self._clear(a),
                            bg=C["btn_clear"], fg=C["sub"], font=("Segoe UI", 7),
                            relief="flat", padx=6, pady=1, cursor="hand2")
            clr.pack(pady=(4, 0))
            clr.pack_forget()          # hidden initially
            self._clear_btns = getattr(self, "_clear_btns", {})
            self._clear_btns[angle] = clr

        _sep(self, C["border"])

        # ── Output folder + Save ──
        bot = tk.Frame(self, bg=C["bg"], pady=10)
        bot.pack(fill="x", **p)

        out_row = tk.Frame(bot, bg=C["bg"])
        out_row.pack(fill="x", pady=(0, 10))
        self._outdir_lbl = tk.Label(out_row, text="ยังไม่ได้เลือกโฟลเดอร์ปลายทาง",
                                    font=("Segoe UI", 8), bg=C["bg"], fg=C["sub"], anchor="w")
        self._outdir_lbl.pack(side="left", fill="x", expand=True)
        tk.Button(out_row, text="เลือกโฟลเดอร์", command=self._pick_outdir,
                  bg=C["btn_clear"], fg=C["text"], font=("Segoe UI", 8),
                  relief="flat", padx=8, pady=3, cursor="hand2").pack(side="right")

        self._save_btn = tk.Button(bot, text="เลือกรูปให้ครบก่อน (0/3)",
                                   command=self._save,
                                   bg=C["save_wait"], fg="white",
                                   font=("Segoe UI", 11, "bold"),
                                   relief="flat", pady=13, cursor="hand2")
        self._save_btn.pack(fill="x")

        # Keyboard shortcut
        self.bind("<Control-Return>", lambda _: self._save())

    # ── Logic ─────────────────────────────────────────────────────
    def _load_excel(self):
        path = filedialog.askopenfilename(filetypes=[("Excel", "*.xlsx *.xls")])
        if not path:
            return
        try:
            wb = openpyxl.load_workbook(path, data_only=True)
            ws = wb.active
            self.students = {}
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not row or not row[0]:
                    continue
                sid = str(row[0]).strip()
                self.students[sid] = {
                    "name": f"{row[1] or ''}{row[2] or ''} {row[3] or ''}".strip(),
                    "info": f"ม.{row[4] or '?'}/{row[5] or '?'}",
                }
            self.sid_combo["values"] = [f"{s} - {d['name']}" for s, d in self.students.items()]
            self._excel_name.configure(text=Path(path).name, fg=C["text"])
            self._excel_sub.configure(text=f"✓ {len(self.students)} คน พร้อมใช้งาน", fg=C["success"])
            self.sid_combo.focus_set()
        except Exception as e:
            messagebox.showerror("Error", f"อ่าน Excel ไม่ได้: {e}")

    def _lookup(self):
        raw = self.sid_var.get().strip()
        sid = raw.split(" - ")[0] if " - " in raw else raw
        if not self.students:
            messagebox.showwarning("", "โหลดไฟล์ Excel ก่อน")
            return
        if sid in self.students:
            s = self.students[sid]
            self._info_fr.configure(bg=C["success_bg"])
            self._info_lbl.configure(
                text=f"👤 {s['name']}   📍 {s['info']}",
                bg=C["success_bg"], fg=C["text"], font=("Segoe UI", 10, "bold")
            )
        else:
            self._info_fr.configure(bg=C["error_bg"])
            self._info_lbl.configure(
                text=f"❌ ไม่พบรหัส '{sid}'",
                bg=C["error_bg"], fg=C["error"], font=("Segoe UI", 10, "bold")
            )

    def _pick(self, angle: str):
        path = filedialog.askopenfilename(filetypes=[("รูปภาพ", "*.jpg *.jpeg *.png")])
        if not path:
            return
        self.photos[angle] = Path(path)

        ok, info = _validate(path)
        self._img_ok[angle] = ok
        border = C["slot_border_ok"] if ok else C["slot_border_fail"]
        bg     = C["slot_ok"]        if ok else C["slot_fail"]
        self._slots[angle].configure(highlightbackground=border, bg=bg)

        # Status checkmark / warning
        self._slot_status[angle].configure(
            text="✓" if ok else f"⚠ {info}",
            fg=C["success"] if ok else C["warn"]
        )

        # Thumbnail
        try:
            img = Image.open(path)
            img.thumbnail((SLOT_SIZE, SLOT_SIZE))
            photo = ImageTk.PhotoImage(img)
            self._thumbs[angle] = photo
            lbl = self._slot_img[angle]
            lbl.configure(image=photo, text="", bg=bg)
            lbl.image = photo
        except Exception:
            self._slot_status[angle].configure(text="⚠ อ่านรูปไม่ได้", fg=C["error"])

        self._clear_btns[angle].pack(pady=(4, 0))
        self._update_save_btn()

    def _clear(self, angle: str):
        self.photos[angle]  = None
        self._img_ok[angle] = None
        self._thumbs.pop(angle, None)
        lbl = self._slot_img[angle]
        lbl.configure(image="", text="+", bg=C["slot_empty"])
        self._slots[angle].configure(highlightbackground=C["slot_border_idle"], bg=C["slot_empty"])
        self._slot_status[angle].configure(text="")
        self._clear_btns[angle].pack_forget()
        self._update_save_btn()

    def _update_save_btn(self):
        n = sum(1 for a, _ in ANGLES if self.photos[a])
        if n == 3:
            self._save_btn.configure(
                text="✅  บันทึก — ทำคนถัดไป  (Ctrl+Enter)",
                bg=C["save_ready"]
            )
        else:
            self._save_btn.configure(
                text=f"เลือกรูปให้ครบก่อน ({n}/3)",
                bg=C["save_wait"]
            )

    def _pick_outdir(self):
        d = filedialog.askdirectory()
        if d:
            self.output_dir = Path(d)
            self._outdir_lbl.configure(text=f"📁 {self.output_dir}", fg=C["text"])

    def _save(self):
        raw = self.sid_var.get().strip()
        sid = raw.split(" - ")[0] if " - " in raw else raw

        if not sid:
            messagebox.showwarning("", "กรอกรหัสนักเรียนก่อน")
            return
        if self.students and sid not in self.students:
            if not messagebox.askyesno("ไม่พบใน Excel", f"รหัส '{sid}' ไม่อยู่ใน Excel\nบันทึกต่อหรือไม่?"):
                return
        missing = [lbl for a, lbl in ANGLES if not self.photos[a]]
        if missing:
            messagebox.showwarning("", f"ยังไม่ได้เลือกรูป: {', '.join(missing)}")
            return
        failed = [lbl for a, lbl in ANGLES if self._img_ok[a] is False]
        if failed:
            if not messagebox.askyesno("รูปมีปัญหา ⚠",
                                       f"รูปมีปัญหา: {', '.join(failed)}\nบันทึกต่อหรือไม่?"):
                return
        if not self.output_dir:
            self._pick_outdir()
            if not self.output_dir:
                return

        for angle, _ in ANGLES:
            dest = self.output_dir / f"{sid}_{angle}.jpg"
            try:
                Image.open(self.photos[angle]).convert("RGB").save(dest, "JPEG", quality=92)
            except Exception as err:
                messagebox.showerror("Error", f"บันทึก {angle} ไม่สำเร็จ: {err}")
                return

        self._done_count += 1
        self._done_lbl.configure(text=f"บันทึกแล้ว {self._done_count} คน", fg=C["success"])
        self._reset()

    def _reset(self):
        self.sid_var.set("")
        self._info_fr.configure(bg=C["card"])
        self._info_lbl.configure(text="กรอกรหัสแล้วกด Enter", bg=C["card"],
                                 fg=C["sub"], font=("Segoe UI", 10))
        for angle, _ in ANGLES:
            self._clear(angle)
        self.sid_combo.focus_set()


# ── Helpers ───────────────────────────────────────────────────────
def _sep(parent, color: str):
    tk.Frame(parent, bg=color, height=1).pack(fill="x", padx=14, pady=4)


def _card(parent, bg: str, pad: tuple = (12, 8)) -> tk.Frame:
    return tk.Frame(parent, bg=bg, padx=pad[0], pady=pad[1])


if __name__ == "__main__":
    app = App()
    app.mainloop()
