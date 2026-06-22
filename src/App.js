import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
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

// Import styles
import './styles.css';

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
  return (
    <>
      <Navbar />
      <div className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes - All Authenticated Users */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/leave" element={<PrivateRoute><LeaveManagement /></PrivateRoute>} />
          
          {/* Protected Routes - HR Admin Only */}
          <Route path="/employees" element={<PrivateRoute><EmployeeRecords /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/compliance" element={<PrivateRoute><ComplianceMonitoring /></PrivateRoute>} />
          <Route path="/payroll" element={<PrivateRoute><Payroll /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AnalyticsDashboard /></PrivateRoute>} />
          <Route path="/interventions" element={<PrivateRoute><Interventions /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </>
  );
}

export default App;