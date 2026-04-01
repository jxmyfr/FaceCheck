import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Scanner', path: '/scanner' },
    { name: 'Enrollment', path: '/enrollment' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg rotate-12 flex items-center justify-center text-white font-bold shadow-blue-200 shadow-lg">FC</div>
          <span className="text-xl font-black bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-indigo-600">FaceCheck</span>
        </div>

        <div className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                location.pathname === item.path 
                 ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;