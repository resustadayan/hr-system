// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BarChartIcon from '@mui/icons-material/BarChart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';   // 👈 NEW
import LogoutIcon from '@mui/icons-material/Logout';
import logo from '../assets/hrmo logo.jpg';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [pendingCount, setPendingCount] = useState(0);   // 👈 NEW

  // ---- Responsive resize ----
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

  // ---- Live count of pending approvals ----
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('status', '==', 'Pending Approval')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setPendingCount(snapshot.size),
      (error) => {
        console.error('Pending approvals listener error:', error);
        setPendingCount(0);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { path: '/attendance', label: 'Attendance', icon: AccessTimeIcon },
    { path: '/leave', label: 'Leave Requests', icon: EventNoteIcon },
    { path: '/compliance', label: 'Compliance', icon: AssignmentTurnedInIcon },
    { path: '/analytics', label: 'Analytics', icon: BarChartIcon },
    // { path: '/payroll', label: 'Payroll', icon: AttachMoneyIcon },
    
    // NEW: Pending Approvals with live badge
    {
      path: '/pending-approvals',
      label: 'Pending Approvals',
      icon: HourglassEmptyIcon,
      badge: pendingCount,
    },
    { path: '/users', label: 'Users', icon: PeopleIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          <img src={logo} alt="LGU Logo" className="sidebar-logo" />
          <h3>HRMO Admin</h3>
          <p>Pagbilao LGU System</p>
        </div>

        <div className="sidebar-menu">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  position: 'relative',
                }}
              >
                <Icon style={{ fontSize: 20 }} />
                <span>{item.label}</span>

                {/* Live badge for pending approvals */}
                {item.badge > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#e74c3c',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      minWidth: '20px',
                      textAlign: 'center',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="logout-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <LogoutIcon style={{ fontSize: 20 }} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Navbar */}
      {isMobile && (
        <div className="mobile-navbar">
          <div className="mobile-navbar-left">
            <img src={logo} alt="LGU Logo" className="mobile-logo" />
            <span className="mobile-title">HR System</span>
            {/* Mobile badge on the hamburger button */}
            {pendingCount > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  background: '#e74c3c',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {pendingCount}
              </span>
            )}
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
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={isActive ? 'active' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Icon style={{ fontSize: 20 }} />
                <span>{item.label}</span>

                {/* Badge on mobile menu */}
                {item.badge > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#e74c3c',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
            className="mobile-logout-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <LogoutIcon style={{ fontSize: 20 }} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </>
  );
}

export default Navbar;