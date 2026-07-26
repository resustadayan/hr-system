import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../firebase';
import logo from '../assets/hrmo logo.jpg';

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
    <div className="sidebar">

      <div className="sidebar-top">
        <img src={logo} alt="LGU Logo" className="sidebar-logo" />
        <h3>HR System</h3>
        <p>Pagbilao LGU</p>
      </div>

      <div className="sidebar-menu">
        <Link to="/dashboard" className="sidebar-link">Dashboard</Link>
        <Link to="/employees" className="sidebar-link">Employees</Link>
        <Link to="/attendance" className="sidebar-link">Attendance</Link>
        <Link to="/leave" className="sidebar-link">Leave Request</Link>
        <Link to="/compliance" className="sidebar-link">Compliance</Link>
        <Link to="/payroll" className="sidebar-link">Payroll</Link>
        <Link to="/analytics" className="sidebar-link">Analytics</Link>

        <Link to="/users" className="sidebar-link">Users</Link>

        


        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

    </div>
  );
}

export default Navbar;