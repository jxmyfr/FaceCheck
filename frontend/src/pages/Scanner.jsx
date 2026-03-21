import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const Scanner = () => {
  const webcamRef = useRef(null);
  const = useState({ message: 'Ready to Scan', type: 'neutral' });

  const captureAndScan = async () => {
    // 1. ดึงภาพจากหน้าเว็บแคม
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setStatus({ message: 'Processing...', type: 'loading' });

    try {
      // 2. แปลงภาพ Base64 เป็น Blob เพื่อส่งเข้า API 
      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      // 3. ส่งไปที่ Backend (ต้องใส่ subject_id ที่เลือกไว้)
      const response = await axios.post('http://localhost:8000/api/v1/attendance/scan?subject_id=1', formData);
      
      if (response.data.status === 'success') {
        setStatus({ message: `Check-in Success: ${response.data.name}`, type: 'success' });
      }
    } catch (error) {
      setStatus({ 
        message: error.response?.data?.detail |

| 'Recognition Failed', 
        type: 'error' 
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">FaceCheck Scanner</h1>
      
      {/* ส่วนแสดงผลกล้อง พร้อมกรอบสำหรับวางใบหน้า  */}
      <div className="relative rounded-2xl overflow-hidden border-4 border-white shadow-2xl mb-8">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full max-w-md aspect-square object-cover"
        />
        <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none rounded-full scale-90 border-dashed animate-pulse" />
      </div>

      {/* ปุ่มกดสแกน (Manual Capture) [1, 3] */}
      <button 
        onClick={captureAndScan}
        className="px-8 py-4 bg-primary text-white rounded-full font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
      >
        Capture & Check-in
      </button>

      {/* แจ้งเตือนสถานะ (Feedback)  */}
      <p className={`mt-6 font-medium ${
        status.type === 'success'? 'text-green-600' : 
        status.type === 'error'? 'text-red-600' : 'text-gray-600'
      }`}>
        {status.message}
      </p>
    </div>
  );
};

export default Scanner;