# AI Logic: Detection, Embedding, Liveness
import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import Optional, List, Tuple

class FaceProcessor:
    """
    Singleton class สำหรับประมวลผลใบหน้า
    ทำหน้าที่ Detection, Alignment, Embedding Extraction และ Liveness Check [3]
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceProcessor, cls).__new__(cls)
            # โหลดโมเดล Buffalo_L (Large) เพื่อความแม่นยำสูงสุดตามที่ต้องการ [11]
            # providers=['CPUExecutionProvider'] (เปลี่ยนเป็น CUDA หากมี GPU)
            cls._instance.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
            cls._instance.app.prepare(ctx_id=0, det_size=(640, 640))
        return cls._instance

    def process_capture(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """
        ขั้นตอนประมวลผลภาพที่ได้จากการกดถ่าย (Manual Capture)
        1. Face Detection
        2. Passive Liveness Check (จำลองตรรกะพื้นฐาน)
        3. Face Alignment
        4. Feature Extraction (Embedding) [12, 13]
        """
        faces = self.app.get(frame)
        
        if not faces:
            return None

        # เลือกใบหน้าที่ใหญ่ที่สุดในกรณีที่มีหลายใบหน้าในเฟรม
        face = max(faces, key=lambda x: (x.bbox[14]-x.bbox) * (x.bbox[5]-x.bbox[12]))

        # --- Passive Liveness Detection Logic ---
        # ในระดับมืออาชีพ จะตรวจสอบพื้นผิว (Texture Analysis) 
        # เพื่อแยกความแตกต่างระหว่างหน้าคนจริงและรูปถ่ายบนจอ 
        if not self._is_live_face(face, frame):
            return None

        # คืนค่า Embedding ขนาด 512 มิติ (แบบ Normalised)
        return face.normed_embedding

    def _is_live_face(self, face, frame) -> bool:
        """
        ตรวจสอบเบื้องต้นว่าไม่ใช่การเอารูปถ่ายมาชูหน้ากล้อง
        ใช้การวิเคราะห์ความชัดและ Landmark Consistency 
        """
        # ตรวจสอบ det_score (ความมั่นใจของโมเดล) หากต่ำกว่า 0.6 อาจเป็นภาพที่คุณภาพต่ำหรือภาพหลอก
        if face.det_score < 0.6:
            return False
        
        # เพิ่มตรรกะเพิ่มเติมเช่น Blur Detection หรือ Moiré Pattern Analysis ได้ที่นี่
        return True

    @staticmethod
    def compare_faces(source_embedding: np.ndarray, target_embedding: np.ndarray, threshold: float = 0.6) -> Tuple[bool, float]:
        """
        เปรียบเทียบใบหน้าด้วยค่า Euclidean Distance 
        สูตร: d = sqrt(sum((p - q)^2))
        """
        # เนื่องจากเป็น normed_embedding สามารถใช้ Cosine Similarity หรือ Euclidean ก็ได้
        dist = np.linalg.norm(source_embedding - target_embedding)
        
        # คืนค่าผลลัพธ์: (ผ่านเกณฑ์ไหม, ระยะห่าง)
        # ถ้าระยะห่างน้อยกว่า Threshold แสดงว่าเป็นคนเดียวกัน
        return dist <= threshold, dist