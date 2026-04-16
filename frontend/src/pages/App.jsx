import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Enrollment from './pages/Enrollment';

function App() {
  return (
    <BrowserRouter>
      <div className="font-sans antialiased">
        <Navbar />
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<Scanner />} />
            <Route path="/enroll" element={<Enrollment />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
export default App;