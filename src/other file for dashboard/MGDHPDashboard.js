// src/other file for dashboard/MGDHDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import WarningIcon from '@mui/icons-material/Warning';
import TimelineIcon from '@mui/icons-material/Timeline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import BalanceIcon from '@mui/icons-material/Balance';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SickIcon from '@mui/icons-material/Sick';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import ManIcon from '@mui/icons-material/Man';
import logo from '../assets/hrmo logo.jpg';

// Late deduction rate (matches EmployeePortal.js)
const LATE_DEDUCTION_RATE = 500;

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
  const [allEmployees, setAllEmployees] = useState([]);
  
  // ====== LEAVE BALANCE STATES ======
  const [leaveBalances, setLeaveBalances] = useState({});
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState(null);
  
  // ====== ATTENDANCE STATES ======
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('Not Timed In');
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timeIn, setTimeIn] = useState(null);
  const [timeOut, setTimeOut] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [officeStartTime, setOfficeStartTime] = useState('07:00');
  const [officeEndTime, setOfficeEndTime] = useState('18:00');
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    underTimeDays: 0,
    overTimeDays: 0
  });
  const [mgdhEmployeeData, setMgdhEmployeeData] = useState(null);

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

  // ====== HELPER FUNCTIONS ======
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const formatTime = (date) => {
    if (!date) return null;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // ====== GET EMPLOYEE LEAVE BALANCE ======
  const getEmployeeLeaveBalance = (employeeId) => {
    const balance = leaveBalances[employeeId];
    if (!balance) {
      return { vacationLeave: 0, sickLeave: 0, maternityLeave: 0, paternityLeave: 0 };
    }
    return {
      vacationLeave: balance.vacationLeave || 0,
      sickLeave: balance.sickLeave || 0,
      maternityLeave: balance.maternityLeave || 0,
      paternityLeave: balance.paternityLeave || 0
    };
  };

  const getLeaveTypeIcon = (type) => {
    const icons = {
      'Vacation': <BeachAccessIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Sick': <SickIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Maternity': <ChildCareIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Paternity': <ManIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Emergency': <WarningIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
    };
    return icons[type] || <CalendarTodayIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />;
  };

  const getBalanceColor = (balance) => {
    if (balance > 5) return '#27ae60';
    if (balance > 0) return '#e67e22';
    return '#e74c3c';
  };

  // ====== GROUP ATTENDANCE BY DATE FOR AM/PM ======
  const getGroupedAttendance = (records) => {
    const grouped = {};
    records.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = [];
      }
      grouped[record.date].push(record);
    });
    return grouped;
  };

  // ====== GET AM/PM ENTRIES FOR A DATE WITH SEPARATE STATUSES ======
  const getAMPMEntriesWithStatus = (dateRecords) => {
    const sorted = [...dateRecords].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
    
    let amTimeIn = '—';
    let amTimeOut = '—';
    let amStatus = '—';
    let pmTimeIn = '—';
    let pmTimeOut = '—';
    let pmStatus = '—';
    let combinedStatus = 'Present';
    let remarks = '';
    let recordId = null;

    sorted.forEach(record => {
      const entryNum = record.entryNumber || 1;
      const timeIn = record.timeIn || '';
      const timeOut = record.timeOut || '';
      const status = record.status || 'Present';
      recordId = record.id;
      
      if (entryNum === 1 || entryNum === 0) {
        amTimeIn = timeIn || '—';
        amTimeOut = timeOut || '—';
        amStatus = status;
      } else if (entryNum === 2) {
        pmTimeIn = timeIn || '—';
        pmTimeOut = timeOut || '—';
        pmStatus = status;
      }
      
      if (record.status === 'Under Time' && record.undertimeMinutes) {
        remarks = remarks ? `${remarks}, Undertime: ${record.undertimeMinutes} mins` : `Undertime: ${record.undertimeMinutes} mins`;
      } else if (record.status === 'Over Time' && record.overtimeMinutes) {
        remarks = remarks ? `${remarks}, Overtime: ${record.overtimeMinutes} mins` : `Overtime: ${record.overtimeMinutes} mins`;
      } else if (record.status === 'Late') {
        remarks = remarks ? `${remarks}, Late` : 'Late';
      } else if (record.status === 'On Time') {
        remarks = remarks ? `${remarks}, On time` : 'On time';
      }
    });

    // Determine combined daily status
    // Priority: PM Status > AM Status
    if (pmStatus && pmStatus !== '—' && pmStatus !== 'Present' && pmStatus !== 'On Time') {
      combinedStatus = pmStatus;
    } else if (amStatus && amStatus !== '—' && (amStatus === 'Late' || amStatus === 'Under Time')) {
      combinedStatus = amStatus;
    } else if (amStatus === 'Over Time' || pmStatus === 'Over Time') {
      combinedStatus = 'Over Time';
    } else if (amStatus === 'On Time' || pmStatus === 'On Time' || amStatus === 'Present' || pmStatus === 'Present') {
      combinedStatus = 'On Time';
    }

    if (remarks && remarks.startsWith(', ')) {
      remarks = remarks.substring(2);
    }

    return {
      amTimeIn,
      amTimeOut,
      amStatus,
      pmTimeIn,
      pmTimeOut,
      pmStatus,
      combinedStatus,
      remarks,
      recordId
    };
  };

  // ====== FETCH MGDH EMPLOYEE DATA FOR ATTENDANCE ======
  const fetchMgdhEmployeeData = async (email) => {
    try {
      // Find employee in employees collection
      const empQuery = query(collection(db, 'employees'), where('email', '==', email));
      const empSnapshot = await getDocs(empQuery);
      
      if (!empSnapshot.empty) {
        const empData = { id: empSnapshot.docs[0].id, ...empSnapshot.docs[0].data() };
        setMgdhEmployeeData(empData);
        await fetchMgdhAttendance(empData.id);
        console.log('✅ MGDH employee found:', empData);
        return empData;
      }
      
      // If no employee found, CREATE ONE using the MGDH user data
      console.log('⚠️ No employee record found for MGDH. Creating one...');
      
      // Get the MGDH user data from the users collection
      const userQuery = query(collection(db, 'users'), where('email', '==', email));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        console.error('❌ No user found with email:', email);
        alert('No user account found. Please contact HR.');
        return null;
      }
      
      const userData = userSnapshot.docs[0].data();
      const userId = userSnapshot.docs[0].id;
      
      // Create employee document using the user's UID as the document ID
      const employeeData = {
        fullName: userData.name || userData.fullName || email.split('@')[0] || 'MGDH User',
        email: email,
        department: userData.department || userData.dept || 'N/A',
        position: userData.position || 'Department Head',
        contact: userData.contact || '',
        employmentStatus: 'Active',
        dateHired: new Date().toISOString().split('T')[0],
        salary: userData.salary || 0,
        createdAt: new Date().toISOString()
      };
      
      // Use the same ID as the users collection document
      await setDoc(doc(db, 'employees', userId), employeeData);
      console.log('✅ Created employee record for MGDH:', employeeData);
      
      // Also create a leave balance for this employee
      const balanceRef = doc(db, 'leaveBalances', userId);
      const balanceSnap = await getDoc(balanceRef);
      if (!balanceSnap.exists()) {
        await setDoc(balanceRef, {
          employeeId: userId,
          vacationLeave: 15,
          sickLeave: 15,
          maternityLeave: 105,
          paternityLeave: 7,
          createdAt: new Date().toISOString()
        });
        console.log('Created leave balance for MGDH');
      }
      
      // Fetch the newly created employee data
      const newEmpData = { id: userId, ...employeeData };
      setMgdhEmployeeData(newEmpData);
      await fetchMgdhAttendance(userId);
      
      alert('Employee record created successfully! You can now time in.');
      return newEmpData;
      
    } catch (error) {
      console.error('Error fetching/creating MGDH employee data:', error);
      alert('Error: ' + error.message);
      return null;
    }
  };

  // ====== FETCH MGDH ATTENDANCE ======
  const fetchMgdhAttendance = async (empId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const todayQuery = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId),
        where('date', '==', today)
      );
      const todaySnapshot = await getDocs(todayQuery);
      
      if (!todaySnapshot.empty) {
        // Get the most recent entry for today
        const allDocs = todaySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by entry number or by timeIn
        const sortedDocs = allDocs.sort((a, b) => {
          if (a.entryNumber && b.entryNumber) return b.entryNumber - a.entryNumber;
          return (b.timeIn || '').localeCompare(a.timeIn || '');
        });
        const latestDoc = sortedDocs[0];
        const todayData = latestDoc;
        const todayId = latestDoc.id;
        
        setTodayAttendance({ id: todayId, ...todayData });
        setTimeIn(todayData.timeIn || null);
        setTimeOut(todayData.timeOut || null);
        setIsTimedIn(!!todayData.timeIn);
        setIsTimedOut(!!todayData.timeOut);
        
        if (todayData.timeIn && !todayData.timeOut) {
          setAttendanceStatus('Timed In');
        } else if (todayData.timeIn && todayData.timeOut) {
          setAttendanceStatus('Completed');
        } else {
          setAttendanceStatus('Not Timed In');
        }
      } else {
        setTodayAttendance(null);
        setTimeIn(null);
        setTimeOut(null);
        setIsTimedIn(false);
        setIsTimedOut(false);
        setAttendanceStatus('Not Timed In');
      }

      // Fetch all attendance records for this employee
      const allQuery = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId)
      );
      const allSnapshot = await getDocs(allQuery);
      const records = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records);

      // Calculate summary for current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      });

      const totalDays = monthRecords.length;
      const presentDays = monthRecords.filter(r => r.status === 'Present' || r.status === 'On Time').length;
      const lateDays = monthRecords.filter(r => r.status === 'Late').length;
      const underTimeDays = monthRecords.filter(r => r.status === 'Under Time').length;
      const overTimeDays = monthRecords.filter(r => r.status === 'Over Time').length;
      
      setAttendanceSummary({
        totalDays: totalDays || 0,
        presentDays: presentDays || 0,
        lateDays: lateDays || 0,
        absentDays: Math.max(0, totalDays - presentDays - lateDays - underTimeDays - overTimeDays),
        underTimeDays: underTimeDays || 0,
        overTimeDays: overTimeDays || 0
      });

    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  // ====== MGDH TIME IN ======
  const handleTimeIn = async () => {
    if (!mgdhEmployeeData) {
      alert('Employee data not found. Please refresh and try again.');
      const user = auth.currentUser;
      if (user) {
        await fetchMgdhEmployeeData(user.email);
      }
      return;
    }
    
    setAttendanceLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date();
      const timeInStr = formatTime(currentTime);
      
      // Check existing entries for today
      const existingQuery = query(
        collection(db, 'attendance'),
        where('employeeId', '==', mgdhEmployeeData.id),
        where('date', '==', today)
      );
      const existingSnapshot = await getDocs(existingQuery);
      const existingDocs = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Find if there's an incomplete entry (has timeIn but no timeOut)
      const incompleteEntry = existingDocs.find(doc => doc.timeIn && !doc.timeOut);
      
      if (incompleteEntry) {
        alert('You have an incomplete attendance entry. Please time out first.');
        setAttendanceLoading(false);
        return;
      }

      // Determine entry number
      const entryNumber = existingDocs.length + 1;
      
      // Determine status based on office start time
      const status = timeInStr <= officeStartTime ? 'On Time' : 'Late';

      await addDoc(collection(db, 'attendance'), {
        employeeId: mgdhEmployeeData.id,
        employeeName: mgdhEmployeeData.fullName || userName,
        department: department || mgdhEmployeeData.department || 'N/A',
        date: today,
        timeIn: timeInStr,
        timeOut: null,
        status: status,
        entryNumber: entryNumber,
        recordedBy: 'MGDH',
        recordedAt: new Date().toISOString(),
        timestamp: Timestamp.now()
      });

      await addDoc(collection(db, 'notifications'), {
        employeeId: mgdhEmployeeData.id,
        employeeName: mgdhEmployeeData.fullName || userName,
        department: department || mgdhEmployeeData.department || 'N/A',
        type: 'attendance_timein_mgdh',
        message: `${userName} (MGDH) timed in at ${timeInStr} (${status}) - Entry ${entryNumber}`,
        read: false,
        forAdmin: true,
        forEmployee: false,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        employeeId: mgdhEmployeeData.id,
        type: 'attendance_confirmation',
        message: `You have successfully timed in at ${timeInStr} (${status}) - Entry ${entryNumber}`,
        read: false,
        forEmployee: true,
        forAdmin: false,
        createdAt: new Date().toISOString()
      });

      setTimeIn(timeInStr);
      setIsTimedIn(true);
      setAttendanceStatus('Timed In');
      
      const statusEmoji = status === 'On Time' ? '✅' : '⚠️';
      alert(`${statusEmoji} Timed in successfully at ${timeInStr}\nStatus: ${status}\nEntry ${entryNumber}`);
      
      await fetchMgdhAttendance(mgdhEmployeeData.id);
      
    } catch (error) {
      console.error('Error timing in:', error);
      alert('Failed to time in. Please try again.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ====== MGDH TIME OUT ======
  const handleTimeOut = async () => {
    if (!mgdhEmployeeData) {
      alert('Employee data not found. Please refresh and try again.');
      return;
    }
    
    setAttendanceLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date();
      const timeOutStr = formatTime(currentTime);
      
      // Find the most recent attendance record for today that has timeIn but no timeOut
      const existingQuery = query(
        collection(db, 'attendance'),
        where('employeeId', '==', mgdhEmployeeData.id),
        where('date', '==', today)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        alert('You have not timed in today.');
        setAttendanceLoading(false);
        return;
      }

      // Find the record with timeIn but no timeOut (most recent incomplete entry)
      let recordToUpdate = null;
      let recordId = null;
      
      const docs = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by entry number descending to get the latest
      docs.sort((a, b) => (b.entryNumber || 0) - (a.entryNumber || 0));
      
      for (const doc of docs) {
        if (doc.timeIn && !doc.timeOut) {
          recordToUpdate = doc;
          recordId = doc.id;
          break;
        }
      }

      if (!recordToUpdate) {
        alert('All your entries for today are already completed. Please time in first if you want to record another entry.');
        setAttendanceLoading(false);
        return;
      }

      // Determine if this is under time or over time
      const officeEndMinutes = timeToMinutes(officeEndTime);
      const timeOutMinutes = timeToMinutes(timeOutStr);
      const timeInMinutes = timeToMinutes(recordToUpdate.timeIn);
      
      let status = recordToUpdate.status || 'Present';
      let overtimeMinutes = 0;
      let undertimeMinutes = 0;

      // Check if timed out early (undertime)
      if (timeOutMinutes < officeEndMinutes) {
        const diffMinutes = officeEndMinutes - timeOutMinutes;
        if (diffMinutes >= 15) { // 15 minutes threshold
          status = 'Under Time';
          undertimeMinutes = diffMinutes;
        } else {
          // If less than 15 minutes early, still considered on time
          status = recordToUpdate.status === 'Late' ? 'Late' : 'On Time';
        }
      } 
      // Check if timed out late (overtime)
      else if (timeOutMinutes > officeEndMinutes) {
        const diffMinutes = timeOutMinutes - officeEndMinutes;
        if (diffMinutes >= 15) { // 15 minutes threshold
          status = 'Over Time';
          overtimeMinutes = diffMinutes;
        } else {
          status = recordToUpdate.status === 'Late' ? 'Late' : 'On Time';
        }
      } else {
        status = recordToUpdate.status === 'Late' ? 'Late' : 'On Time';
      }

      await updateDoc(doc(db, 'attendance', recordId), {
        timeOut: timeOutStr,
        status: status,
        overtimeMinutes: overtimeMinutes,
        undertimeMinutes: undertimeMinutes,
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        employeeId: mgdhEmployeeData.id,
        employeeName: mgdhEmployeeData.fullName || userName,
        department: department || mgdhEmployeeData.department || 'N/A',
        type: 'attendance_timeout_mgdh',
        message: `${userName} (MGDH) timed out at ${timeOutStr} (${status})${overtimeMinutes > 0 ? ` (Overtime: ${overtimeMinutes} mins)` : ''}${undertimeMinutes > 0 ? ` (Undertime: ${undertimeMinutes} mins)` : ''}`,
        read: false,
        forAdmin: true,
        forEmployee: false,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        employeeId: mgdhEmployeeData.id,
        type: 'attendance_confirmation',
        message: `You have successfully timed out at ${timeOutStr}\nStatus: ${status}${overtimeMinutes > 0 ? ` (Overtime: ${overtimeMinutes} mins)` : ''}${undertimeMinutes > 0 ? ` (Undertime: ${undertimeMinutes} mins)` : ''}`,
        read: false,
        forEmployee: true,
        forAdmin: false,
        createdAt: new Date().toISOString()
      });

      setTimeOut(timeOutStr);
      setIsTimedOut(true);
      setAttendanceStatus('Completed');
      
      let alertMessage = `Timed out successfully at ${timeOutStr}\nStatus: ${status}`;
      if (overtimeMinutes > 0) {
        alertMessage += `\n🕐 Overtime: ${overtimeMinutes} minutes`;
      }
      if (undertimeMinutes > 0) {
        alertMessage += `\n⚠️ Undertime: ${undertimeMinutes} minutes`;
      }
      alert(alertMessage);
      
      await fetchMgdhAttendance(mgdhEmployeeData.id);
      
    } catch (error) {
      console.error('Error timing out:', error);
      alert('Failed to time out. Please try again.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ====== ATTENDANCE STATUS BADGE ======
  const getAttendanceStatusBadge = (status) => {
    switch(status) {
      case 'On Time':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4 }} /> On Time</span>;
      case 'Late':
        return <span className="status-badge warning"><WarningIcon style={{ fontSize: 14, marginRight: 4 }} /> Late</span>;
      case 'Under Time':
        return <span className="status-badge warning"><WarningIcon style={{ fontSize: 14, marginRight: 4 }} /> Under Time</span>;
      case 'Over Time':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4 }} /> Over Time</span>;
      case 'Timed In':
        return <span className="status-badge info"><AccessTimeIcon style={{ fontSize: 14, marginRight: 4 }} /> Timed In</span>;
      case 'Completed':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4 }} /> Completed</span>;
      default:
        return <span className="status-badge secondary">{status}</span>;
    }
  };

  // ====== GET STATUS BADGE FOR INDIVIDUAL AM/PM ======
  const getStatusBadgeSimple = (status) => {
    if (status === '—') {
      return <span className="status-badge secondary">—</span>;
    }
    switch(status) {
      case 'On Time':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 12, marginRight: 3 }} /> On Time</span>;
      case 'Late':
        return <span className="status-badge warning"><WarningIcon style={{ fontSize: 12, marginRight: 3 }} /> Late</span>;
      case 'Under Time':
        return <span className="status-badge warning"><WarningIcon style={{ fontSize: 12, marginRight: 3 }} /> Under Time</span>;
      case 'Over Time':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 12, marginRight: 3 }} /> Over Time</span>;
      case 'Present':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 12, marginRight: 3 }} /> Present</span>;
      default:
        return <span className="status-badge secondary">{status}</span>;
    }
  };

  // ====== ATTENDANCE TAB ======
  const renderAttendance = () => {
    // Group attendance records by date for AM/PM display
    const groupedRecords = getGroupedAttendance(attendanceRecords);
    const sortedDates = Object.keys(groupedRecords).sort((a, b) => b.localeCompare(a));
    
    return (
      <div className="mgdh-attendance-content">
        <div className="section-header">
          <h2><AccessTimeIcon style={{ fontSize: 24, marginRight: 10, verticalAlign: 'middle' }} /> My Attendance (AM/PM)</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="stats-badge">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon blue"><EventNoteIcon /></div>
            <div className="stat-info">
              <h3>Total Days</h3>
              <p>{attendanceSummary.totalDays}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircleIcon /></div>
            <div className="stat-info">
              <h3>Present</h3>
              <p>{attendanceSummary.presentDays}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><WarningIcon /></div>
            <div className="stat-info">
              <h3>Late</h3>
              <p>{attendanceSummary.lateDays}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><WarningIcon /></div>
            <div className="stat-info">
              <h3>Under Time</h3>
              <p>{attendanceSummary.underTimeDays || 0}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success"><CheckCircleIcon /></div>
            <div className="stat-info">
              <h3>Over Time</h3>
              <p>{attendanceSummary.overTimeDays || 0}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><CancelIcon /></div>
            <div className="stat-info">
              <h3>Absent</h3>
              <p>{attendanceSummary.absentDays || 0}</p>
            </div>
          </div>
        </div>

        <div className="form-card-modern">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AccessTimeIcon />
            Today's Attendance
          </h3>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            padding: '10px 0'
          }}>
            <div>
              <p style={{ margin: '5px 0' }}>
                <strong>Status:</strong> {getAttendanceStatusBadge(attendanceStatus)}
              </p>
              {timeIn && <p style={{ margin: '5px 0' }}><strong>Time In:</strong> {timeIn}</p>}
              {timeOut && <p style={{ margin: '5px 0' }}><strong>Time Out:</strong> {timeOut}</p>}
              <p style={{ margin: '5px 0', fontSize: '13px', color: '#888' }}>
                <strong>Office Hours:</strong> {officeStartTime} - {officeEndTime}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleTimeIn} 
                className="btn-time-in"
                disabled={attendanceLoading}
                style={{
                  padding: '12px 30px',
                  background: '#4a6fa5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: attendanceLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: attendanceLoading ? 0.7 : 1
                }}
              >
                <LoginIcon style={{ fontSize: 20 }} />
                {attendanceLoading ? 'Processing...' : 'Time In'}
              </button>
              <button 
                onClick={handleTimeOut} 
                className="btn-time-out"
                disabled={attendanceLoading || !isTimedIn}
                style={{
                  padding: '12px 30px',
                  background: (!isTimedIn || attendanceLoading) ? '#ccc' : '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (!isTimedIn || attendanceLoading) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <Logout style={{ fontSize: 20 }} />
                {attendanceLoading ? 'Processing...' : 'Time Out'}
              </button>
            </div>
          </div>
          {isTimedIn && isTimedOut && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#d4edda', borderRadius: '8px', color: '#155724' }}>
              You have completed your attendance entry. You can time in again if needed.
            </div>
          )}
          {isTimedIn && !isTimedOut && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '8px', color: '#856404' }}>
              You are currently timed in. Click "Time Out" when leaving.
            </div>
          )}
        </div>

        <div className="form-card-modern">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TimelineIcon />
            Attendance History (AM/PM)
            <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal', marginLeft: 'auto' }}>
              {attendanceRecords.length} records
            </span>
          </h3>
          <div className="table-container">
            <table className="attendance-table-modern">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>AM Time In</th>
                  <th>AM Time Out</th>
                  <th>AM Status</th>
                  <th>PM Time In</th>
                  <th>PM Time Out</th>
                  <th>PM Status</th>
                  <th>Daily Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.length > 0 ? (
                  sortedDates.slice(0, 20).map((date, index) => {
                    const dateRecords = groupedRecords[date];
                    const { amTimeIn, amTimeOut, amStatus, pmTimeIn, pmTimeOut, pmStatus, combinedStatus, remarks } = getAMPMEntriesWithStatus(dateRecords);
                    
                    return (
                      <tr key={date} className={combinedStatus === 'Late' || combinedStatus === 'Under Time' ? 'late-row' : ''}>
                        <td>{index + 1}</td>
                        <td>{date}</td>
                        <td className="time-cell">{amTimeIn}</td>
                        <td className="time-cell">{amTimeOut}</td>
                        <td className="status-cell">{getStatusBadgeSimple(amStatus)}</td>
                        <td className="time-cell">{pmTimeIn}</td>
                        <td className="time-cell">{pmTimeOut}</td>
                        <td className="status-cell">{getStatusBadgeSimple(pmStatus)}</td>
                        <td>{getAttendanceStatusBadge(combinedStatus)}</td>
                        <td style={{ fontSize: '12px', color: '#666' }}>{remarks || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="empty-state">
                      <p>No attendance records found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {attendanceRecords.length > 20 && (
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#888' }}>
              Showing last 20 days. 
            </div>
          )}
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
            <em>Entry #1 = AM, Entry #2 = PM | Daily status determined by PM (if exists), otherwise AM</em>
          </div>
        </div>
      </div>
    );
  };

  // ====== FETCH LEAVE BALANCES ======
  const fetchLeaveBalances = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'leaveBalances'));
      const balances = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        balances[data.employeeId] = {
          id: doc.id,
          ...data
        };
      });
      setLeaveBalances(balances);
      return balances;
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      return {};
    }
  };

  // ====== FETCH MGDH DATA WITH DEPARTMENT ORGANIZATION ======
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

      console.log(`👤 MGDH User: ${userName}, Department: ${userDepartment}`);

      // Fetch MGDH employee data for attendance
      await fetchMgdhEmployeeData(user.email);

      // Get ALL users from users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setSystemUsers(allUsers);

      // Get ALL employees from employees collection
      const empSnapshot = await getDocs(collection(db, 'employees'));
      const allEmployeesData = empSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setAllEmployees(allEmployeesData);

      // Fetch leave balances
      const balances = await fetchLeaveBalances();

      console.log(`Total users: ${allUsers.length}, Total employees: ${allEmployeesData.length}`);

      // ====== ORGANIZE EMPLOYEES BY DEPARTMENT ======
      let teamList = [];
      
      if (userDepartment && userDepartment.trim() !== '') {
        // Find employees from the same department
        const departmentEmployees = allEmployeesData.filter(emp => 
          emp.department === userDepartment || 
          emp.dept === userDepartment ||
          (emp.department && emp.department.toLowerCase() === userDepartment.toLowerCase())
        );
        
        // Also check users with the same department
        const departmentUsers = allUsers.filter(u => 
          (u.department === userDepartment || u.dept === userDepartment) &&
          u.id !== userId
        );
        
        // Combine and deduplicate
        const combinedTeam = [...departmentEmployees, ...departmentUsers];
        const uniqueTeam = combinedTeam.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        
        // Remove the MGDH themselves from the team list
        teamList = uniqueTeam.filter(member => member.id !== userId);
        
        console.log(`Found ${teamList.length} team members in department: ${userDepartment}`);
      } else {
        // If no department, show all employees except the MGDH
        teamList = allEmployeesData.filter(emp => emp.id !== userId);
        // Also add users that don't have employee records but have accounts
        const usersWithoutEmployees = allUsers.filter(u => 
          u.id !== userId && 
          !allEmployeesData.some(e => e.id === u.id)
        );
        teamList = [...teamList, ...usersWithoutEmployees];
        console.warn('MGDH user has no department assigned. Showing all users.');
      }
      
      // Enhance team members with leave balance data
      const teamWithBalances = teamList.map(member => ({
        ...member,
        leaveBalance: getEmployeeLeaveBalance(member.id, balances)
      }));
      
      setTeamMembers(teamWithBalances);
      setTotalEmployees(teamList.length);
      
      // Store team member IDs for filtering
      const teamIds = teamList.map(member => member.id);
      setTeamMemberIds(teamIds);

      // Get all departments with user counts
      const deptMap = {};
      allUsers.forEach(u => {
        const dept = u.department || u.dept || 'Unknown';
        if (!deptMap[dept]) deptMap[dept] = 0;
        deptMap[dept]++;
      });
      
      const deptList = Object.keys(deptMap).map(dept => ({
        id: dept,
        name: dept,
        userCount: deptMap[dept]
      }));
      setDepartments(deptList);

      // Get leave requests for team members
      const leaveSnapshot = await getDocs(collection(db, 'leaveRequests'));
      const allLeaves = leaveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter leaves for team members only
      let teamLeaves = [];
      if (teamIds.length > 0) {
        teamLeaves = allLeaves.filter(leave => teamIds.includes(leave.employeeId));
      } else {
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
        const notifQuery = query(
          collection(db, 'notifications'), 
          where('department', '==', userDepartment)
        );
        const notifSnapshot = await getDocs(notifQuery);
        allNotifs = notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        const notifSnapshot = await getDocs(collection(db, 'notifications'));
        allNotifs = notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const mgdhNotifs = allNotifs.filter(notif => 
        notif.forMGDH === true || 
        notif.type === 'leave_request' ||
        notif.type === 'leave_action_confirmation' ||
        notif.type === 'leave_cancelled'
      );
      
      setAllNotifications(mgdhNotifs);

      const nameQuery = query(
        collection(db, 'notifications'),
        where('reviewedBy', '==', userName)
      );
      const nameSnapshot = await getDocs(nameQuery);
      const nameNotifs = nameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const combinedNotifs = [...mgdhNotifs, ...nameNotifs];
      const uniqueNotifs = combinedNotifs.filter((notif, index, self) => 
        index === self.findIndex(n => n.id === notif.id)
      );
      
      setAllNotifications(uniqueNotifs);

      const unreadNotifs = uniqueNotifs.filter(n => !n.read);
      if (unreadNotifs.length > 0) {
        const latest = unreadNotifs[0];
        setLatestNotification(latest);
        setShowNotificationAlert(true);
        
        if (Notification.permission === 'granted') {
          new Notification('New Notification', {
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

  // ====== REALTIME LISTENERS ======
  const setupRealtimeListeners = () => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to all changes - this will auto-update when new users register
    const collections = ['users', 'employees', 'leaveRequests', 'attendance', 'documents', 'notifications', 'leaveBalances'];
    collections.forEach(collectionName => {
      onSnapshot(collection(db, collectionName), () => {
        console.log(`${collectionName} collection changed, refreshing MGDH data...`);
        fetchMGDHData();
      });
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

      // Check if employee has enough leave balance before approving
      if (action === 'approve') {
        const balance = getEmployeeLeaveBalance(leaveData.employeeId);
        let availableBalance = 0;
        switch(leaveData.type) {
          case 'Vacation': availableBalance = balance.vacationLeave; break;
          case 'Sick': availableBalance = balance.sickLeave; break;
          case 'Maternity': availableBalance = balance.maternityLeave; break;
          case 'Paternity': availableBalance = balance.paternityLeave; break;
          default: availableBalance = 0;
        }
        
        if (leaveData.days > availableBalance) {
          alert(`❌ Insufficient leave credits!\n${leaveData.employeeName || 'Employee'} has only ${availableBalance} ${leaveData.type} leave days available.\nRequested: ${leaveData.days} days.\nPlease reject this request or ask the employee to adjust.`);
          setProcessingAction(false);
          return;
        }
      }

      const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
      
      await updateDoc(doc(db, 'leaveRequests', leaveId), { 
        status: newStatus,
        reviewedBy: userName,
        reviewedAt: new Date().toISOString()
      });

      // If approved, deduct leave balance
      if (action === 'approve') {
        const balance = leaveBalances[leaveData.employeeId];
        if (balance && balance.id) {
          const updates = {};
          switch(leaveData.type) {
            case 'Vacation': updates.vacationLeave = (balance.vacationLeave || 0) - leaveData.days; break;
            case 'Sick': updates.sickLeave = (balance.sickLeave || 0) - leaveData.days; break;
            case 'Maternity': updates.maternityLeave = (balance.maternityLeave || 0) - leaveData.days; break;
            case 'Paternity': updates.paternityLeave = (balance.paternityLeave || 0) - leaveData.days; break;
            default: break;
          }
          await updateDoc(doc(db, 'leaveBalances', balance.id), {
            ...updates,
            updatedAt: new Date().toISOString()
          });
          
          // Update local state
          const updatedBalances = { ...leaveBalances };
          if (updatedBalances[leaveData.employeeId]) {
            updatedBalances[leaveData.employeeId] = {
              ...updatedBalances[leaveData.employeeId],
              ...updates,
              updatedAt: new Date().toISOString()
            };
            setLeaveBalances(updatedBalances);
          }
        }
      }

      await addDoc(collection(db, 'notifications'), {
        employeeId: leaveData.employeeId,
        employeeName: leaveData.employeeName || 'Employee',
        department: department || leaveData.department || '',
        leaveId: leaveId,
        leaveType: leaveData.type,
        leaveDays: leaveData.days,
        status: newStatus,
        reviewedBy: userName,
        message: `📋 Your ${leaveData.type} leave request for ${leaveData.days} days has been ${newStatus.toLowerCase()} by ${userName}.${action === 'approve' ? ` ${leaveData.days} ${leaveData.type} days deducted.` : ''}`,
        type: 'leave_action',
        read: false,
        forEmployee: true,
        forMGDH: false,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        employeeId: leaveData.employeeId,
        employeeName: leaveData.employeeName || 'Employee',
        department: department || leaveData.department || '',
        leaveId: leaveId,
        leaveType: leaveData.type,
        leaveDays: leaveData.days,
        status: newStatus,
        reviewedBy: userName,
        message: `✅ ${leaveData.employeeName || 'Employee'}'s ${leaveData.type} leave request was ${newStatus.toLowerCase()} by ${userName}.${action === 'approve' ? ` ${leaveData.days} ${leaveData.type} days deducted.` : ''}`,
        type: 'leave_action_confirmation',
        read: false,
        forEmployee: false,
        forMGDH: true,
        createdAt: new Date().toISOString()
      });

      alert(`Leave request ${newStatus.toLowerCase()} successfully!\n${action === 'approve' ? `✅ ${leaveData.days} ${leaveData.type} days deducted.` : ''}\nEmployee has been notified.`);
      
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
    if (emp) return emp.fullName || emp.name || 'Unknown';
    const user = systemUsers.find(u => u.id === employeeId);
    return user ? user.name || user.fullName || 'Unknown' : 'Unknown';
  };

  const getEmployeePosition = (employeeId) => {
    const emp = teamMembers.find(e => e.id === employeeId);
    if (emp) return emp.position || 'N/A';
    const user = systemUsers.find(u => u.id === employeeId);
    return user ? user.position || 'N/A' : 'N/A';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = teamMembers.find(e => e.id === employeeId);
    if (emp) return emp.department || emp.dept || 'N/A';
    const user = systemUsers.find(u => u.id === employeeId);
    return user ? user.department || user.dept || 'N/A' : 'N/A';
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

  // ====== VIEW EMPLOYEE BALANCE ======
  const viewEmployeeBalance = (employeeId) => {
    const emp = teamMembers.find(e => e.id === employeeId) || allEmployees.find(e => e.id === employeeId);
    const balance = getEmployeeLeaveBalance(employeeId);
    setSelectedEmployeeBalance({
      name: emp?.fullName || emp?.name || getEmployeeName(employeeId),
      department: emp?.department || emp?.dept || getEmployeeDepartment(employeeId) || 'N/A',
      position: emp?.position || 'N/A',
      ...balance
    });
    setShowBalanceModal(true);
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
          onClick={() => { setActiveTab('attendance'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'attendance' ? 'active' : ''}`}
        >
          <AccessTimeIcon style={{ fontSize: 20, marginRight: 12 }} />
          Attendance
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
            pendingLeaves.slice(0, 4).map(leave => {
              const balance = getEmployeeLeaveBalance(leave.employeeId);
              let availableBalance = 0;
              switch(leave.type) {
                case 'Vacation': availableBalance = balance.vacationLeave; break;
                case 'Sick': availableBalance = balance.sickLeave; break;
                case 'Maternity': availableBalance = balance.maternityLeave; break;
                case 'Paternity': availableBalance = balance.paternityLeave; break;
                default: availableBalance = 0;
              }
              const hasEnoughCredits = leave.days <= availableBalance;
              
              return (
                <div key={leave.id} className="pending-item">
                  <div className="pending-info">
                    <span className="pending-name">{getEmployeeName(leave.employeeId)}</span>
                    <span className="pending-type">{getLeaveTypeIcon(leave.type)} {leave.type}</span>
                    <span className="pending-days">{leave.days} days</span>
                    <span className={`pending-balance ${hasEnoughCredits ? 'sufficient' : 'insufficient'}`} 
                      style={{ fontSize: '11px', marginLeft: '8px' }}>
                      Balance: {availableBalance} days
                      {!hasEnoughCredits && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>⚠️</span>}
                    </span>
                  </div>
                  <div className="pending-actions">
                    <button 
                      onClick={() => handleLeaveAction(leave.id, 'approve')}
                      className="btn-approve"
                      disabled={processingAction || !hasEnoughCredits}
                      title={!hasEnoughCredits ? 'Insufficient leave credits' : 'Approve'}
                      style={{ opacity: !hasEnoughCredits ? 0.5 : 1 }}
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
                    <button 
                      onClick={() => viewEmployeeBalance(leave.employeeId)}
                      className="btn-view-balance"
                      title="View Leave Balance"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#4a6fa5',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <BalanceIcon style={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              );
            })
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="stats-badge">{pendingLeaves.length} pending</span>
        </div>
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
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allLeaveRequests.map(leave => {
              const balance = getEmployeeLeaveBalance(leave.employeeId);
              let availableBalance = 0;
              switch(leave.type) {
                case 'Vacation': availableBalance = balance.vacationLeave; break;
                case 'Sick': availableBalance = balance.sickLeave; break;
                case 'Maternity': availableBalance = balance.maternityLeave; break;
                case 'Paternity': availableBalance = balance.paternityLeave; break;
                default: availableBalance = 0;
              }
              const hasEnoughCredits = leave.days <= availableBalance;
              
              return (
                <tr key={leave.id} className={leave.status === 'Pending' ? 'pending-row' : ''}>
                  <td>{getEmployeeName(leave.employeeId)}</td>
                  <td>{getEmployeePosition(leave.employeeId)}</td>
                  <td>{getLeaveTypeIcon(leave.type)} {leave.type}</td>
                  <td>{leave.startDate} → {leave.endDate}</td>
                  <td>{leave.days}</td>
                  <td>
                    <span style={{ 
                      color: getBalanceColor(availableBalance),
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {availableBalance} days
                      {!hasEnoughCredits && leave.status === 'Pending' && (
                        <WarningIcon style={{ fontSize: 16, color: '#e74c3c' }} title="Insufficient credits" />
                      )}
                      <button 
                        onClick={() => viewEmployeeBalance(leave.employeeId)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#4a6fa5',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                        title="View Full Balance"
                      >
                        <BalanceIcon style={{ fontSize: 16 }} />
                      </button>
                    </span>
                  </td>
                  <td>{getStatusBadge(leave.status)}</td>
                  <td>
                    {leave.status === 'Pending' && (
                      <div className="action-group">
                        <button 
                          onClick={() => handleLeaveAction(leave.id, 'approve')}
                          className="btn-action approve"
                          disabled={processingAction || !hasEnoughCredits}
                          style={{ opacity: !hasEnoughCredits ? 0.5 : 1 }}
                          title={!hasEnoughCredits ? `Insufficient credits (${availableBalance} available)` : 'Approve'}
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
              );
            })}
            {allLeaveRequests.length === 0 && (
              <tr><td colSpan="8" className="empty-state">No leave requests found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Team Overview Content with Leave Balances
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
          const balance = getEmployeeLeaveBalance(member.id);
          const totalBalance = (balance.vacationLeave || 0) + (balance.sickLeave || 0);

          return (
            <div key={member.id} className="team-member-card">
              <div className="member-avatar">
                {member.fullName?.charAt(0) || member.name?.charAt(0) || '?'}
              </div>
              <div className="member-info">
                <h4>{member.fullName || member.name || 'Unknown'}</h4>
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
              <div className="member-balance" style={{ 
                marginTop: '8px', 
                padding: '8px 12px', 
                background: '#f0f4fe', 
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                fontSize: '12px'
              }}>
                <span style={{ fontWeight: '600', color: '#1a2a4a' }}>
                  <BalanceIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                  Leave Balance:
                </span>
                <span>
                  <span style={{ color: getBalanceColor(balance.vacationLeave) }}>VL: {balance.vacationLeave}</span>
                  <span style={{ color: getBalanceColor(balance.sickLeave), marginLeft: '8px' }}>SL: {balance.sickLeave}</span>
                  {balance.maternityLeave > 0 && (
                    <span style={{ color: getBalanceColor(balance.maternityLeave), marginLeft: '8px' }}>ML: {balance.maternityLeave}</span>
                  )}
                  {balance.paternityLeave > 0 && (
                    <span style={{ color: getBalanceColor(balance.paternityLeave), marginLeft: '8px' }}>PL: {balance.paternityLeave}</span>
                  )}
                  <button 
                    onClick={() => viewEmployeeBalance(member.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#4a6fa5',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      marginLeft: '4px'
                    }}
                    title="View Full Balance"
                  >
                    <VisibilityIcon style={{ fontSize: 14 }} />
                  </button>
                </span>
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

  // ====== BALANCE MODAL ======
  const renderBalanceModal = () => {
    if (!showBalanceModal || !selectedEmployeeBalance) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowBalanceModal(false)}>
        <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h3>
              <BalanceIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
              Leave Balance
            </h3>
            <button className="modal-close" onClick={() => setShowBalanceModal(false)}>
              <CloseIcon />
            </button>
          </div>
          <div style={{ padding: '10px 0' }}>
            <div style={{ 
              background: '#f8fafd', 
              padding: '16px', 
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '18px' }}>
                {selectedEmployeeBalance.name}
              </p>
              <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
                <BusinessIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                {selectedEmployeeBalance.department} | {selectedEmployeeBalance.position}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ 
                background: '#d4edda', 
                padding: '14px', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#155724', textTransform: 'uppercase' }}>
                  <BeachAccessIcon style={{ fontSize: 14, verticalAlign: 'middle' }} /> Vacation
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>
                  {selectedEmployeeBalance.vacationLeave || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#155724' }}>days</div>
              </div>
              <div style={{ 
                background: '#fff3cd', 
                padding: '14px', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#856404', textTransform: 'uppercase' }}>
                  <SickIcon style={{ fontSize: 14, verticalAlign: 'middle' }} /> Sick
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>
                  {selectedEmployeeBalance.sickLeave || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#856404' }}>days</div>
              </div>
              <div style={{ 
                background: '#cce5ff', 
                padding: '14px', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#004085', textTransform: 'uppercase' }}>
                  <ChildCareIcon style={{ fontSize: 14, verticalAlign: 'middle' }} /> Maternity
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#004085' }}>
                  {selectedEmployeeBalance.maternityLeave || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#004085' }}>days</div>
              </div>
              <div style={{ 
                background: '#d1ecf1', 
                padding: '14px', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#0c5460', textTransform: 'uppercase' }}>
                  <ManIcon style={{ fontSize: 14, verticalAlign: 'middle' }} /> Paternity
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0c5460' }}>
                  {selectedEmployeeBalance.paternityLeave || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#0c5460' }}>days</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f4fe', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#4a6fa5' }}>
                💡 Employee can file leave if they have sufficient credits
              </p>
            </div>
          </div>
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
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'leave' && renderLeaveManagement()}
        {activeTab === 'team' && renderTeamOverview()}
        {activeTab === 'notifications' && renderNotifications()}
      </div>

      {renderBalanceModal()}
    </div>
  );
}

export default MGDHDashboard;