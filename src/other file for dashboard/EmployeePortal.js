// src/other file for dashboard/EmployeePortal.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useNavigate, Link } from 'react-router-dom';
import { logout } from '../firebase';
import imageCompression from 'browser-image-compression';

// Material-UI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import UploadIcon from '@mui/icons-material/Upload';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckIcon from '@mui/icons-material/Check';
import WarningIcon from '@mui/icons-material/Warning';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkunreadIcon from '@mui/icons-material/Markunread';
import logo from '../assets/hrmo logo.jpg';

function EmployeePortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [employee, setEmployee] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState({ sickLeave: 0, vacationLeave: 0 });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [leaveFormData, setLeaveFormData] = useState({
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [leaveBalanceId, setLeaveBalanceId] = useState(null);
  const [notificationSound, setNotificationSound] = useState(null);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);

  // ====== ATTENDANCE STATES ======
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('Not Timed In');
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timeIn, setTimeIn] = useState(null);
  const [timeOut, setTimeOut] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [officeStartTime, setOfficeStartTime] = useState('08:00');
  const [officeEndTime, setOfficeEndTime] = useState('17:00');
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0
  });

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
    
    const audio = new Audio('/notification.mp3');
    setNotificationSound(audio);
  }, []);

  // Fetch employee data
  useEffect(() => {
    fetchEmployeeData();
    setupRealtimeListeners();
  }, []);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      let empData = null;
      let empId = null;
      let userSalary = null;

      const empQuery = query(collection(db, 'employees'), where('email', '==', user.email));
      const empSnapshot = await getDocs(empQuery);
      
      if (!empSnapshot.empty) {
        empData = { id: empSnapshot.docs[0].id, ...empSnapshot.docs[0].data() };
        empId = empData.id;
      }

      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        const userId = userSnapshot.docs[0].id;
        setUserId(userId);
        userSalary = userData.salary || '';
        
        if (!empData) {
          empData = {
            id: userId,
            fullName: userData.name || userData.fullName || '',
            email: userData.email || user.email,
            department: userData.department || '',
            position: userData.position || '',
            salary: userData.salary || '',
            phone: userData.phone || '',
            dateHired: userData.dateHired || '',
            status: userData.status || 'Active'
          };
          empId = empData.id;
        } else {
          empData.salary = userSalary || empData.salary || '';
        }
      }

      if (empData) {
        setEmployee(empData);

        // Fetch leave balance
        const balanceQuery = query(collection(db, 'leaveBalances'), where('employeeId', '==', empId));
        const balanceSnapshot = await getDocs(balanceQuery);
        if (!balanceSnapshot.empty) {
          const balanceData = balanceSnapshot.docs[0].data();
          const balanceId = balanceSnapshot.docs[0].id;
          setLeaveBalanceId(balanceId);
          setLeaveBalance({ 
            sickLeave: balanceData.sickLeave || 0, 
            vacationLeave: balanceData.vacationLeave || 0 
          });
        } else {
          const defaultBalance = {
            employeeId: empId,
            sickLeave: 15,
            vacationLeave: 15,
            createdAt: new Date().toISOString()
          };
          const newBalanceRef = await addDoc(collection(db, 'leaveBalances'), defaultBalance);
          setLeaveBalanceId(newBalanceRef.id);
          setLeaveBalance({ sickLeave: 15, vacationLeave: 15 });
        }

        // Fetch leave requests
        const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', '==', empId));
        const leaveSnapshot = await getDocs(leaveQuery);
        setLeaveRequests(leaveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch documents
        const docQuery = query(collection(db, 'documents'), where('employeeId', '==', empId));
        const docSnapshot = await getDocs(docQuery);
        setDocuments(docSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // ====== FETCH ATTENDANCE RECORDS ======
        await fetchAttendanceData(empId);

        // Fetch notifications
        const notifQuery = query(
          collection(db, 'notifications'), 
          where('employeeId', '==', empId)
        );
        const notifSnapshot = await getDocs(notifQuery);
        const allNotifs = notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const employeeNotifs = allNotifs.filter(notif => 
          notif.forEmployee === true || 
          notif.type === 'leave_action' ||
          notif.type === 'leave_confirmation' ||
          notif.type === 'compliance_upload_confirmation'
        );
        setNotifications(employeeNotifs);
        
        const unreadLeaveActions = employeeNotifs.filter(n => !n.read && n.type === 'leave_action');
        if (unreadLeaveActions.length > 0) {
          const latest = unreadLeaveActions[0];
          setLatestNotification(latest);
          setShowNotificationAlert(true);
          
          if (notificationSound) {
            notificationSound.play().catch(e => console.log('Sound play failed'));
          }
          
          if (Notification.permission === 'granted') {
            new Notification('📢 Leave Request Update', {
              body: latest.message,
              icon: '/favicon.ico'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ====== ATTENDANCE FUNCTIONS ======
  const fetchAttendanceData = async (empId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's attendance
      const todayQuery = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId),
        where('date', '==', today)
      );
      const todaySnapshot = await getDocs(todayQuery);
      
      if (!todaySnapshot.empty) {
        const todayData = todaySnapshot.docs[0].data();
        const todayId = todaySnapshot.docs[0].id;
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

      // Get all attendance records for summary
      const allQuery = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId)
      );
      const allSnapshot = await getDocs(allQuery);
      const records = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records);

      // Calculate summary for the current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      });

      const totalDays = monthRecords.length;
      const presentDays = monthRecords.filter(r => r.status === 'Present' || r.status === 'On Time').length;
      const lateDays = monthRecords.filter(r => r.status === 'Late').length;
      
      setAttendanceSummary({
        totalDays: totalDays || 0,
        presentDays: presentDays || 0,
        lateDays: lateDays || 0,
        absentDays: Math.max(0, totalDays - presentDays - lateDays)
      });

    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleTimeIn = async () => {
    if (!employee) return;
    
    setAttendanceLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date();
      const timeInStr = currentTime.toTimeString().slice(0, 5);
      
      // Check if already timed in today
      const existingQuery = query(
        collection(db, 'attendance'),
        where('employeeId', '==', employee.id),
        where('date', '==', today)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        alert('You have already timed in today!');
        setAttendanceLoading(false);
        return;
      }

      // Determine status based on office start time
      const status = timeInStr <= officeStartTime ? 'On Time' : 'Late';

      // Add attendance record
      await addDoc(collection(db, 'attendance'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department,
        date: today,
        timeIn: timeInStr,
        timeOut: null,
        status: status,
        recordedAt: new Date().toISOString(),
        timestamp: Timestamp.now()
      });

      // ====== NOTIFICATION FOR ADMIN ======
      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department,
        type: 'attendance_timein',
        message: `${employee.fullName} timed in at ${timeInStr} (${status})`,
        read: false,
        forAdmin: true,
        forEmployee: false,
        createdAt: new Date().toISOString()
      });

      // ====== NOTIFICATION FOR EMPLOYEE ======
      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        type: 'attendance_confirmation',
        message: `You have successfully timed in at ${timeInStr} (${status})`,
        read: false,
        forEmployee: true,
        forAdmin: false,
        createdAt: new Date().toISOString()
      });

      setTimeIn(timeInStr);
      setIsTimedIn(true);
      setAttendanceStatus('Timed In');
      
      // Show success message with status
      const statusEmoji = status === 'On Time' ? '✅' : '⚠️';
      alert(`${statusEmoji} Timed in successfully at ${timeInStr}\nStatus: ${status}`);
      
      await fetchAttendanceData(employee.id);
      
    } catch (error) {
      console.error('Error timing in:', error);
      alert('Failed to time in. Please try again.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleTimeOut = async () => {
    if (!employee || !todayAttendance) return;
    
    setAttendanceLoading(true);
    try {
      const currentTime = new Date();
      const timeOutStr = currentTime.toTimeString().slice(0, 5);
      
      // Update attendance record
      await updateDoc(doc(db, 'attendance', todayAttendance.id), {
        timeOut: timeOutStr,
        updatedAt: new Date().toISOString()
      });

      // ====== NOTIFICATION FOR ADMIN ======
      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department,
        type: 'attendance_timeout',
        message: ` ${employee.fullName} timed out at ${timeOutStr}`,
        read: false,
        forAdmin: true,
        forEmployee: false,
        createdAt: new Date().toISOString()
      });

      // ====== NOTIFICATION FOR EMPLOYEE ======
      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        type: 'attendance_confirmation',
        message: `You have successfully timed out at ${timeOutStr}`,
        read: false,
        forEmployee: true,
        forAdmin: false,
        createdAt: new Date().toISOString()
      });

      setTimeOut(timeOutStr);
      setIsTimedOut(true);
      setAttendanceStatus('Completed');
      
      alert(`Timed out successfully at ${timeOutStr}`);
      
      await fetchAttendanceData(employee.id);
      
    } catch (error) {
      console.error('Error timing out:', error);
      alert('Failed to time out. Please try again.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    const user = auth.currentUser;
    if (!user) return;

    const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
    onSnapshot(userQuery, (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        const userId = snapshot.docs[0].id;
        setUserId(userId);
        
        setEmployee(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            fullName: userData.name || prev.fullName,
            email: userData.email || prev.email,
            department: userData.department || prev.department,
            position: userData.position || prev.position,
            salary: userData.salary || prev.salary || '',
            phone: userData.phone || prev.phone,
            dateHired: userData.dateHired || prev.dateHired,
            status: userData.status || prev.status || 'Active'
          };
        });
      }
    });

    if (employee && employee.id) {
      const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', '==', employee.id));
      onSnapshot(leaveQuery, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaveRequests(requests);
      });

      // Listen for attendance changes
      const attendanceQuery = query(collection(db, 'attendance'), where('employeeId', '==', employee.id));
      onSnapshot(attendanceQuery, () => {
        fetchAttendanceData(employee.id);
      });

      const notifQuery = query(
        collection(db, 'notifications'), 
        where('employeeId', '==', employee.id)
      );
      onSnapshot(notifQuery, (snapshot) => {
        const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const employeeNotifs = allNotifs.filter(notif => 
          notif.forEmployee === true || 
          notif.type === 'leave_action' ||
          notif.type === 'leave_confirmation' ||
          notif.type === 'compliance_upload_confirmation' ||
          notif.type === 'attendance_confirmation'
        );
        
        const previousNotifs = notifications;
        const newNotifs = employeeNotifs.filter(n => 
          !previousNotifs.some(p => p.id === n.id) && !n.read
        );
        
        const newLeaveActions = newNotifs.filter(n => n.type === 'leave_action');
        if (newLeaveActions.length > 0) {
          const latest = newLeaveActions[0];
          setLatestNotification(latest);
          setShowNotificationAlert(true);
          
          if (notificationSound) {
            notificationSound.play().catch(e => console.log('Sound play failed'));
          }
          
          if (Notification.permission === 'granted') {
            new Notification('Leave Request Update', {
              body: latest.message,
              icon: '/favicon.ico'
            });
          }
          
          setTimeout(() => {
            setShowNotificationAlert(false);
          }, 5000);
        }
        
        setNotifications(employeeNotifs);
      });
    }

    const empQuery = query(collection(db, 'employees'), where('email', '==', user.email));
    onSnapshot(empQuery, (snapshot) => {
      if (!snapshot.empty) {
        const empData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setEmployee(prev => {
          if (!prev) return empData;
          return {
            ...prev,
            ...empData,
            salary: prev.salary || empData.salary || ''
          };
        });
      }
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

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveFormData.startDate || !leaveFormData.endDate) {
      alert('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const days = calculateDays(leaveFormData.startDate, leaveFormData.endDate);
      
      const currentBalance = leaveFormData.type === 'Vacation' 
        ? leaveBalance.vacationLeave 
        : leaveBalance.sickLeave;
        
      if (days > currentBalance) {
        alert(`Insufficient ${leaveFormData.type} leave balance. Available: ${currentBalance} days`);
        setSubmitting(false);
        return;
      }

      const leaveRef = await addDoc(collection(db, 'leaveRequests'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        type: leaveFormData.type,
        startDate: leaveFormData.startDate,
        endDate: leaveFormData.endDate,
        days: days,
        reason: leaveFormData.reason || '',
        status: 'Pending',
        department: employee.department,
        dateSubmitted: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department,
        leaveId: leaveRef.id,
        leaveType: leaveFormData.type,
        leaveDays: days,
        message: `${employee.fullName} submitted a ${leaveFormData.type} leave request for ${days} days`,
        type: 'leave_request',
        read: false,
        forMGDH: true,
        forEmployee: false,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        leaveId: leaveRef.id,
        message: `Your ${leaveFormData.type} leave request for ${days} days has been submitted and is pending approval.`,
        type: 'leave_confirmation',
        read: false,
        forEmployee: true,
        forMGDH: false,
        createdAt: new Date().toISOString()
      });

      const updatedBalance = { ...leaveBalance };
      if (leaveFormData.type === 'Vacation') {
        updatedBalance.vacationLeave = currentBalance - days;
      } else {
        updatedBalance.sickLeave = currentBalance - days;
      }

      if (leaveBalanceId) {
        await updateDoc(doc(db, 'leaveBalances', leaveBalanceId), {
          vacationLeave: updatedBalance.vacationLeave,
          sickLeave: updatedBalance.sickLeave,
          updatedAt: new Date().toISOString()
        });
      } else {
        const newBalance = {
          employeeId: employee.id,
          vacationLeave: updatedBalance.vacationLeave,
          sickLeave: updatedBalance.sickLeave,
          createdAt: new Date().toISOString()
        };
        const newBalanceRef = await addDoc(collection(db, 'leaveBalances'), newBalance);
        setLeaveBalanceId(newBalanceRef.id);
      }

      setLeaveBalance(updatedBalance);

      alert(`Leave request submitted successfully!\n${days} ${leaveFormData.type} days deducted.\nYour department head has been notified.`);
      setShowLeaveForm(false);
      setLeaveFormData({ type: 'Vacation', startDate: '', endDate: '', reason: '' });
      
      await fetchEmployeeData();
    } catch (error) {
      console.error('Error submitting leave:', error);
      alert('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId, leaveData) => {
    if (!window.confirm(`Are you sure you want to cancel your ${leaveData.type} leave request?`)) {
      return;
    }

    try {
      if (leaveData.status !== 'Pending') {
        alert('You can only cancel pending leave requests.');
        return;
      }

      await deleteDoc(doc(db, 'leaveRequests', leaveId));

      const currentBalance = leaveData.type === 'Vacation' 
        ? leaveBalance.vacationLeave 
        : leaveBalance.sickLeave;
      
      const updatedBalance = { ...leaveBalance };
      if (leaveData.type === 'Vacation') {
        updatedBalance.vacationLeave = currentBalance + leaveData.days;
      } else {
        updatedBalance.sickLeave = currentBalance + leaveData.days;
      }

      if (leaveBalanceId) {
        await updateDoc(doc(db, 'leaveBalances', leaveBalanceId), {
          vacationLeave: updatedBalance.vacationLeave,
          sickLeave: updatedBalance.sickLeave,
          updatedAt: new Date().toISOString()
        });
      }

      setLeaveBalance(updatedBalance);

      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department,
        leaveId: leaveId,
        leaveType: leaveData.type,
        leaveDays: leaveData.days,
        message: `${employee.fullName} cancelled their ${leaveData.type} leave request (${leaveData.days} days).`,
        type: 'leave_cancelled',
        read: false,
        forMGDH: true,
        forEmployee: false,
        createdAt: new Date().toISOString()
      });

      alert(`Leave request cancelled.\n${leaveData.days} ${leaveData.type} days restored.`);
      
      await fetchEmployeeData();
    } catch (error) {
      console.error('Error cancelling leave:', error);
      alert('Failed to cancel leave request');
    }
  };

  // ====== NOTIFICATION FUNCTIONS ======
  
  // Mark a single notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      setNotifications(prev => 
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
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      for (const notif of unreadNotifs) {
        await updateDoc(doc(db, 'notifications', notif.id), {
          read: true
        });
      }
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setShowNotificationAlert(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Mark all notifications as unread
  const markAllNotificationsAsUnread = async () => {
    try {
      for (const notif of notifications) {
        await updateDoc(doc(db, 'notifications', notif.id), {
          read: false
        });
      }
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: false }))
      );
    } catch (error) {
      console.error('Error marking all notifications as unread:', error);
    }
  };

  const dismissAlert = () => {
    setShowNotificationAlert(false);
    if (latestNotification) {
      markNotificationAsRead(latestNotification.id);
    }
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('File is too large. Maximum size is 10MB.');
      return;
    }

    let processedFile = file;

    if (file.type.startsWith('image/')) {
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };
        processedFile = await imageCompression(file, options);
        setUploadStatus(`Compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (error) {
        console.warn('Compression failed, using original file:', error);
        processedFile = file;
      }
    }

    setSelectedFile(processedFile);
    setUploadProgress(0);
  };

  // ====== FIXED: handleDocumentUpload moved to component level ======
  const handleDocumentUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      alert('Please select a document type and a file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading...');

    try {
      const user = auth.currentUser;
      if (!user) {
        alert('You must be logged in to upload');
        setUploading(false);
        return;
      }

      const fileName = `${employee.id}_${selectedDocType}_${Date.now()}`;
      const storageRef = ref(storage, `documents/${employee.id}/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, selectedFile, {
        contentType: selectedFile.type || 'application/octet-stream',
        customMetadata: {
          uploadedBy: employee.id,
          documentType: selectedDocType,
          employeeName: employee.fullName
        }
      });
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
          setUploadStatus(`Uploading... ${Math.round(progress)}%`);
        },
        (error) => {
          console.error('Upload error:', error);
          setUploadStatus(`Upload failed: ${error.message}`);
          setUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save document with employee info
            await addDoc(collection(db, 'documents'), {
              employeeId: employee.id,
              employeeName: employee.fullName,
              department: employee.department || 'N/A',
              documentType: selectedDocType,
              status: 'Pending Review',
              fileUrl: downloadURL,
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              uploadedAt: new Date().toISOString()
            });

            // Notification for admin with employee info
            await addDoc(collection(db, 'notifications'), {
              type: 'compliance_upload',
              employeeId: employee.id,
              employeeName: employee.fullName,
              department: employee.department || 'N/A',
              documentType: selectedDocType,
              message: `${employee.fullName} from ${employee.department || 'N/A'} uploaded ${selectedDocType} for compliance review`,
              read: false,
              forAdmin: true,
              forEmployee: false,
              createdAt: new Date().toISOString()
            });

            // Confirmation for employee
            await addDoc(collection(db, 'notifications'), {
              type: 'compliance_upload_confirmation',
              employeeId: employee.id,
              message: `Your ${selectedDocType} has been uploaded and is pending review by HR`,
              read: false,
              forEmployee: true,
              forAdmin: false,
              createdAt: new Date().toISOString()
            });

            setUploadProgress(100);
            setUploadStatus('Document uploaded successfully! HR has been notified.');
            setSelectedFile(null);
            setSelectedDocType('');
            setShowUploadForm(false);
            
            // ✅ AUTO-REDIRECT TO COMPLIANCE MONITORING PAGE
            navigate('/compliance-monitoring', { 
              state: { 
                notification: `${employee.fullName} uploaded ${selectedDocType}`,
                employeeId: employee.id,
                timestamp: new Date().toISOString()
              }
            });
            
            fetchEmployeeData();
            setUploading(false);
          } catch (err) {
            console.error('Error saving to Firestore:', err);
            setUploadStatus(`Failed to save: ${err.message}`);
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
      setUploading(false);
    }
  };

  // ====== END OF FIXED handleDocumentUpload ======

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

  const getDocStatusBadge = (status) => {
    switch(status) {
      case 'Complete':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4 }} /> Complete</span>;
      case 'Pending Review':
        return <span className="status-badge warning"><HourglassEmptyIcon style={{ fontSize: 14, marginRight: 4 }} /> Pending</span>;
      case 'Missing':
        return <span className="status-badge danger"><CancelIcon style={{ fontSize: 14, marginRight: 4 }} /> Missing</span>;
      default:
        return <span className="status-badge secondary">{status}</span>;
    }
  };

  const getAttendanceStatusBadge = (status) => {
    switch(status) {
      case 'On Time':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4 }} /> On Time</span>;
      case 'Late':
        return <span className="status-badge warning"><WarningIcon style={{ fontSize: 14, marginRight: 4 }} /> Late</span>;
      case 'Timed In':
        return <span className="status-badge info"><AccessTimeIcon style={{ fontSize: 14, marginRight: 4 }} /> Timed In</span>;
      case 'Completed':
        return <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4 }} /> Completed</span>;
      default:
        return <span className="status-badge secondary">{status}</span>;
    }
  };

  const complianceRate = documents.length > 0 
    ? Math.round((documents.filter(d => d.status === 'Complete').length / documents.length) * 100)
    : 0;

  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === '0' || amount === 0) return '₱0';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  if (loading) {
    return <div className="loading">Loading your portal...</div>;
  }

  if (!employee) {
    return <div className="error">No employee profile found. Please contact HR.</div>;
  }

  const Sidebar = () => (
    <div className={`employee-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-top">
        <img src={logo} alt="LGU Logo" className="sidebar-logo" />
        <h3>HR System</h3>
        <p>Pagbilao LGU</p>
        <div className="user-badge">
          <span className="user-name">{employee.fullName}</span>
          <span className="user-role">{employee.position}</span>
          <span className="user-dept">{employee.department}</span>
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
          <CalendarTodayIcon style={{ fontSize: 20, marginRight: 12 }} />
          Leave Management
          {pendingLeaves > 0 && <span className="badge-count">{pendingLeaves}</span>}
        </button>
        
        <button 
          onClick={() => { setActiveTab('compliance'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'compliance' ? 'active' : ''}`}
        >
          <FolderIcon style={{ fontSize: 20, marginRight: 12 }} />
          My Compliance
        </button>
        
        <button 
          onClick={() => { setActiveTab('notifications'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'notifications' ? 'active' : ''}`}
        >
          <NotificationsIcon style={{ fontSize: 20, marginRight: 12 }} />
          Notifications
          {unreadNotifications > 0 && <span className="badge-count">{unreadNotifications}</span>}
        </button>
        
        <button 
          onClick={() => { setActiveTab('profile'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <PersonIcon style={{ fontSize: 20, marginRight: 12 }} />
          My Profile
        </button>

        <button onClick={handleLogout} className="logout-btn">
          <LogoutIcon style={{ fontSize: 20, marginRight: 12 }} />
          Logout
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="employee-dashboard-content">
      <div className="welcome-header">
        <h1>Welcome, {employee.fullName}</h1>
        <p>Here's your HR overview</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircleIcon /></div>
          <div className="stat-info">
            <h3>Leave Balance</h3>
            <p>{leaveBalance.vacationLeave || 0} VL / {leaveBalance.sickLeave || 0} SL</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HourglassEmptyIcon /></div>
          <div className="stat-info">
            <h3>Pending Leaves</h3>
            <p>{pendingLeaves}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FolderIcon /></div>
          <div className="stat-info">
            <h3>Compliance Rate</h3>
            <p>{complianceRate}%</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><NotificationsIcon /></div>
          <div className="stat-info">
            <h3>Notifications</h3>
            <p>{unreadNotifications}</p>
          </div>
        </div>
      </div>

      {/* Quick Attendance Status */}
      <div className="attendance-quick-status" style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '20px', 
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
              <AccessTimeIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
              Today's Attendance
            </h3>
            <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#666' }}>
              Status: {getAttendanceStatusBadge(attendanceStatus)}
            </p>
            {timeIn && <p style={{ margin: '2px 0', fontSize: '13px', color: '#888' }}>Time In: {timeIn}</p>}
            {timeOut && <p style={{ margin: '2px 0', fontSize: '13px', color: '#888' }}>Time Out: {timeOut}</p>}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!isTimedIn && (
              <button 
                onClick={handleTimeIn} 
                className="btn-time-in"
                disabled={attendanceLoading}
                style={{
                  padding: '10px 24px',
                  background: '#4a6fa5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <LoginIcon style={{ fontSize: 18 }} />
                {attendanceLoading ? 'Processing...' : 'Time In'}
              </button>
            )}
            {isTimedIn && !isTimedOut && (
              <button 
                onClick={handleTimeOut} 
                className="btn-time-out"
                disabled={attendanceLoading}
                style={{
                  padding: '10px 24px',
                  background: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Logout style={{ fontSize: 18 }} />
                {attendanceLoading ? 'Processing...' : 'Time Out'}
              </button>
            )}
            {isTimedIn && isTimedOut && (
              <span style={{ 
                padding: '10px 24px',
                background: '#27ae60',
                color: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircleIcon style={{ fontSize: 18 }} />
                Day Complete
              </span>
            )}
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#888' }}>
          <span>Office Hours: {officeStartTime} - {officeEndTime}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-box">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button onClick={() => { setActiveTab('attendance'); }} className="action-btn blue">
              <AccessTimeIcon style={{ fontSize: 18, marginRight: 8 }} />
              Time In/Out
            </button>
            <button onClick={() => { setActiveTab('leave'); setShowLeaveForm(true); }} className="action-btn green">
              <CalendarTodayIcon style={{ fontSize: 18, marginRight: 8 }} />
              File Leave
            </button>
            <button onClick={() => { setActiveTab('compliance'); setShowUploadForm(true); }} className="action-btn purple">
              <UploadIcon style={{ fontSize: 18, marginRight: 8 }} />
              Upload Document
            </button>
            <button onClick={() => setActiveTab('notifications')} className="action-btn orange">
              <NotificationsIcon style={{ fontSize: 18, marginRight: 8 }} />
              View Notifications
            </button>
          </div>
        </div>

        <div className="dashboard-box">
          <h2>Recent Leave Requests</h2>
          {leaveRequests.slice(0, 3).map(req => (
            <div key={req.id} className="recent-item">
              <span className="recent-type">{req.type}</span>
              <span className="recent-dates">{req.startDate} → {req.endDate}</span>
              {getStatusBadge(req.status)}
            </div>
          ))}
          {leaveRequests.length === 0 && (
            <p className="no-data">No leave requests yet</p>
          )}
        </div>
      </div>
    </div>
  );

  // ====== ATTENDANCE TAB ======
  const renderAttendance = () => (
    <div className="employee-attendance-content">
      <div className="section-header">
        <h2><AccessTimeIcon style={{ fontSize: 24, marginRight: 10, verticalAlign: 'middle' }} /> My Attendance</h2>
        <span className="stats-badge">{new Date().toLocaleDateString()}</span>
      </div>

      {/* Attendance Summary Cards */}
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
          <div className="stat-icon red"><CancelIcon /></div>
          <div className="stat-info">
            <h3>Absent</h3>
            <p>{attendanceSummary.absentDays}</p>
          </div>
        </div>
      </div>

      {/* Today's Attendance */}
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
            {!isTimedIn && (
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
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <LoginIcon style={{ fontSize: 20 }} />
                {attendanceLoading ? 'Processing...' : '⏰ Time In'}
              </button>
            )}
            {isTimedIn && !isTimedOut && (
              <button 
                onClick={handleTimeOut} 
                className="btn-time-out"
                disabled={attendanceLoading}
                style={{
                  padding: '12px 30px',
                  background: '#e67e22',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <Logout style={{ fontSize: 20 }} />
                {attendanceLoading ? 'Processing...' : '🚪 Time Out'}
              </button>
            )}
            {isTimedIn && isTimedOut && (
              <span style={{ 
                padding: '12px 30px',
                background: '#27ae60',
                color: 'white',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <CheckCircleIcon style={{ fontSize: 20 }} />
                ✅ Day Complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="form-card-modern">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TimelineIcon />
          Attendance History
        </h3>
        <div className="table-container">
          <table className="attendance-table-modern">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length > 0 ? (
                [...attendanceRecords]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 20)
                  .map(record => (
                    <tr key={record.id} className={record.status === 'Late' ? 'late-row' : ''}>
                      <td>{record.date}</td>
                      <td className="time-cell">{record.timeIn || '—'}</td>
                      <td className="time-cell">{record.timeOut || '—'}</td>
                      <td>
                        <span className={`status-badge ${record.status === 'On Time' || record.status === 'Present' ? 'success' : 'warning'}`}>
                          {record.status === 'On Time' || record.status === 'Present' ? (
                            <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                          ) : (
                            <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                          )}
                          {record.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">
                    <p>No attendance records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLeave = () => (
    <div className="employee-leave-content">
      <div className="section-header">
        <h2>Leave Management</h2>
        <button onClick={() => setShowLeaveForm(true)} className="btn-add-modern">
          <CalendarTodayIcon style={{ fontSize: 18, marginRight: 8 }} />
          File Leave
        </button>
      </div>

      <div className="leave-balance-card">
        <h3>Your Leave Balance</h3>
        <div className="balance-grid">
          <div className="balance-item">
            <span className="balance-label">Vacation Leave</span>
            <span className="balance-value">{leaveBalance.vacationLeave || 0} days</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">Sick Leave</span>
            <span className="balance-value">{leaveBalance.sickLeave || 0} days</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="leave-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map(req => (
              <tr key={req.id}>
                <td>{req.type}</td>
                <td>{req.startDate} → {req.endDate}</td>
                <td>{req.days}</td>
                <td>{req.reason || '—'}</td>
                <td>{getStatusBadge(req.status)}</td>
                <td>
                  {req.status === 'Pending' && (
                    <button 
                      onClick={() => handleCancelLeave(req.id, req)}
                      className="btn-cancel-leave"
                      title="Cancel Leave Request"
                    >
                      <DeleteIcon style={{ fontSize: 16 }} />
                      Cancel
                    </button>
                  )}
                  {req.status !== 'Pending' && (
                    <span className="no-action">—</span>
                  )}
                </td>
              </tr>
            ))}
            {leaveRequests.length === 0 && (
              <tr><td colSpan="6" className="empty-state">No leave requests found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showLeaveForm && (
        <div className="modal-overlay" onClick={() => setShowLeaveForm(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>File Leave Request</h3>
              <button className="modal-close" onClick={() => setShowLeaveForm(false)}>✕</button>
            </div>
            <form onSubmit={handleLeaveSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Leave Type *</label>
                  <select 
                    value={leaveFormData.type} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, type: e.target.value})}
                    required
                  >
                    <option value="Vacation">Vacation Leave</option>
                    <option value="Sick">Sick Leave</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input 
                    type="date" 
                    value={leaveFormData.startDate} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input 
                    type="date" 
                    value={leaveFormData.endDate} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, endDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Reason</label>
                  <textarea 
                    placeholder="Enter reason for leave"
                    value={leaveFormData.reason} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, reason: e.target.value})}
                    rows="3"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowLeaveForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderCompliance = () => (
    <div className="employee-compliance-content">
      <div className="section-header">
        <h2>My Compliance</h2>
        <button onClick={() => setShowUploadForm(true)} className="btn-add-modern">
          <UploadIcon style={{ fontSize: 18, marginRight: 8 }} />
          Upload Document
        </button>
      </div>

      <div className="compliance-progress-card">
        <div className="progress-header">
          <h3>Compliance Rate</h3>
          <span className="progress-percentage">{complianceRate}%</span>
        </div>
        <div className="progress-bar-large">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${complianceRate}%`,
              background: complianceRate === 100 ? '#27ae60' : '#4a6fa5'
            }}
          />
        </div>
        <p className="progress-text">
          {documents.filter(d => d.status === 'Complete').length} of {documents.length} documents complete
        </p>
      </div>

      <div className="documents-list">
        {documents.map(doc => (
          <div key={doc.id} className="doc-item-card">
            <div className="doc-item-info">
              <span className="doc-item-name">{doc.documentType}</span>
              {getDocStatusBadge(doc.status)}
            </div>
            <div className="doc-item-actions">
              {doc.fileUrl && (
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-view-doc">
                  <VisibilityIcon style={{ fontSize: 16, marginRight: 4 }} />
                  View
                </a>
              )}
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <p className="no-data">No documents found</p>
        )}
      </div>

      {showUploadForm && (
        <div className="modal-overlay" onClick={() => setShowUploadForm(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Document</h3>
              <button className="modal-close" onClick={() => setShowUploadForm(false)}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Document Type</label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="upload-select"
                  required
                >
                  <option value="">Select Document Type</option>
                  <option value="Personal Data Sheet">Personal Data Sheet</option>
                  <option value="Medical Certificate">Medical Certificate</option>
                  <option value="NBI Clearance">NBI Clearance</option>
                  <option value="Performance Evaluation">Performance Evaluation</option>
                  <option value="Licenses">Licenses</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Choose File</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="upload-input"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  required
                />
                {selectedFile && (
                  <span className="file-name">
                    {selectedFile.name} 
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button 
                onClick={handleDocumentUpload} 
                className="btn-save" 
                disabled={uploading || !selectedFile || !selectedDocType}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
            {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
          </div>
        </div>
      )}
    </div>
  );

  // ====== NOTIFICATIONS TAB WITH MARK AS READ/UNREAD ======
  const renderNotifications = () => {
    const sortedNotifications = [...notifications].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return (
      <div className="employee-notifications-content">
        <div className="section-header">
          <h2>Notifications</h2>
          <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {unreadNotifications > 0 && (
              <button 
                onClick={markAllNotificationsAsRead} 
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
            {notifications.length > 0 && (
              <button 
                onClick={markAllNotificationsAsUnread} 
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
            const isLeaveStatus = notif.type === 'leave_action';
            const isApproved = notif.status === 'Approved';
            const isRejected = notif.status === 'Rejected';
            const isConfirmation = notif.type === 'leave_confirmation';
            const isLeaveRequest = notif.type === 'leave_request';
            const isLeaveCancelled = notif.type === 'leave_cancelled';
            const isAttendance = notif.type === 'attendance_confirmation';
            
            let iconColor = '#4a6fa5';
            let IconComponent = NotificationsIcon;
            
            if (isLeaveStatus && isApproved) {
              iconColor = '#27ae60';
              IconComponent = CheckCircleIcon;
            } else if (isLeaveStatus && isRejected) {
              iconColor = '#e74c3c';
              IconComponent = CancelIcon;
            } else if (isConfirmation) {
              iconColor = '#f39c12';
              IconComponent = HourglassEmptyIcon;
            } else if (isLeaveRequest) {
              iconColor = '#4a6fa5';
              IconComponent = CalendarTodayIcon;
            } else if (isLeaveCancelled) {
              iconColor = '#e67e22';
              IconComponent = DeleteIcon;
            } else if (isAttendance) {
              iconColor = '#27ae60';
              IconComponent = CheckCircleIcon;
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

  const renderProfile = () => (
    <div className="employee-profile-content">
      <div className="section-header">
        <h2>My Profile</h2>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          <span>{employee.fullName?.charAt(0) || '?'}</span>
        </div>
        <div className="profile-details">
          <h3>{employee.fullName}</h3>
          <p><BusinessIcon style={{ fontSize: 16, marginRight: 8 }} /> {employee.department}</p>
          <p><WorkIcon style={{ fontSize: 16, marginRight: 8 }} /> {employee.position}</p>
          <p><EmailIcon style={{ fontSize: 16, marginRight: 8 }} /> {employee.email}</p>
          <p><CalendarTodayIcon style={{ fontSize: 16, marginRight: 8 }} /> Hired: {employee.dateHired || 'N/A'}</p>
          <p><AttachMoneyIcon style={{ fontSize: 16, marginRight: 8 }} /> Salary: {formatCurrency(employee.salary)}</p>
          <p><PersonIcon style={{ fontSize: 16, marginRight: 8 }} /> Status: <span className={`status-dot ${employee.status === 'Inactive' ? 'inactive' : 'active'}`}>
            {employee.status || 'Active'}
          </span></p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="employee-portal">
      {/* Notification Alert Banner */}
      {showNotificationAlert && latestNotification && (
        <div className={`notification-alert ${latestNotification.status === 'Approved' ? 'approved' : 'rejected'}`}>
          <div className="alert-content">
            <span className="alert-icon">
              {latestNotification.status === 'Approved' ? '✅' : '❌'}
            </span>
            <span className="alert-message">{latestNotification.message}</span>
            <button onClick={dismissAlert} className="alert-close">×</button>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="mobile-header">
          <button onClick={toggleSidebar} className="menu-btn">
            <MenuIcon />
          </button>
          <span className="mobile-title">HR System</span>
          <span className="mobile-user">{employee.fullName?.charAt(0) || '?'}</span>
        </div>
      )}

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <Sidebar />

      <div className={`employee-main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'leave' && renderLeave()}
        {activeTab === 'compliance' && renderCompliance()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
}

export default EmployeePortal;