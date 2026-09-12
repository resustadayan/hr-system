// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import EmployeeRecords from './components/EmployeeRecords';
import Attendance from './components/Attendance';
import LeaveManagement from './components/LeaveManagement';
import ComplianceMonitoring from './components/ComplianceMonitoring';
import Payroll from './components/Payroll';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Interventions from './components/Interventions';
import UserManagement from './components/UserManagement';
import AuditLogs from './components/AuditLogs';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './components/contexts/AuthContext';

import PendingApprovals from './components/PendingApprovals';

import MGDHDashboard from './other file for dashboard/MGDHPDashboard';
import EmployeePortal from './other file for dashboard/EmployeePortal';

// Import styles
import './styles.css';
import '../src/other file for dashboard/portal.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Define routes that should NOT show the Navbar (sidebar)
  const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/register'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  
  // Check if current route is employee portal or mgdh dashboard (they have their own sidebar)
  const isPortalRoute = location.pathname === '/employee-portal' || location.pathname === '/mgdh-dashboard';

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Only render Navbar if NOT on public routes AND NOT on portal routes */}
      {!isPublicRoute && !isPortalRoute && <Navbar />}
      
      {/* 
        IMPORTANT: 
        - Public routes: full-width-content (no sidebar margin)
        - Portal routes: portal-content (no extra margin, portal handles its own layout)
        - All other routes: main-content (with sidebar margin)
      */}
      <div className={
        isPublicRoute ? 'full-width-content' : 
        isPortalRoute ? 'portal-content' : 
        'main-content'
      }>
        <Routes>
          {/* Public Routes - No Navbar */}
          <Route path="/login" element={<Login />} />
          <Route path="/pending-approvals" element={<PendingApprovals/>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes - All Authenticated Users */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/leave" element={<PrivateRoute><LeaveManagement /></PrivateRoute>} />
          
          {/* Protected Routes - HR Admin Only */}
          <Route path="/employees" element={<PrivateRoute><EmployeeRecords /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          
          {/* ✅ FIXED: Route for Compliance Monitoring - matches the navigation in EmployeePortal */}
          <Route path="/compliance" element={<PrivateRoute><ComplianceMonitoring /></PrivateRoute>} />
          <Route path="/compliance-monitoring" element={<PrivateRoute><ComplianceMonitoring /></PrivateRoute>} />
          
          <Route path="/payroll" element={<PrivateRoute><Payroll /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AnalyticsDashboard /></PrivateRoute>} />
          <Route path="/interventions" element={<PrivateRoute><Interventions /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />

          {/* Portal Routes - These have their own sidebar/navigation */}
          <Route path="/mgdh-dashboard" element={<PrivateRoute><MGDHDashboard /></PrivateRoute>} />
          <Route path="/employee-portal" element={<PrivateRoute><EmployeePortal /></PrivateRoute>} />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </>
  );
}

export default App;