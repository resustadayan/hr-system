// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../firebase';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import logo from '../assets/hrmo logo.jpg';

function Navbar() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          <img src={logo} alt="LGU Logo" className="sidebar-logo" />
          <h3>HR System</h3>
          <p>Pagbilao LGU</p>
        </div>

        <div className="sidebar-menu">
          <Link to="/dashboard" className="sidebar-link">Dashboard</Link>
          <Link to="/attendance" className="sidebar-link">Attendance</Link>
          <Link to="/leave" className="sidebar-link">Leave Request</Link>
          <Link to="/compliance" className="sidebar-link">Compliance</Link>
          <Link to="/payroll" className="sidebar-link">Payroll</Link>
          {/* <Link to="/interventions" className="sidebar-link">Interventions</Link> */}
          <Link to="/analytics" className="sidebar-link">Analytics</Link>
          <Link to="/users" className="sidebar-link">Users</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {/* Mobile Navbar - Only visible on mobile */}
      {isMobile && (
        <div className="mobile-navbar">
          <div className="mobile-navbar-left">
            <img src={logo} alt="LGU Logo" className="mobile-logo" />
            <span className="mobile-title">HR System</span>
          </div>
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      )}

      {/* Mobile Menu Dropdown */}
      {isMobile && isMobileMenuOpen && (
        <div className="mobile-menu-dropdown">
          <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
            <span></span> Dashboard
          </Link>
          <Link to="/attendance" onClick={() => setIsMobileMenuOpen(false)}>
            <span></span> Attendance
          </Link>
          <Link to="/leave" onClick={() => setIsMobileMenuOpen(false)}>
            <span></span> Leave Request
          </Link>
          <Link to="/compliance" onClick={() => setIsMobileMenuOpen(false)}>
            <span></span> Compliance
          </Link>
          <Link to="/payroll" onClick={() => setIsMobileMenuOpen(false)}>
            <span></span> Payroll
          </Link>
          {/* <Link to="/interventions" onClick={() => setIsMobileMenuOpen(false)}>
          <span></span>
          </Link> */}
          <Link to="/analytics" onClick={() => setIsMobileMenuOpen(false)}>
            <span></span> Analytics
          </Link>
          <Link to="/users" onClick={() => setIsMobileMenuOpen(false)}>
            <span></span> Users
          </Link>
          <button onClick={() => {
            setIsMobileMenuOpen(false);
            handleLogout();
          }} className="mobile-logout-btn">
            <span></span> Logout
          </button>
        </div>
      )}
    </>
  );
}

export default Navbar;