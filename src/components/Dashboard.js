// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { getEmployees, getLeaveRequests, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    complianceRate: 0,
    presentToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get employees
      const employees = await getEmployees();
      
      // Get leave requests
      const leaveRequests = await getLeaveRequests();
      const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending').length;
      
      // Get compliance data (documents)
      const docsSnapshot = await getDocs(collection(db, 'documents'));
      const totalDocs = docsSnapshot.size;
      const completeDocs = docsSnapshot.docs.filter(d => d.data().status === 'Complete').length;
      const complianceRate = totalDocs > 0 ? (completeDocs / totalDocs) * 100 : 0;
      
      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
      const presentToday = attendanceSnapshot.docs.filter(d => d.data().date === today).length;
      
      setStats({
        totalEmployees: employees.length,
        pendingLeaves: pendingLeaves,
        complianceRate: Math.round(complianceRate),
        presentToday: presentToday
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>HR Dashboard</h1>
      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Employees</h3>
          <p>{stats.totalEmployees}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Leave Requests</h3>
          <p>{stats.pendingLeaves}</p>
        </div>
        <div className="stat-card">
          <h3>Compliance Rate</h3>
          <p>{stats.complianceRate}%</p>
        </div>
        <div className="stat-card">
          <h3>Present Today</h3>
          <p>{stats.presentToday}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;