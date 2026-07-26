// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
  const [recentActivities, setRecentActivities] = useState([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // ✅ Get user name from localStorage
    const name = localStorage.getItem('userName') || 'HR Administrator';
    const role = localStorage.getItem('userRole') || 'Admin';
    setUserName(name);
    
    // ✅ Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchDashboard();
  }, [navigate]);

  const fetchDashboard = async () => {
    try {
      // Fetch all data
      const employees = await getEmployees();
      const leaveRequests = await getLeaveRequests();
      const attendanceSnapshot = await getDocs(collection(db, "attendance"));
      const documentsSnapshot = await getDocs(collection(db, "documents"));
      const usersSnapshot = await getDocs(collection(db, "users"));
      const payrollSnapshot = await getDocs(collection(db, "payroll"));

      const today = new Date().toISOString().split("T")[0];

      // Calculate stats with proper null/undefined handling
      const presentToday = attendanceSnapshot.docs.filter(
        doc => doc.data().date === today
      ).length;

      const pendingLeaves = leaveRequests.filter(
        leave => leave.status === "Pending"
      ).length;

      // ✅ Filter valid employees (with names)
      const validEmployees = (employees || []).filter(emp => 
        emp.fullName && emp.fullName.trim() !== '' && emp.fullName !== 'undefined'
      );

      const completeDocuments = documentsSnapshot.docs.filter(
        doc => doc.data().status === "Complete"
      ).length;

      const complianceRate = documentsSnapshot.size > 0
        ? Math.round((completeDocuments / documentsSnapshot.size) * 100)
        : 0;

      // Get unique departments from valid employees
      const departments = new Set(
        validEmployees.map(emp => emp.department).filter(Boolean)
      ).size;

      const missingDocuments = documentsSnapshot.size - completeDocuments;

      // Set stats - all values default to 0
      setStats({
        totalEmployees: validEmployees.length || 0,
        presentToday: presentToday || 0,
        pendingLeaves: pendingLeaves || 0,
        complianceRate: complianceRate || 0,
        payrollRecords: payrollSnapshot.size || 0,
        departments: departments || 0,
        missingDocuments: missingDocuments || 0,
        users: usersSnapshot.size || 0
      });

      // Generate recent activities - ONLY if data exists
      const activities = [];
      
      // Check if there are employees before adding activity
      if (validEmployees.length > 0) {
        const sortedEmployees = [...validEmployees].sort((a, b) => {
          const dateA = a.createdAt || a.dateAdded || '';
          const dateB = b.createdAt || b.dateAdded || '';
          return dateB.localeCompare(dateA);
        });
        
        if (sortedEmployees.length > 0) {
          const latest = sortedEmployees[0];
          // Only add if the employee has a name
          if (latest.fullName && latest.fullName.trim() !== '') {
            activities.push({
              id: 'emp_add',
              icon: '👤',
              text: `New employee added: ${latest.fullName} (${latest.department || 'N/A'})`,
              dept: latest.department || 'HR',
              status: 'Completed',
              time: new Date().toLocaleDateString()
            });
          }
        }
      }

      // Check if there are leave requests before adding activity
      if (leaveRequests.length > 0) {
        const sortedLeaves = [...leaveRequests].sort((a, b) => {
          const dateA = a.dateSubmitted || '';
          const dateB = b.dateSubmitted || '';
          return dateB.localeCompare(dateA);
        });

        if (sortedLeaves.length > 0) {
          const latest = sortedLeaves[0];
          const emp = validEmployees.find(e => e.id === latest.employeeId);
          // Only add if employee exists
          if (emp) {
            activities.push({
              id: 'leave_req',
              icon: '📅',
              text: `Leave request submitted: ${emp.fullName || 'Employee'} (${latest.type || 'N/A'})`,
              dept: emp.department || 'HR',
              status: latest.status === 'Pending' ? 'Pending' : 'Completed',
              time: new Date().toLocaleDateString()
            });
          }
        }
      }

      // Check if there are payroll records before adding activity
      if (payrollSnapshot.size > 0) {
        activities.push({
          id: 'payroll',
          icon: '💰',
          text: `Payroll generated for ${payrollSnapshot.size} employees`,
          dept: 'Finance',
          status: 'Completed',
          time: new Date().toLocaleDateString()
        });
      }

      // Check if there are missing documents before adding activity
      if (missingDocuments > 0) {
        activities.push({
          id: 'compliance',
          icon: '📄',
          text: `${missingDocuments} employees have missing documents`,
          dept: 'HR',
          status: 'Pending',
          time: new Date().toLocaleDateString()
        });
      }

      // If no activities, add a default message
      if (activities.length === 0) {
        activities.push({
          id: 'no_activity',
          icon: '📋',
          text: 'No recent activities. Start by adding your first employee!',
          dept: 'System',
          status: 'Info',
          time: new Date().toLocaleDateString()
        });
      }

      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default empty state on error
      setStats({
        totalEmployees: 0,
        presentToday: 0,
        pendingLeaves: 0,
        complianceRate: 0,
        payrollRecords: 0,
        departments: 0,
        missingDocuments: 0,
        users: 0
      });
      setRecentActivities([{
        id: 'error',
        icon: '⚠️',
        text: 'Unable to load activities. Please check your connection.',
        dept: 'System',
        status: 'Error',
        time: new Date().toLocaleDateString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading Dashboard...</div>;
  }

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

  const handleAddEmployee = () => navigate('/employees');
  const handleRecordAttendance = () => navigate('/attendance');
  const handleProcessLeave = () => navigate('/leave');
  const handlePayroll = () => navigate('/payroll');

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Welcome, Admin</h1>
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

      {/* Quick Actions & Notifications */}
      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="dashboard-box">
          <h2><AssessmentIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} /> Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn blue" onClick={handleAddEmployee}>
              <AddIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              Add Employee
            </button>
            <button className="action-btn green" onClick={handleRecordAttendance}>
              <AccessTimeIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              Record Attendance
            </button>
            <button className="action-btn orange" onClick={handleProcessLeave}>
              <CalendarTodayIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              Process Leave
            </button>
            <button className="action-btn purple" onClick={handlePayroll}>
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
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentActivities.length > 0 ? (
              recentActivities.map(activity => (
                <tr key={activity.id}>
                  <td>{activity.icon} {activity.text}</td>
                  <td>{activity.dept}</td>
                  <td>
                    <span className={`status-badge ${
                      activity.status === 'Completed' ? 'success' : 
                      activity.status === 'Pending' ? 'warning' :
                      activity.status === 'Error' ? 'danger' :
                      'secondary'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                  <td>{activity.time}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="empty-state">
                  <p>No recent activities</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default Dashboard;