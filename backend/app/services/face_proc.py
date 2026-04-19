# AI Logic: Detection, Embedding, Liveness
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
        """Detection → Liveness → Embedding"""
        faces = self.app.get(frame)

        if not faces:
            return None

        # bbox = [x1, y1, x2, y2] — มีแค่ 4 ค่า
        # คำนวณพื้นที่ใบหน้า: width * height เพื่อเลือกใบหน้าที่ใหญ่ที่สุด
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        if not self._is_live_face(face):
            return None

        return face.normed_embedding

    def _is_live_face(self, face) -> bool:
        """Passive liveness check เบื้องต้น"""
        # det_score < 0.6 = ภาพคุณภาพต่ำหรือภาพหลอก
        if face.det_score < 0.6:
            return False
        return True

    @staticmethod
    def compare_faces(
        source_embedding: np.ndarray,
        target_embedding: np.ndarray,
        threshold: float = 0.5,
    ) -> Tuple[bool, float]:
        """เปรียบเทียบ embedding ด้วย Euclidean Distance"""
        dist = np.linalg.norm(source_embedding - target_embedding)
        return dist <= threshold, float(dist)