// src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

function PrivateRoute({ children, allowedRoles = [] }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if user has allowed role
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    switch(userRole) {
      case 'HR Admin':
        return <Navigate to="/dashboard" />;
      case 'MGDH':
        return <Navigate to="/mgdh-dashboard" />;
      case 'Employee':
      default:
        return <Navigate to="/employee-portal" />;
    }
  }

  return children;
}

export default PrivateRoute;