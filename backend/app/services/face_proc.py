# AI Logic: Detection, Embedding, Liveness, Quality
import logging
import cv2
import numpy as np
import onnxruntime as ort
from insightface.app import FaceAnalysis
from typing import Optional, Tuple

logger = logging.getLogger("facecheck.face_proc")

_AVAILABLE = ort.get_available_providers()
_PROVIDERS = [p for p in ['TensorrtExecutionProvider', 'CUDAExecutionProvider', 'CPUExecutionProvider'] if p in _AVAILABLE]
logger.info(f"FaceProcessor using providers: {_PROVIDERS}")


class FaceProcessor:
    """Singleton class สำหรับประมวลผลใบหน้า"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceProcessor, cls).__new__(cls)
            cls._instance.app = FaceAnalysis(name='buffalo_l', providers=_PROVIDERS)
            cls._instance.app.prepare(ctx_id=0, det_size=(320, 320))
        return cls._instance

    def process_capture(
        self,
        frame: np.ndarray,
        min_det_score: float = 0.65,
        min_face_ratio: float = 0.08,
        min_blur_score: float = 40.0,
        skip_checks: bool = False,
    ) -> Optional[np.ndarray]:
        """Detection → Quality → Liveness → Embedding (single largest face)"""
        faces = self.app.get(frame)
        if not faces:
            return None

        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        if not skip_checks:
            ok, reason = self._check_quality(face, frame, min_det_score, min_face_ratio, min_blur_score)
            if not ok:
                raise ValueError(reason)

            ok, reason = self._check_liveness(face, frame)
            if not ok:
                raise ValueError(reason)

        return face.normed_embedding

    def process_capture_multi(
        self,
        frame: np.ndarray,
        min_det_score: float = 0.65,
        min_face_ratio: float = 0.08,
        min_blur_score: float = 40.0,
        skip_checks: bool = False,
    ) -> list:
        """Detect all faces, run NMS + quality + liveness on each, return list of valid embeddings."""
        faces = self.app.get(frame)
        if not faces:
            return []
        faces = self._nms_faces(faces)
        # Hybrid: scale face-size requirement down proportionally for group scans.
        # Single face → full strictness; N faces → ratio/N, floor at 0.02.
        effective_ratio = max(0.02, min_face_ratio / max(1, len(faces)))
        valid = []
        for face in faces:
            if not skip_checks:
                ok, _ = self._check_quality(face, frame, min_det_score, effective_ratio, min_blur_score)
                if not ok:
                    continue
                ok, _ = self._check_liveness(face, frame)
                if not ok:
                    continue
            valid.append(face.normed_embedding)
        return valid

    @staticmethod
    def _nms_faces(faces: list, iou_threshold: float = 0.3) -> list:
        """Remove duplicate/overlapping face detections, keep highest det_score per group."""
        if len(faces) <= 1:
            return faces
        faces = sorted(faces, key=lambda f: f.det_score, reverse=True)
        kept = []
        for face in faces:
            b1 = face.bbox
            overlap = False
            for k in kept:
                b2 = k.bbox
                ix1, iy1 = max(b1[0], b2[0]), max(b1[1], b2[1])
                ix2, iy2 = min(b1[2], b2[2]), min(b1[3], b2[3])
                inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
                a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
                iou = inter / (a1 + a2 - inter + 1e-6)
                if iou > iou_threshold:
                    overlap = True
                    break
            if not overlap:
                kept.append(face)
        return kept

    def _check_quality(
        self,
        face,
        frame: np.ndarray,
        min_det_score: float = 0.65,
        min_face_ratio: float = 0.08,
        min_blur_score: float = 40.0,
    ) -> Tuple[bool, str]:
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = face.bbox.astype(int)

        # 1. Detection confidence
        if face.det_score < min_det_score:
            return False, "ตรวจจับใบหน้าไม่ชัดเจน — กรุณาจัดแสงให้สว่างขึ้นและมองตรงเข้าหากล้อง"

        # 2. Face size (must cover at least min_face_ratio of image area)
        face_area  = (x2 - x1) * (y2 - y1)
        image_area = h * w
        if face_area < image_area * min_face_ratio:
            return False, "ใบหน้าอยู่ไกลจากกล้องเกินไป — กรุณาเข้าใกล้กล้องให้มากขึ้น"

        # 3. Face must not be cropped at edges (margin >= 3% each side)
        margin_x = w * 0.03
        margin_y = h * 0.03
        if x1 < margin_x or y1 < margin_y or x2 > w - margin_x or y2 > h - margin_y:
            return False, "ใบหน้าอยู่ชิดขอบภาพ — กรุณาจัดให้ใบหน้าอยู่กลางภาพ"

        # 4. Keypoints: check both eyes are visible and symmetric
        if face.kps is not None and len(face.kps) >= 2:
            left_eye  = face.kps[0]   # (x, y)
            right_eye = face.kps[1]
            nose      = face.kps[2] if len(face.kps) > 2 else None

            # Eyes must be inside image bounds
            for eye, name in [(left_eye, "ตาซ้าย"), (right_eye, "ตาขวา")]:
                if not (0 <= eye[0] <= w and 0 <= eye[1] <= h):
                    return False, f"ไม่เห็น{name} — กรุณาหันหน้าตรงและอย่าก้มหรือเงยมากเกินไป"

            # Eye vertical symmetry: abs(y_diff) must be < 20% of inter-eye distance
            eye_dist = abs(right_eye[0] - left_eye[0])
            eye_y_diff = abs(right_eye[1] - left_eye[1])
            if eye_dist > 0 and eye_y_diff / eye_dist > 0.25:
                return False, "ใบหน้าเอียงมากเกินไป — กรุณาตั้งหน้าตรง"

            # Yaw check via nose position relative to midpoint between eyes
            if nose is not None and eye_dist > 0:
                eye_mid_x = (left_eye[0] + right_eye[0]) / 2
                yaw_ratio = abs(nose[0] - eye_mid_x) / eye_dist
                if yaw_ratio > 0.35:
                    return False, "หันหน้าเยื้องไปด้านข้างมากเกินไป — กรุณามองตรงเข้าหากล้อง"

        # 5. Blur detection on face crop (Laplacian variance)
        pad = 10
        crop = frame[
            max(0, y1 - pad): min(h, y2 + pad),
            max(0, x1 - pad): min(w, x2 + pad),
        ]
        if crop.size > 0:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            if blur_score < min_blur_score:
                return False, "ภาพใบหน้าเบลอเกินไป — กรุณาถือกล้องให้นิ่งและให้แสงสว่างเพียงพอ"

        return True, ""

    def _check_liveness(self, face, frame: np.ndarray) -> Tuple[bool, str]:
        """Anti-spoofing: detect screen/printed-photo attacks via texture and spectral analysis.

        Uses conservative thresholds — primary protection is the face-match threshold (0.65).
        Only blocks the most unambiguous spoofing cases to avoid false positives on real faces.
        """
        x1, y1, x2, y2 = face.bbox.astype(int)
        fh, fw = frame.shape[:2]
        pad = 10
        crop = frame[max(0, y1 - pad):min(fh, y2 + pad), max(0, x1 - pad):min(fw, x2 + pad)]
        if crop.shape[0] < 32 or crop.shape[1] < 32:
            return True, ""

        gray = cv2.resize(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), (96, 96)).astype(np.int32)

        # Signal 1: LBP variance — real skin has complex micro-texture
        c = gray[1:-1, 1:-1]
        neighbors = [
            gray[0:-2, 0:-2], gray[0:-2, 1:-1], gray[0:-2, 2:],
            gray[1:-1, 2:],
            gray[2:,   2:],   gray[2:,   1:-1], gray[2:,   0:-2],
            gray[1:-1, 0:-2],
        ]
        codes = sum((nb >= c).astype(np.uint8) << i for i, nb in enumerate(neighbors))
        lbp_var = float(np.var(codes))

        # Signal 2: FFT spectral peaks — screen pixel grid creates periodic frequencies
        fft_mag = np.abs(np.fft.fftshift(np.fft.fft2(gray.astype(np.float32))))
        cy, cx = 48, 48
        Y, X = np.ogrid[:96, :96]
        d2 = (Y - cy) ** 2 + (X - cx) ** 2
        ring = fft_mag[(d2 > 64) & (d2 < 2025)]
        peak_ratio = float(np.percentile(ring, 99.5) / (np.median(ring) + 1.0)) if ring.size else 0.0

        # Reject when BOTH signals are suspicious simultaneously.
        # LBP var < 120: real faces in normal conditions score 300–4000+;
        #   printed photos often score 40–200, blank screen: <30
        # FFT peak_ratio > 15: screen pixel grids produce strong periodic peaks;
        #   natural skin has diffuse spectra (ratio typically 3–10)
        if lbp_var < 120 and peak_ratio > 15:
            return False, "ตรวจพบว่าใบหน้าอาจเป็นภาพถ่ายหรือหน้าจอ — กรุณาใช้ใบหน้าจริงต่อหน้ากล้อง"

        return True, ""

    @staticmethod
    def compare_faces(
        source_embedding: np.ndarray,
        target_embedding: np.ndarray,
        threshold: float = 0.5,
    ) -> Tuple[bool, float]:
        """เปรียบเทียบ embedding ด้วย Euclidean Distance"""
        dist = np.linalg.norm(source_embedding - target_embedding)
        return dist <= threshold, float(dist)
