// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import { getEmployees, getLeaveRequests, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

// Material-UI Icons
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BarChartIcon from '@mui/icons-material/BarChart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssessmentIcon from '@mui/icons-material/Assessment';

function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    complianceRate: 0,
    payrollRecords: 0,
    departments: 0,
    missingDocuments: 0,
    users: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const employees = await getEmployees();
      const leaveRequests = await getLeaveRequests();
      const attendanceSnapshot = await getDocs(collection(db, "attendance"));
      const documentsSnapshot = await getDocs(collection(db, "documents"));
      const usersSnapshot = await getDocs(collection(db, "users"));
      const payrollSnapshot = await getDocs(collection(db, "payroll"));

      const today = new Date().toISOString().split("T")[0];

      const presentToday = attendanceSnapshot.docs.filter(
        doc => doc.data().date === today
      ).length;

      const pendingLeaves = leaveRequests.filter(
        leave => leave.status === "Pending"
      ).length;

      const completeDocuments = documentsSnapshot.docs.filter(
        doc => doc.data().status === "Complete"
      ).length;

      const complianceRate = documentsSnapshot.size > 0
        ? Math.round((completeDocuments / documentsSnapshot.size) * 100)
        : 0;

      const departments = new Set(
        employees.map(emp => emp.department)
      ).size;

      const missingDocuments = documentsSnapshot.size - completeDocuments;

      setStats({
        totalEmployees: employees.length,
        presentToday,
        pendingLeaves,
        complianceRate,
        payrollRecords: payrollSnapshot.size,
        departments,
        missingDocuments,
        users: usersSnapshot.size
      });

    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading">Loading Dashboard...</div>;
  }

  // Stat card configuration
  const statCards = [
    { key: 'totalEmployees', icon: PeopleIcon, color: 'blue', label: 'Total Employees', value: stats.totalEmployees },
    { key: 'presentToday', icon: CheckCircleIcon, color: 'green', label: 'Present Today', value: stats.presentToday },
    { key: 'pendingLeaves', icon: HourglassEmptyIcon, color: 'orange', label: 'Pending Leaves', value: stats.pendingLeaves },
    { key: 'complianceRate', icon: BarChartIcon, color: 'purple', label: 'Compliance Rate', value: `${stats.complianceRate}%` },
    { key: 'payrollRecords', icon: AttachMoneyIcon, color: 'teal', label: 'Payroll Records', value: stats.payrollRecords },
    { key: 'departments', icon: BusinessIcon, color: 'pink', label: 'Departments', value: stats.departments },
    { key: 'missingDocuments', icon: DescriptionIcon, color: 'red', label: 'Missing Documents', value: stats.missingDocuments },
    { key: 'users', icon: PersonIcon, color: 'gray', label: 'System Users', value: stats.users }
  ];

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Welcome, HR Administrator</h1>
          <p className="subtitle">Human Resource Management Office</p>
          <p className="location">Municipality of Pagbilao, Quezon</p>
        </div>
        <div className="header-right">
          <span className="date-badge">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        {statCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div key={card.key} className={`stat-card ${card.color}`}>
              <div className="stat-icon">
                <IconComponent style={{ fontSize: 30 }} />
              </div>
              <div className="stat-info">
                <h3>{card.label}</h3>
                <p>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Notifications Grid */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="dashboard-box">
          <h2><AssessmentIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} /> Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn blue">
              <AddIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              Add Employee
            </button>
            <button className="action-btn green">
              <AccessTimeIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              Record Attendance
            </button>
            <button className="action-btn orange">
              <CalendarTodayIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              Process Leave
            </button>
            <button className="action-btn purple">
              <AttachMoneyIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              Payroll
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="dashboard-box">
          <h2><NotificationsIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} /> Notifications</h2>
          <ul className="notification-list">
            <li>
              <span className="badge orange"><HourglassEmptyIcon style={{ fontSize: 18 }} /></span>
              Pending Leave Requests: <strong>{stats.pendingLeaves}</strong>
            </li>
            <li>
              <span className="badge red"><DescriptionIcon style={{ fontSize: 18 }} /></span>
              Missing Documents: <strong>{stats.missingDocuments}</strong>
            </li>
            <li>
              <span className="badge green"><CheckCircleIcon style={{ fontSize: 18 }} /></span>
              Today's Attendance: <strong>{stats.presentToday}</strong>
            </li>
            <li>
              <span className="badge purple"><BarChartIcon style={{ fontSize: 18 }} /></span>
              Compliance Rate: <strong>{stats.complianceRate}%</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="dashboard-box full-width">
        <h2><AssessmentIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} /> Recent Activities</h2>
        <table className="activity-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><DescriptionIcon style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle' }} /> Employee Record Updated</td>
              <td>HR</td>
              <td><span className="status-badge success">Completed</span></td>
            </tr>
            <tr>
              <td><AttachMoneyIcon style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle' }} /> Payroll Generated</td>
              <td>Finance</td>
              <td><span className="status-badge success">Completed</span></td>
            </tr>
            <tr>
              <td><CalendarTodayIcon style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle' }} /> Leave Request Submitted</td>
              <td>Engineering</td>
              <td><span className="status-badge warning">Pending</span></td>
            </tr>
            <tr>
              <td><AccessTimeIcon style={{ fontSize: 14, marginRight: 6, verticalAlign: 'middle' }} /> Attendance Recorded</td>
              <td>All Departments</td>
              <td><span className="status-badge success">Completed</span></td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default Dashboard;