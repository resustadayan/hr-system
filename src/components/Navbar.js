// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../firebase';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('isAuthenticated');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/dashboard">
          <span className="brand-icon">🏛️</span>
          HR System - Pagbilao LGU
        </Link>
      </div>
      
      <div className="nav-menu">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/employees" className="nav-link">Employees</Link>
        <Link to="/attendance" className="nav-link">Attendance</Link>
        <Link to="/leave" className="nav-link">Leave</Link>
        <Link to="/compliance" className="nav-link">Compliance</Link>
        <Link to="/payroll" className="nav-link">Payroll</Link>
        <Link to="/analytics" className="nav-link">Analytics</Link>
        <Link to="/interventions" className="nav-link">Interventions</Link>
        <Link to="/users" className="nav-link">Users</Link>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;