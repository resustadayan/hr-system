// src/components/MGDHDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { logout } from '../firebase';

// Material-UI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import logo from '../assets/hrmo logo.jpg';

function MGDHDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState({});
  const [teamCompliance, setTeamCompliance] = useState({});
  const [userName, setUserName] = useState('');
  const [department, setDepartment] = useState('');
  const [showLeaveDetails, setShowLeaveDetails] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [missingDocuments, setMissingDocuments] = useState([]);
  const [presentToday, setPresentToday] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [complianceRate, setComplianceRate] = useState(0);

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchMGDHData();
    setupRealtimeListeners();
  }, []);

  const fetchMGDHData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      // Get MGDH user data
      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        setUserName(userData.name || 'Department Head');
        setDepartment(userData.department || 'Unknown Department');

        // Get all employees (for department filter)
        const empQuery = query(collection(db, 'employees'), where('department', '==', userData.department));
        const empSnapshot = await getDocs(empQuery);
        const teamList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeamMembers(teamList);
        setTotalEmployees(teamList.length);

        // Get all departments
        const deptSnapshot = await getDocs(collection(db, 'departments'));
        const deptList = deptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDepartments(deptList);

        // Get system users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSystemUsers(usersList);

        // Get leave requests for team members
        const teamIds = teamList.map(emp => emp.id);
        if (teamIds.length > 0) {
          const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', 'in', teamIds));
          const leaveSnapshot = await getDocs(leaveQuery);
          const leaves = leaveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllLeaveRequests(leaves);
          
          // Filter pending leaves
          const pending = leaves.filter(l => l.status === 'Pending');
          setPendingLeaves(pending);
        }

        // Get attendance for team - TODAY
        const today = new Date().toISOString().split('T')[0];
        const attSnapshot = await getDocs(collection(db, 'attendance'));
        const attendanceData = {};
        let presentCount = 0;
        
        attSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (teamIds.includes(data.employeeId) && data.date === today) {
            if (data.status === 'Present' || data.status === 'On Time') {
              presentCount++;
            }
            if (!attendanceData[data.employeeId]) {
              attendanceData[data.employeeId] = { present: 0, late: 0, absent: 0, total: 0 };
            }
            attendanceData[data.employeeId].total++;
            if (data.status === 'Present' || data.status === 'On Time') {
              attendanceData[data.employeeId].present++;
            } else if (data.status === 'Late') {
              attendanceData[data.employeeId].late++;
            } else {
              attendanceData[data.employeeId].absent++;
            }
          }
        });
        setTeamAttendance(attendanceData);
        setPresentToday(presentCount);

        // Get compliance/documents for team
        const docSnapshot = await getDocs(collection(db, 'documents'));
        const complianceData = {};
        let missingDocs = [];
        let totalDocs = 0;
        let completeDocs = 0;

        teamIds.forEach(id => {
          const empDocs = docSnapshot.docs.filter(d => d.data().employeeId === id);
          const total = empDocs.length;
          const complete = empDocs.filter(d => d.data().status === 'Complete' || d.data().status === 'Submitted').length;
          complianceData[id] = total > 0 ? Math.round((complete / total) * 100) : 0;
          totalDocs += total;
          completeDocs += complete;
          
          // Find missing documents
          empDocs.forEach(d => {
            if (d.data().status === 'Missing' || d.data().status === 'Not Submitted') {
              missingDocs.push(d.data());
            }
          });
        });
        setTeamCompliance(complianceData);
        setMissingDocuments(missingDocs);
        
        // Calculate overall compliance rate
        const overallRate = totalDocs > 0 ? Math.round((completeDocs / totalDocs) * 100) : 0;
        setComplianceRate(overallRate);

        // Get notifications
        const notifQuery = query(collection(db, 'notifications'), where('department', '==', userData.department));
        const notifSnapshot = await getDocs(notifQuery);
        setNotifications(notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error('Error fetching MGDH data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    const user = auth.currentUser;
    if (!user) return;

    const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
    getDocs(userQuery).then((snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        
        // Listen to leave requests for team
        const empQuery = query(collection(db, 'employees'), where('department', '==', userData.department));
        getDocs(empQuery).then((empSnapshot) => {
          const teamIds = empSnapshot.docs.map(doc => doc.id);
          if (teamIds.length > 0) {
            const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', 'in', teamIds));
            onSnapshot(leaveQuery, (snapshot) => {
              const leaves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setAllLeaveRequests(leaves);
              setPendingLeaves(leaves.filter(l => l.status === 'Pending'));
              
              // Update pending leaves count in UI
              updateDashboardStats();
            });
          }
        });
        
        // Listen to attendance changes
        onSnapshot(collection(db, 'attendance'), () => {
          updateDashboardStats();
        });
        
        // Listen to document changes
        onSnapshot(collection(db, 'documents'), () => {
          updateDashboardStats();
        });
      }
    });
  };
  
  const updateDashboardStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        const empQuery = query(collection(db, 'employees'), where('department', '==', userData.department));
        const empSnapshot = await getDocs(empQuery);
        const teamList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const teamIds = teamList.map(emp => emp.id);
        
        // Update attendance
        const today = new Date().toISOString().split('T')[0];
        const attSnapshot = await getDocs(collection(db, 'attendance'));
        let presentCount = 0;
        attSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (teamIds.includes(data.employeeId) && data.date === today) {
            if (data.status === 'Present' || data.status === 'On Time') {
              presentCount++;
            }
          }
        });
        setPresentToday(presentCount);
        setTotalEmployees(teamList.length);
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

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

  const handleLeaveAction = async (leaveId, action) => {
    if (processingAction) return;
    setProcessingAction(true);

    try {
      await updateDoc(doc(db, 'leaveRequests', leaveId), { 
        status: action === 'approve' ? 'Approved' : 'Rejected'
      });

      // Create notification for employee
      const leave = allLeaveRequests.find(l => l.id === leaveId);
      if (leave) {
        await addDoc(collection(db, 'notifications'), {
          employeeId: leave.employeeId,
          department: department,
          message: `Your leave request for ${leave.type} has been ${action === 'approve' ? 'approved' : 'rejected'}`,
          type: 'leave_action',
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      alert(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      fetchMGDHData();
    } catch (error) {
      console.error('Error updating leave:', error);
      alert('Failed to update leave request');
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Approved':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4 }} /> Approved</span>;
      case 'Pending':
        return <span className="status-badge warning"><HourglassEmptyIcon style={{ fontSize: 14, marginRight: 4 }} /> Pending</span>;
      case 'Rejected':
        return <span className="status-badge danger"><CancelIcon style={{ fontSize: 14, marginRight: 4 }} /> Rejected</span>;
      default:
        return <span className="status-badge secondary">{status}</span>;
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = teamMembers.find(e => e.id === employeeId);
    return emp ? emp.fullName : 'Unknown';
  };

  const getEmployeePosition = (employeeId) => {
    const emp = teamMembers.find(e => e.id === employeeId);
    return emp ? emp.position : 'N/A';
  };

  const getAttendanceStatus = (employeeId) => {
    const data = teamAttendance[employeeId] || { present: 0, late: 0, absent: 0, total: 0 };
    if (data.total === 0) return 'Not Recorded';
    if (data.present === data.total) return 'Present';
    if (data.late > 0) return 'Late';
    return 'Absent';
  };

  const getComplianceStatus = (employeeId) => {
    const rate = teamCompliance[employeeId] || 0;
    if (rate === 100) return 'Fully Compliant';
    if (rate >= 75) return 'Mostly Compliant';
    return 'Needs Attention';
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return <div className="loading">Loading MGDH Dashboard...</div>;
  }

  // Sidebar component
  const Sidebar = () => (
    <div className={`mgdh-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-top">
        <img src={logo} alt="LGU Logo" className="sidebar-logo" />
        <h3>HR System</h3>
        <p>Pagbilao LGU</p>
        <div className="user-badge">
          <span className="user-name">{userName}</span>
          <span className="user-role">Department Head</span>
          <span className="user-dept">{department}</span>
        </div>
      </div>

      <div className="sidebar-menu">
        <button 
          onClick={() => { setActiveTab('dashboard'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <DashboardIcon style={{ fontSize: 20, marginRight: 12 }} />
          Dashboard
        </button>
        
        <button 
          onClick={() => { setActiveTab('leave'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'leave' ? 'active' : ''}`}
        >
          <EventNoteIcon style={{ fontSize: 20, marginRight: 12 }} />
          Leave Requests
          {pendingLeaves.length > 0 && <span className="badge-count">{pendingLeaves.length}</span>}
        </button>
        
        <button 
          onClick={() => { setActiveTab('team'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'team' ? 'active' : ''}`}
        >
          <PeopleIcon style={{ fontSize: 20, marginRight: 12 }} />
          Team Overview
        </button>
        
        <button 
          onClick={() => { setActiveTab('notifications'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'notifications' ? 'active' : ''}`}
        >
          <NotificationsIcon style={{ fontSize: 20, marginRight: 12 }} />
          Notifications
          {unreadNotifications > 0 && <span className="badge-count">{unreadNotifications}</span>}
        </button>

        <button onClick={handleLogout} className="logout-btn">
          <LogoutIcon style={{ fontSize: 20, marginRight: 12 }} />
          Logout
        </button>
      </div>
    </div>
  );

  // Dashboard Content - Matching the image style
  const renderDashboard = () => (
    <div className="mgdh-dashboard-content">
      <div className="welcome-header">
        <h1>Welcome, Department Head</h1>
        <p>Here's your team overview</p>
      </div>

      {/* Stats Cards - Matching the image design */}
      <div className="stats-grid">
        <div className="stat-card-modern">
          <div className="stat-card-content">
            <div className="stat-icon-wrapper blue">
              <PeopleIcon className="stat-icon" />
            </div>
            <div className="stat-text">
              <h4>TOTAL EMPLOYEES</h4>
              <p className="stat-number">{totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-card-content">
            <div className="stat-icon-wrapper green">
              <CheckCircleIcon className="stat-icon" />
            </div>
            <div className="stat-text">
              <h4>PRESENT TODAY</h4>
              <p className="stat-number">{presentToday}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-card-content">
            <div className="stat-icon-wrapper orange">
              <HourglassEmptyIcon className="stat-icon" />
            </div>
            <div className="stat-text">
              <h4>PENDING LEAVES</h4>
              <p className="stat-number">{pendingLeaves.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-card-content">
            <div className="stat-icon-wrapper purple">
              <AssignmentLateIcon className="stat-icon" />
            </div>
            <div className="stat-text">
              <h4>COMPLIANCE RATE</h4>
              <p className="stat-number">{complianceRate}%</p>
            </div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-card-content">
            <div className="stat-icon-wrapper teal">
              <BusinessIcon className="stat-icon" />
            </div>
            <div className="stat-text">
              <h4>DEPARTMENTS</h4>
              <p className="stat-number">{departments.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-card-content">
            <div className="stat-icon-wrapper red">
              <DescriptionIcon className="stat-icon" />
            </div>
            <div className="stat-text">
              <h4>MISSING DOCUMENTS</h4>
              <p className="stat-number">{missingDocuments.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-card-content">
            <div className="stat-icon-wrapper cyan">
              <PersonIcon className="stat-icon" />
            </div>
            <div className="stat-text">
              <h4>SYSTEM USERS</h4>
              <p className="stat-number">{systemUsers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Recent activity */}
      <div className="dashboard-grid">
        <div className="dashboard-box">
          <h2>Recent Leave Requests</h2>
          {pendingLeaves.length === 0 ? (
            <p className="no-data">No pending leave requests</p>
          ) : (
            pendingLeaves.slice(0, 4).map(leave => (
              <div key={leave.id} className="pending-item">
                <div className="pending-info">
                  <span className="pending-name">{getEmployeeName(leave.employeeId)}</span>
                  <span className="pending-type">{leave.type}</span>
                  <span className="pending-days">{leave.days} days</span>
                </div>
                <div className="pending-actions">
                  <button 
                    onClick={() => handleLeaveAction(leave.id, 'approve')}
                    className="btn-approve"
                    disabled={processingAction}
                    title="Approve"
                  >
                    <CheckIcon />
                  </button>
                  <button 
                    onClick={() => handleLeaveAction(leave.id, 'reject')}
                    className="btn-reject"
                    disabled={processingAction}
                    title="Reject"
                  >
                    <ClearIcon />
                  </button>
                </div>
              </div>
            ))
          )}
          {pendingLeaves.length > 4 && (
            <button className="btn-view-all" onClick={() => setActiveTab('leave')}>
              View all {pendingLeaves.length} pending requests
            </button>
          )}
        </div>

        <div className="dashboard-box">
          <h2>Team Summary</h2>
          <div className="team-summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Members</span>
              <span className="summary-value">{teamMembers.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Present Today</span>
              <span className="summary-value">{presentToday}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Compliance Rate</span>
              <span className="summary-value">{complianceRate}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Pending Leaves</span>
              <span className="summary-value">{pendingLeaves.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Leave Management Content
  const renderLeaveManagement = () => (
    <div className="mgdh-leave-content">
      <div className="section-header">
        <h2>Leave Requests</h2>
        <span className="stats-badge">{pendingLeaves.length} pending</span>
      </div>

      <div className="table-container">
        <table className="leave-table-mgdh">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allLeaveRequests.map(leave => (
              <tr key={leave.id} className={leave.status === 'Pending' ? 'pending-row' : ''}>
                <td>{getEmployeeName(leave.employeeId)}</td>
                <td>{getEmployeePosition(leave.employeeId)}</td>
                <td>{leave.type}</td>
                <td>{leave.startDate} → {leave.endDate}</td>
                <td>{leave.days}</td>
                <td>{getStatusBadge(leave.status)}</td>
                <td>
                  {leave.status === 'Pending' && (
                    <div className="action-group">
                      <button 
                        onClick={() => handleLeaveAction(leave.id, 'approve')}
                        className="btn-action approve"
                        disabled={processingAction}
                      >
                        <ThumbUpIcon style={{ fontSize: 16 }} /> Approve
                      </button>
                      <button 
                        onClick={() => handleLeaveAction(leave.id, 'reject')}
                        className="btn-action reject"
                        disabled={processingAction}
                      >
                        <ThumbDownIcon style={{ fontSize: 16 }} /> Reject
                      </button>
                    </div>
                  )}
                  {leave.status !== 'Pending' && (
                    <span className="no-action">—</span>
                  )}
                </td>
              </tr>
            ))}
            {allLeaveRequests.length === 0 && (
              <tr><td colSpan="7" className="empty-state">No leave requests found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Team Overview Content
  const renderTeamOverview = () => (
    <div className="mgdh-team-content">
      <div className="section-header">
        <h2>Team Overview</h2>
        <span className="stats-badge">{teamMembers.length} members</span>
      </div>

      <div className="team-grid">
        {teamMembers.map(member => {
          const attendance = getAttendanceStatus(member.id);
          const compliance = getComplianceStatus(member.id);
          const memberLeaves = allLeaveRequests.filter(l => l.employeeId === member.id);
          const pendingCount = memberLeaves.filter(l => l.status === 'Pending').length;

          return (
            <div key={member.id} className="team-member-card">
              <div className="member-avatar">
                {member.fullName?.charAt(0) || '?'}
              </div>
              <div className="member-info">
                <h4>{member.fullName}</h4>
                <p>{member.position}</p>
              </div>
              <div className="member-stats">
                <div className="member-stat">
                  <span className="stat-label">Attendance</span>
                  <span className="stat-value">{attendance}</span>
                </div>
                <div className="member-stat">
                  <span className="stat-label">Compliance</span>
                  <span className="stat-value">{compliance}</span>
                </div>
                <div className="member-stat">
                  <span className="stat-label">Pending Leaves</span>
                  <span className="stat-value">{pendingCount}</span>
                </div>
              </div>
            </div>
          );
        })}
        {teamMembers.length === 0 && (
          <p className="no-data">No team members found</p>
        )}
      </div>
    </div>
  );

  // Notifications Content
  const renderNotifications = () => (
    <div className="mgdh-notifications-content">
      <div className="section-header">
        <h2>Notifications</h2>
        {unreadNotifications > 0 && (
          <span className="badge-count-large">{unreadNotifications} unread</span>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 && (
          <div className="no-notifications">
            <NotificationsIcon style={{ fontSize: 48, color: '#b0c4de' }} />
            <p>No notifications yet</p>
          </div>
        )}
        {notifications.map(notif => (
          <div key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`}>
            <div className="notification-content">
              <p>{notif.message}</p>
              <span className="notification-time">
                {new Date(notif.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mgdh-dashboard">
      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header">
          <button onClick={toggleSidebar} className="menu-btn">
            <MenuIcon />
          </button>
          <span className="mobile-title">HR System</span>
          <span className="mobile-user">{userName?.charAt(0) || '?'}</span>
        </div>
      )}

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className={`mgdh-main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'leave' && renderLeaveManagement()}
        {activeTab === 'team' && renderTeamOverview()}
        {activeTab === 'notifications' && renderNotifications()}
      </div>
    </div>
  );
}

export default MGDHDashboard;