import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const Enrollment = () => {
  const webcamRef = useRef(null);
  const [file, setFile] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState({ msg: '', type: '' });

  // ฟังก์ชันนำเข้าไฟล์ Excel 
  const handleImportExcel = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:8000/api/v1/enroll/import-students', formData);
      setStatus({ msg: res.data.message, type: 'success' });
    } catch (err) {
      setStatus({ msg: 'Import failed', type: 'error' });
    }
  };

  // ฟังก์ชันลงทะเบียนใบหน้า (ถ่ายรูป/อัปโหลดรูป) 
  const handleRegisterFace = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc ||!studentId) return;

    const blob = await fetch(imageSrc).then(res => res.blob());
    const formData = new FormData();
    formData.append('file', blob, `${studentId}.jpg`);

    try {
      setStatus({ msg: 'Processing face...', type: 'loading' });
      const res = await axios.post(`http://localhost:8000/api/v1/enroll/register-face/${studentId}`, formData);
      setStatus({ msg: res.data.message, type: 'success' });
    } catch (err) {
      setStatus({ msg: err.response?.data?.detail |

 'Registration failed', type: 'error' });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 bg-white shadow-sm rounded-xl border border-gray-100 mt-10">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Student Enrollment</h1>
        <p className="text-gray-500">Import student lists and register biometrics data.</p>
      </header>

      {/* ส่วนที่ 1: นำเข้า Excel (Bulk Import)  */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">1. Bulk Import (Excel/CSV)</h2>
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          <button onClick={handleImportExcel} className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            Upload List
          </button>
        </div>
      </section>

      {/* ส่วนที่ 2: ลงทะเบียนใบหน้ารายบุคคล  */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">2. Face Biometric Registration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Student ID</label>
              <input 
                type="text" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Ex. 6501001"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
              <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
            </div>
            <button onClick={handleRegisterFace} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">
              Capture & Save Face
            </button>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-2xl flex flex-col justify-center">
            <h3 className="font-bold text-blue-800 mb-2 underline">Guidelines for Best Accuracy </h3>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-2">
              <li>Look directly at the camera.</li>
              <li>Ensure good, even lighting (no harsh shadows).</li>
              <li>Neutral expression is recommended.</li>
              <li>Remove glasses or masks during capture.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feedback status  */}
      {status.msg && (
        <div className={`p-4 rounded-lg text-center font-medium ${status.type === 'success'? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.msg}
        </div>
      )}
    </div>
  );
};

export default Enrollment;