import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const Scanner = () => {
  const webcamRef = useRef(null);
  // แก้ไขจุดที่ 1: เพิ่ม เพื่อรับค่าจาก Hook
  const [status, setStatus] = useState({ message: 'Ready to Scan', type: 'neutral' });

  const captureAndScan = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setStatus({ message: 'Processing...', type: 'loading' });

    try {
      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      // ส่งคำขอไปยัง Backend
      const response = await axios.post('http://localhost:8000/api/v1/attendance/scan?subject_id=1', formData);
      
      if (response.data.status === 'success') {
        setStatus({ message: `Check-in Success: ${response.data.name}`, type: 'success' });
      }
    } catch (error) {
      // แก้ไขจุดที่ 2: เปลี่ยน | เป็น |


      setStatus({ 
        message: error.response?.data?.detail |

 'Recognition Failed', 
        type: 'error' 
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">FaceCheck Scanner</h1>
      
      <div className="relative rounded-2xl overflow-hidden border-4 border-white shadow-2xl mb-8">
        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full max-w-md aspect-square object-cover" />
        <div className="absolute inset-0 border-40px border-black/20 pointer-events-none rounded-full scale-90 border-dashed animate-pulse" />
      </div>

      <button onClick={captureAndScan} className="px-8 py-4 bg-blue-600 text-white rounded-full font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-300">
        Capture & Check-in
      </button>

      <p className={`mt-6 font-medium ${status.type === 'success'? 'text-green-600' : status.type === 'error'? 'text-red-600' : 'text-gray-600'}`}>
        {status.message}
      </p>
    </div>
  );
};

export default Scanner;