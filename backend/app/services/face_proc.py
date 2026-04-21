# AI Logic: Detection, Embedding, Liveness, Quality
import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import Optional, Tuple


class FaceProcessor:
    """Singleton class สำหรับประมวลผลใบหน้า"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceProcessor, cls).__new__(cls)
            cls._instance.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
            cls._instance.app.prepare(ctx_id=0, det_size=(640, 640))
        return cls._instance

    def process_capture(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """Detection → Quality → Liveness → Embedding"""
        faces = self.app.get(frame)
        if not faces:
            return None

        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        ok, reason = self._check_quality(face, frame)
        if not ok:
            raise ValueError(reason)

        return face.normed_embedding

    def _check_quality(self, face, frame: np.ndarray) -> Tuple[bool, str]:
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = face.bbox.astype(int)

        # 1. Detection confidence
        if face.det_score < 0.65:
            return False, "ตรวจจับใบหน้าไม่ชัดเจน — กรุณาจัดแสงให้สว่างขึ้นและมองตรงเข้าหากล้อง"

        # 2. Face size (must cover at least 8% of image area)
        face_area  = (x2 - x1) * (y2 - y1)
        image_area = h * w
        if face_area < image_area * 0.08:
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
            if blur_score < 40:
                return False, "ภาพใบหน้าเบลอเกินไป — กรุณาถือกล้องให้นิ่งและให้แสงสว่างเพียงพอ"

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
