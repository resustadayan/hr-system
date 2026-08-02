// src/other file for dashboard/MGDHDashboard.js
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
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkunreadIcon from '@mui/icons-material/Markunread';
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
  const [processingAction, setProcessingAction] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [missingDocuments, setMissingDocuments] = useState([]);
  const [presentToday, setPresentToday] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [complianceRate, setComplianceRate] = useState(0);
  const [teamMemberIds, setTeamMemberIds] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [mgdhUserId, setMgdhUserId] = useState('');

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

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
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

      setUserEmail(user.email);

      // Get MGDH user data from users collection
      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        console.warn('No user found with email:', user.email);
        setLoading(false);
        return;
      }

      const userData = userSnapshot.docs[0].data();
      const userId = userSnapshot.docs[0].id;
      setMgdhUserId(userId);
      setUserName(userData.name || 'Department Head');
      
      // Get department - handle both 'department' and 'dept' fields
      const userDepartment = userData.department || userData.dept || '';
      setDepartment(userDepartment);

      // Get ALL users from users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setSystemUsers(allUsers);

      // If MGDH has a department, filter team members by department
      let teamList = [];
      if (userDepartment && userDepartment.trim() !== '') {
        teamList = allUsers.filter(u => 
          (u.department === userDepartment || u.dept === userDepartment) && 
          u.id !== userId // Exclude the MGDH themselves
        );
      } else {
        // If no department, show all users except the MGDH
        teamList = allUsers.filter(u => u.id !== userId);
        console.warn('MGDH user has no department assigned. Showing all users.');
      }
      
      setTeamMembers(teamList);
      setTotalEmployees(teamList.length);
      
      // Store team member IDs for filtering
      const teamIds = teamList.map(member => member.id);
      setTeamMemberIds(teamIds);

      // Get all departments
      const allDepts = [...new Set(allUsers.map(u => u.department || u.dept).filter(Boolean))];
      setDepartments(allDepts.map(dept => ({ id: dept, name: dept })));

      // Get leave requests for team members
      const leaveSnapshot = await getDocs(collection(db, 'leaveRequests'));
      const allLeaves = leaveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter leaves for team members only
      let teamLeaves = [];
      if (teamIds.length > 0) {
        teamLeaves = allLeaves.filter(leave => teamIds.includes(leave.employeeId));
      } else {
        // If no team members, show all leaves
        teamLeaves = allLeaves;
      }
      
      setAllLeaveRequests(teamLeaves);
      
      // Filter pending leaves
      const pending = teamLeaves.filter(l => l.status === 'Pending');
      setPendingLeaves(pending);

      // Get attendance for team - TODAY
      const today = new Date().toISOString().split('T')[0];
      const attSnapshot = await getDocs(collection(db, 'attendance'));
      const attendanceData = {};
      let presentCount = 0;
      
      attSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const employeeId = data.employeeId;
        if (employeeId && (teamIds.includes(employeeId) || teamIds.length === 0)) {
          if (data.date === today) {
            if (data.status === 'Present' || data.status === 'On Time') {
              presentCount++;
            }
            if (!attendanceData[employeeId]) {
              attendanceData[employeeId] = { present: 0, late: 0, absent: 0, total: 0 };
            }
            attendanceData[employeeId].total++;
            if (data.status === 'Present' || data.status === 'On Time') {
              attendanceData[employeeId].present++;
            } else if (data.status === 'Late') {
              attendanceData[employeeId].late++;
            } else {
              attendanceData[employeeId].absent++;
            }
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

      const targetIds = teamIds.length > 0 ? teamIds : allUsers.map(u => u.id);
      
      targetIds.forEach(id => {
        const empDocs = docSnapshot.docs.filter(d => d.data().employeeId === id);
        const total = empDocs.length;
        const complete = empDocs.filter(d => d.data().status === 'Complete' || d.data().status === 'Submitted').length;
        complianceData[id] = total > 0 ? Math.round((complete / total) * 100) : 0;
        totalDocs += total;
        completeDocs += complete;
        
        empDocs.forEach(d => {
          if (d.data().status === 'Missing' || d.data().status === 'Not Submitted') {
            const emp = teamList.find(e => e.id === id) || allUsers.find(e => e.id === id);
            missingDocs.push({ ...d.data(), employeeName: emp?.name || emp?.fullName || 'Unknown' });
          }
        });
      });
      setTeamCompliance(complianceData);
      setMissingDocuments(missingDocs);
      
      const overallRate = totalDocs > 0 ? Math.round((completeDocs / totalDocs) * 100) : 0;
      setComplianceRate(overallRate);

      // ====== FETCH NOTIFICATIONS ======
      let allNotifs = [];
      
      if (userDepartment && userDepartment.trim() !== '') {
        // Get notifications for this department
        const notifQuery = query(
          collection(db, 'notifications'), 
          where('department', '==', userDepartment)
        );
        const notifSnapshot = await getDocs(notifQuery);
        allNotifs = notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        // If no department, get all notifications
        const notifSnapshot = await getDocs(collection(db, 'notifications'));
        allNotifs = notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // Filter notifications for MGDH
      const mgdhNotifs = allNotifs.filter(notif => 
        notif.forMGDH === true || 
        notif.type === 'leave_request' ||
        notif.type === 'leave_action_confirmation' ||
        notif.type === 'leave_cancelled'
      );
      
      setAllNotifications(mgdhNotifs);

      // Also get notifications that mention this MGDH by name
      const nameQuery = query(
        collection(db, 'notifications'),
        where('reviewedBy', '==', userName)
      );
      const nameSnapshot = await getDocs(nameQuery);
      const nameNotifs = nameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Combine and deduplicate
      const combinedNotifs = [...mgdhNotifs, ...nameNotifs];
      const uniqueNotifs = combinedNotifs.filter((notif, index, self) => 
        index === self.findIndex(n => n.id === notif.id)
      );
      
      setAllNotifications(uniqueNotifs);

      // Check for new notifications
      const unreadNotifs = uniqueNotifs.filter(n => !n.read);
      if (unreadNotifs.length > 0) {
        const latest = unreadNotifs[0];
        setLatestNotification(latest);
        setShowNotificationAlert(true);
        
        if (Notification.permission === 'granted') {
          new Notification('📢 New Notification', {
            body: latest.message || 'You have a new notification',
            icon: '/favicon.ico'
          });
        }
        
        setTimeout(() => {
          setShowNotificationAlert(false);
        }, 5000);
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

    // Listen to all users changes
    onSnapshot(collection(db, 'users'), () => {
      fetchMGDHData();
    });
    
    // Listen to leave requests
    onSnapshot(collection(db, 'leaveRequests'), () => {
      fetchMGDHData();
    });
    
    // Listen to attendance changes
    onSnapshot(collection(db, 'attendance'), () => {
      fetchMGDHData();
    });
    
    // Listen to document changes
    onSnapshot(collection(db, 'documents'), () => {
      fetchMGDHData();
    });

    // Listen to notifications
    onSnapshot(collection(db, 'notifications'), () => {
      fetchMGDHData();
    });
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

  // ====== NOTIFICATION FUNCTIONS ======
  
  // Mark a single notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      setAllNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark a single notification as unread
  const markNotificationAsUnread = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: false
      });
      setAllNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifs = allNotifications.filter(n => !n.read);
      for (const notif of unreadNotifs) {
        await updateDoc(doc(db, 'notifications', notif.id), {
          read: true
        });
      }
      setAllNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Mark all notifications as unread
  const markAllAsUnread = async () => {
    try {
      for (const notif of allNotifications) {
        await updateDoc(doc(db, 'notifications', notif.id), {
          read: false
        });
      }
      setAllNotifications(prev => 
        prev.map(n => ({ ...n, read: false }))
      );
    } catch (error) {
      console.error('Error marking all notifications as unread:', error);
    }
  };

  const handleLeaveAction = async (leaveId, action) => {
    if (processingAction) return;
    setProcessingAction(true);

    try {
      const leaveDoc = await getDoc(doc(db, 'leaveRequests', leaveId));
      const leaveData = leaveDoc.data();
      
      if (!leaveData) {
        alert('Leave request not found');
        setProcessingAction(false);
        return;
      }

      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      await updateDoc(doc(db, 'leaveRequests', leaveId), { 
        status: newStatus,
        reviewedBy: userName,
        reviewedAt: new Date().toISOString()
      });

      // ====== NOTIFICATION FOR EMPLOYEE ======
      await addDoc(collection(db, 'notifications'), {
        employeeId: leaveData.employeeId,
        employeeName: leaveData.employeeName || 'Employee',
        department: department || leaveData.department || '',
        leaveId: leaveId,
        leaveType: leaveData.type,
        leaveDays: leaveData.days,
        status: newStatus,
        reviewedBy: userName,
        message: `📋 Your ${leaveData.type} leave request for ${leaveData.days} days has been ${newStatus.toLowerCase()} by ${userName}.`,
        type: 'leave_action',
        read: false,
        forEmployee: true,
        forMGDH: false,
        createdAt: new Date().toISOString()
      });

      // ====== NOTIFICATION FOR MGDH ======
      await addDoc(collection(db, 'notifications'), {
        employeeId: leaveData.employeeId,
        employeeName: leaveData.employeeName || 'Employee',
        department: department || leaveData.department || '',
        leaveId: leaveId,
        leaveType: leaveData.type,
        leaveDays: leaveData.days,
        status: newStatus,
        reviewedBy: userName,
        message: `✅ ${leaveData.employeeName || 'Employee'}'s ${leaveData.type} leave request was ${newStatus.toLowerCase()} by ${userName}.`,
        type: 'leave_action_confirmation',
        read: false,
        forEmployee: false,
        forMGDH: true,
        createdAt: new Date().toISOString()
      });

      alert(`✅ Leave request ${newStatus.toLowerCase()} successfully!\nEmployee has been notified.`);
      
      await fetchMGDHData();
    } catch (error) {
      console.error('Error updating leave:', error);
      alert('Failed to update leave request: ' + error.message);
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
    if (emp) return emp.name || emp.fullName || 'Unknown';
    const user = systemUsers.find(u => u.id === employeeId);
    return user ? user.name || user.fullName || 'Unknown' : 'Unknown';
  };

  const getEmployeePosition = (employeeId) => {
    const emp = teamMembers.find(e => e.id === employeeId);
    if (emp) return emp.position || 'N/A';
    const user = systemUsers.find(u => u.id === employeeId);
    return user ? user.position || 'N/A' : 'N/A';
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
    if (rate > 0) return 'Partial';
    return 'Needs Attention';
  };

  const unreadNotifications = allNotifications.filter(n => !n.read).length;

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
          <span className="user-dept">{department || 'No Department Assigned'}</span>
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

  // Dashboard Content
  const renderDashboard = () => (
    <div className="mgdh-dashboard-content">
      <div className="welcome-header">
        <h1>Welcome, {userName}</h1>
        <p>Here's your team overview</p>
      </div>

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
              <span className="summary-label">TOTAL MEMBERS</span>
              <span className="summary-value">{teamMembers.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">PRESENT TODAY</span>
              <span className="summary-value">{presentToday}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">COMPLIANCE RATE</span>
              <span className="summary-value">{complianceRate}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">PENDING LEAVES</span>
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
                {member.name?.charAt(0) || member.fullName?.charAt(0) || '?'}
              </div>
              <div className="member-info">
                <h4>{member.name || member.fullName || 'Unknown'}</h4>
                <p>{member.position || 'N/A'}</p>
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

  // Notifications Content with Mark as Read/Unread
  const renderNotifications = () => {
    const sortedNotifications = [...allNotifications].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return (
      <div className="mgdh-notifications-content">
        <div className="section-header">
          <h2>Notifications</h2>
          <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {unreadNotifications > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="btn-mark-all-read"
                style={{
                  padding: '6px 16px',
                  background: '#4a6fa5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <DoneAllIcon style={{ fontSize: 16 }} />
                Mark All Read
              </button>
            )}
            {allNotifications.length > 0 && (
              <button 
                onClick={markAllAsUnread} 
                className="btn-mark-all-unread"
                style={{
                  padding: '6px 16px',
                  background: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <MarkunreadIcon style={{ fontSize: 16 }} />
                Mark All Unread
              </button>
            )}
            <span className="badge-count-large">{unreadNotifications} unread</span>
          </div>
        </div>

        <div className="notifications-list">
          {sortedNotifications.length === 0 && (
            <div className="no-notifications">
              <NotificationsIcon style={{ fontSize: 48, color: '#b0c4de' }} />
              <p>No notifications yet</p>
            </div>
          )}
          {sortedNotifications.map(notif => {
            const isLeaveRequest = notif.type === 'leave_request';
            const isLeaveAction = notif.type === 'leave_action_confirmation';
            const isLeaveCancelled = notif.type === 'leave_cancelled';
            
            let iconColor = '#4a6fa5';
            let IconComponent = CalendarTodayIcon;
            
            if (isLeaveRequest) {
              iconColor = '#f39c12';
              IconComponent = HourglassEmptyIcon;
            } else if (isLeaveAction) {
              iconColor = '#27ae60';
              IconComponent = CheckCircleIcon;
            } else if (isLeaveCancelled) {
              iconColor = '#e74c3c';
              IconComponent = CancelIcon;
            }
            
            return (
              <div 
                key={notif.id} 
                className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  background: notif.read ? '#f8f9fa' : '#e8f0fe',
                  borderLeft: notif.read ? '3px solid #ccc' : '3px solid #4a6fa5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  cursor: 'default'
                }}
              >
                <div className="notification-content" style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: notif.read ? '400' : '600' }}>
                    <IconComponent style={{ fontSize: 18, color: iconColor, marginRight: 8, verticalAlign: 'middle' }} />
                    {notif.message}
                  </p>
                  <div className="notification-meta" style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
                    <span className="notification-time">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString()}
                    </span>
                    {notif.employeeName && (
                      <span className="notification-employee" style={{ marginLeft: '12px' }}>👤 {notif.employeeName}</span>
                    )}
                    {notif.reviewedBy && (
                      <span className="notification-reviewed" style={{ marginLeft: '12px' }}>Reviewed by: {notif.reviewedBy}</span>
                    )}
                  </div>
                </div>
                <div className="notification-actions" style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                  {notif.read ? (
                    <button 
                      onClick={() => markNotificationAsUnread(notif.id)}
                      className="btn-mark-unread"
                      title="Mark as Unread"
                      style={{
                        padding: '4px 10px',
                        background: '#e67e22',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <MarkunreadIcon style={{ fontSize: 14 }} />
                      Unread
                    </button>
                  ) : (
                    <button 
                      onClick={() => markNotificationAsRead(notif.id)}
                      className="btn-mark-read"
                      title="Mark as Read"
                      style={{
                        padding: '4px 10px',
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <DoneAllIcon style={{ fontSize: 14 }} />
                      Read
                    </button>
                  )}
                  {!notif.read && <span className="notification-dot" style={{ color: '#4a6fa5', fontSize: '18px' }}>●</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mgdh-dashboard">
      {/* Notification Alert Banner */}
      {showNotificationAlert && latestNotification && (
        <div className="notification-alert mgdh-alert" style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          backgroundColor: '#4a6fa5', 
          color: 'white', 
          padding: '15px 20px', 
          borderRadius: '8px', 
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxWidth: '400px'
        }}>
          <div className="alert-content" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="alert-icon" style={{ fontSize: '20px' }}>📋</span>
            <span className="alert-message" style={{ flex: 1 }}>{latestNotification.message}</span>
            <button 
              onClick={() => setShowNotificationAlert(false)} 
              className="alert-close" 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: '20px', 
                cursor: 'pointer' 
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="mobile-header">
          <button onClick={toggleSidebar} className="menu-btn">
            <MenuIcon />
          </button>
          <span className="mobile-title">HR System</span>
          <span className="mobile-user">{userName?.charAt(0) || '?'}</span>
        </div>
      )}

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <Sidebar />

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