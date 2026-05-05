"""
FaceCheck — เตรียมรูปนักเรียนสำหรับ import-zip
อ่าน Excel → กรอกรหัสนักเรียน → เลือกรูป 3 มุม → rename + copy ไป output folder

ติดตั้ง: pip install openpyxl pillow
รัน:     python tools/prepare_photos.py
"""

import shutil
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path

import openpyxl
from PIL import Image, ImageTk

ANGLES = [
    ("front", "มุมตรง"),
    ("left",  "มุมซ้าย"),
    ("right", "มุมขวา"),
]

THUMB_SIZE = (120, 120)


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("FaceCheck — เตรียมรูปนักเรียน")
        self.resizable(False, False)
        self.configure(bg="#F9FAFB")

        self.students: dict[str, dict] = {}
        self.output_dir: Path | None = None
        self.photos: dict[str, Path | None] = {a: None for a, _ in ANGLES}
        self._thumbs: dict[str, ImageTk.PhotoImage] = {}

        self._build()

    # ── UI ────────────────────────────────────────────────────────
    def _build(self):
        pad = dict(padx=14, pady=8)

        # ── Excel section ──
        excel_fr = tk.LabelFrame(self, text="  📄 ไฟล์ข้อมูลนักเรียน (Excel)  ",
                                  bg="#F9FAFB", fg="#374151", font=("Helvetica", 10, "bold"),
                                  padx=10, pady=8)
        excel_fr.grid(row=0, column=0, columnspan=2, sticky="ew", **pad)

        self.excel_path_var = tk.StringVar(value="ยังไม่ได้เลือกไฟล์")
        tk.Label(excel_fr, textvariable=self.excel_path_var, bg="#F9FAFB",
                 fg="#6B7280", font=("Helvetica", 9), width=48, anchor="w").grid(row=0, column=0)
        tk.Button(excel_fr, text="เลือกไฟล์ Excel", command=self._load_excel,
                  bg="#1A56DB", fg="white", font=("Helvetica", 9, "bold"),
                  relief="flat", padx=10, pady=4, cursor="hand2").grid(row=0, column=1, padx=(8, 0))

        # student count label
        self.student_count_var = tk.StringVar(value="")
        tk.Label(excel_fr, textvariable=self.student_count_var, bg="#F9FAFB",
                 fg="#16A34A", font=("Helvetica", 9)).grid(row=1, column=0, columnspan=2, sticky="w", pady=(4, 0))

        # ── Student ID section ──
        sid_fr = tk.LabelFrame(self, text="  👤 รหัสนักเรียน  ",
                                bg="#F9FAFB", fg="#374151", font=("Helvetica", 10, "bold"),
                                padx=10, pady=8)
        sid_fr.grid(row=1, column=0, columnspan=2, sticky="ew", **pad)

        tk.Label(sid_fr, text="รหัสนักเรียน:", bg="#F9FAFB",
                 font=("Helvetica", 10)).grid(row=0, column=0, sticky="w")
        self.sid_var = tk.StringVar()
        sid_entry = tk.Entry(sid_fr, textvariable=self.sid_var, font=("Helvetica", 12, "bold"),
                             width=18, relief="solid", bd=1)
        sid_entry.grid(row=0, column=1, padx=(8, 0))
        sid_entry.bind("<Return>", lambda _: self._lookup())
        tk.Button(sid_fr, text="ค้นหา", command=self._lookup,
                  bg="#1A56DB", fg="white", font=("Helvetica", 9, "bold"),
                  relief="flat", padx=10, pady=4, cursor="hand2").grid(row=0, column=2, padx=(8, 0))

        self.info_var = tk.StringVar(value="— กรอกรหัสแล้วกด Enter —")
        tk.Label(sid_fr, textvariable=self.info_var, bg="#F9FAFB",
                 fg="#374151", font=("Helvetica", 10, "bold"),
                 wraplength=420, justify="left").grid(row=1, column=0, columnspan=3,
                                                       sticky="w", pady=(8, 0))

        # ── Photo section ──
        photo_fr = tk.LabelFrame(self, text="  📷 รูปใบหน้า  ",
                                  bg="#F9FAFB", fg="#374151", font=("Helvetica", 10, "bold"),
                                  padx=10, pady=8)
        photo_fr.grid(row=2, column=0, columnspan=2, sticky="ew", **pad)

        self._canvas: dict[str, tk.Label] = {}
        self._status_lbl: dict[str, tk.Label] = {}

        for col, (angle, label) in enumerate(ANGLES):
            col_fr = tk.Frame(photo_fr, bg="#F9FAFB")
            col_fr.grid(row=0, column=col, padx=12)

            tk.Label(col_fr, text=label, bg="#F9FAFB",
                     font=("Helvetica", 9, "bold"), fg="#374151").pack()

            canvas = tk.Label(col_fr, bg="#E5E7EB", width=120, height=120,
                              relief="solid", bd=1, text="ยังไม่มีรูป",
                              font=("Helvetica", 8), fg="#9CA3AF")
            canvas.pack(pady=4)
            self._canvas[angle] = canvas

            status = tk.Label(col_fr, text="—", bg="#F9FAFB",
                              font=("Helvetica", 8), fg="#6B7280")
            status.pack()
            self._status_lbl[angle] = status

            tk.Button(col_fr, text="เลือกรูป",
                      command=lambda a=angle: self._pick(a),
                      bg="#F3F4F6", fg="#374151", font=("Helvetica", 9),
                      relief="flat", padx=8, pady=3, cursor="hand2").pack(pady=(4, 0))
            tk.Button(col_fr, text="ล้าง",
                      command=lambda a=angle: self._clear(a),
                      bg="#F3F4F6", fg="#9CA3AF", font=("Helvetica", 8),
                      relief="flat", padx=6, pady=2, cursor="hand2").pack(pady=(2, 0))

        # ── Output folder ──
        out_fr = tk.Frame(self, bg="#F9FAFB")
        out_fr.grid(row=3, column=0, columnspan=2, sticky="ew", padx=14, pady=(0, 6))

        tk.Label(out_fr, text="บันทึกไปที่:", bg="#F9FAFB",
                 font=("Helvetica", 9)).pack(side="left")
        self.outdir_var = tk.StringVar(value="ยังไม่ได้เลือก")
        tk.Label(out_fr, textvariable=self.outdir_var, bg="#F9FAFB",
                 fg="#6B7280", font=("Helvetica", 9)).pack(side="left", padx=(6, 0))
        tk.Button(out_fr, text="เลือก folder", command=self._pick_outdir,
                  bg="#F3F4F6", fg="#374151", font=("Helvetica", 9),
                  relief="flat", padx=8, pady=2, cursor="hand2").pack(side="right")

        # ── Save button ──
        tk.Button(self, text="✅  บันทึก — ทำรายถัดไป", command=self._save,
                  bg="#16A34A", fg="white", font=("Helvetica", 11, "bold"),
                  relief="flat", padx=20, pady=10, cursor="hand2").grid(
                      row=4, column=0, columnspan=2, pady=(4, 14))

    # ── Logic ─────────────────────────────────────────────────────
    def _load_excel(self):
        path = filedialog.askopenfilename(
            title="เลือกไฟล์ Excel",
            filetypes=[("Excel", "*.xlsx *.xls"), ("All", "*.*")]
        )
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
                    "title":      str(row[1] or "").strip(),
                    "first_name": str(row[2] or "").strip(),
                    "last_name":  str(row[3] or "").strip(),
                    "grade":      str(row[4] or "").strip(),
                    "room":       str(row[5] or "").strip(),
                }
            self.excel_path_var.set(Path(path).name)
            self.student_count_var.set(f"✓ โหลดข้อมูล {len(self.students)} คนสำเร็จ")
        except Exception as e:
            messagebox.showerror("Error", f"อ่าน Excel ไม่ได้: {e}")

    def _lookup(self):
        sid = self.sid_var.get().strip()
        if not self.students:
            messagebox.showwarning("", "โหลดไฟล์ Excel ก่อน")
            return
        if sid not in self.students:
            self.info_var.set(f"❌ ไม่พบรหัส '{sid}' ใน Excel")
            return
        s = self.students[sid]
        name = f"{s['title']}{s['first_name']} {s['last_name']}"
        loc  = f"ชั้น ม.{s['grade']} ห้อง {s['room']}" if s['grade'] else ""
        self.info_var.set(f"✓  {name}  {loc}".strip())

    def _pick(self, angle: str):
        path = filedialog.askopenfilename(
            title=f"เลือกรูป{dict(ANGLES)[angle]}",
            filetypes=[("รูปภาพ", "*.jpg *.jpeg *.png"), ("All", "*.*")]
        )
        if not path:
            return
        self.photos[angle] = Path(path)
        self._update_thumb(angle)

    def _update_thumb(self, angle: str):
        path = self.photos[angle]
        if not path:
            return
        try:
            img = Image.open(path)
            img.thumbnail(THUMB_SIZE)
            photo = ImageTk.PhotoImage(img)
            self._thumbs[angle] = photo
            self._canvas[angle].configure(image=photo, text="")
            self._status_lbl[angle].configure(text=path.name, fg="#374151")
        except Exception:
            self._status_lbl[angle].configure(text="อ่านรูปไม่ได้", fg="#DC2626")

    def _clear(self, angle: str):
        self.photos[angle] = None
        self._thumbs.pop(angle, None)
        self._canvas[angle].configure(image="", text="ยังไม่มีรูป", fg="#9CA3AF")
        self._status_lbl[angle].configure(text="—", fg="#6B7280")

    def _pick_outdir(self):
        d = filedialog.askdirectory(title="เลือก folder สำหรับบันทึกรูป")
        if d:
            self.output_dir = Path(d)
            self.outdir_var.set(str(self.output_dir))

    def _save(self):
        sid = self.sid_var.get().strip()
        if not sid:
            messagebox.showwarning("", "กรอกรหัสนักเรียนก่อน")
            return
        if self.students and sid not in self.students:
            if not messagebox.askyesno("ไม่พบใน Excel", f"รหัส '{sid}' ไม่อยู่ใน Excel\nบันทึกต่อหรือไม่?"):
                return
        missing = [label for angle, label in ANGLES if not self.photos[angle]]
        if missing:
            messagebox.showwarning("", f"ยังไม่ได้เลือกรูป: {', '.join(missing)}")
            return
        if not self.output_dir:
            self._pick_outdir()
            if not self.output_dir:
                return

        saved = []
        for angle, _ in ANGLES:
            src  = self.photos[angle]
            dest = self.output_dir / f"{sid}_{angle}.jpg"
            try:
                img = Image.open(src).convert("RGB")
                img.save(dest, "JPEG", quality=92)
                saved.append(dest.name)
            except Exception as e:
                messagebox.showerror("Error", f"บันทึก {angle} ไม่สำเร็จ: {e}")
                return

        messagebox.showinfo("บันทึกสำเร็จ ✅",
                            f"บันทึกรูป {sid} ครบ 3 มุมแล้ว\n" + "\n".join(saved))
        self._reset()

    def _reset(self):
        self.sid_var.set("")
        self.info_var.set("— กรอกรหัสแล้วกด Enter —")
        for angle, _ in ANGLES:
            self._clear(angle)


if __name__ == "__main__":
    app = App()
    app.mainloop()
