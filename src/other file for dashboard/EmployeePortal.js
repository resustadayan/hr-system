// src/other file for dashboard/EmployeePortal.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
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
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TimelineIcon from '@mui/icons-material/Timeline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkunreadIcon from '@mui/icons-material/Markunread';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PrintIcon from '@mui/icons-material/Print';
import WarningIcon from '@mui/icons-material/Warning';
import logo from '../assets/hrmo logo.jpg';

// Late deduction rate (matches Payroll.js)
const LATE_DEDUCTION_RATE = 500; // ₱500 per late day

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
  const [previewFile, setPreviewFile] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

  // ====== PAYSLIP STATES ======
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

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
  const [officeEndTime, setOfficeEndTime] = useState('5:00');
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0
  });

  // ====== PAYROLL STATES ======
  const [employeePayroll, setEmployeePayroll] = useState(null);
  const [employeeLateDays, setEmployeeLateDays] = useState(0);
  const [employeeLateDeduction, setEmployeeLateDeduction] = useState(0);
  const [allPayrollHistory, setAllPayrollHistory] = useState([]);

  // ====== SMART FILE VIEWER WITH IMAGE FIX ======
  const openFileViewer = (fileUrl, fileName) => {
    if (!fileUrl) return;
    
    const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    if (imageExtensions.includes(extension)) {
      fetch(fileUrl)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head>
                  <title>${fileName || 'Image'}</title>
                  <style>
                    body { margin: 0; padding: 0; height: 100vh; display: flex; justify-content: center; align-items: center; background: #f5f5f5; }
                    img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                  </style>
                </head>
                <body>
                  <img src="${blobUrl}" alt="${fileName || 'Image'}" />
                </body>
              </html>
            `);
            newWindow.document.close();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
          }
        })
        .catch(() => {
          window.open(fileUrl, '_blank');
        });
      return;
    }
    
    if (extension === 'pdf') {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      window.open(viewerUrl, '_blank');
      return;
    }
    
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    if (officeExtensions.includes(extension)) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      window.open(viewerUrl, '_blank');
      return;
    }
    
    const textExtensions = ['txt', 'csv', 'json', 'xml', 'log'];
    if (textExtensions.includes(extension)) {
      window.open(fileUrl, '_blank');
      return;
    }
    
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    window.open(viewerUrl, '_blank');
  };

  // DEBUG: Check if token loads
  useEffect(() => {
    const token = process.env.REACT_APP_BLOB_READ_WRITE_TOKEN;
    console.log('TOKEN CHECK:');
    console.log('Token exists:', !!token);
    console.log('Token length:', token?.length || 0);
    if (token) {
      console.log('Token preview:', token.substring(0, 15) + '...');
    } else {
      console.error('TOKEN NOT FOUND! Check your .env file.');
    }
  }, []);

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
  }, []);

  // ====== FETCH EMPLOYEE PAYROLL ======
  const fetchEmployeePayroll = async () => {
    if (!employee) return;
    
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const payrollQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', employee.id),
        where('periodStart', '==', startDate),
        where('periodEnd', '==', endDate)
      );
      const payrollSnapshot = await getDocs(payrollQuery);
      
      if (!payrollSnapshot.empty) {
        const payrollData = payrollSnapshot.docs[0].data();
        setEmployeePayroll(payrollData);
        setEmployeeLateDays(payrollData.lateDays || 0);
        setEmployeeLateDeduction(payrollData.lateDeduction || 0);
      } else {
        setEmployeePayroll(null);
        setEmployeeLateDays(0);
        setEmployeeLateDeduction(0);
      }

      // Fetch all payroll history for this employee
      const allPayrollQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', employee.id)
      );
      const allPayrollSnapshot = await getDocs(allPayrollQuery);
      const history = allPayrollSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by periodStart (newest first)
      history.sort((a, b) => b.periodStart?.localeCompare(a.periodStart) || 0);
      setAllPayrollHistory(history);

    } catch (error) {
      console.error('Error fetching payroll:', error);
    }
  };

  // ====== FETCH EMPLOYEE DATA ======
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

        // ====== FETCH EMPLOYEE PAYROLL ======
        await fetchEmployeePayroll();

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

        // ====== SETUP REALTIME LISTENERS AFTER DATA IS LOADED ======
        setTimeout(() => {
          setupRealtimeListeners();
        }, 300);
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

      const allQuery = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId)
      );
      const allSnapshot = await getDocs(allQuery);
      const records = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records);

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

      const status = timeInStr <= officeStartTime ? 'On Time' : 'Late';

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
      
      await updateDoc(doc(db, 'attendance', todayAttendance.id), {
        timeOut: timeOutStr,
        updatedAt: new Date().toISOString()
      });

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

  // ====== SETUP REALTIME LISTENERS ======
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

    // Only set up these listeners if employee exists
    if (employee && employee.id) {
      const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', '==', employee.id));
      onSnapshot(leaveQuery, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaveRequests(requests);
      });

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

      // ====== PAYROLL REAL-TIME LISTENER ======
      const payrollQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', employee.id)
      );
      onSnapshot(payrollQuery, () => {
        console.log('🔄 Payroll data changed, refreshing...');
        fetchEmployeePayroll();
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

  // ====== UPLOAD TO VERCEL BLOB ======
  const uploadToVercelBlob = async (file, employeeId, documentType) => {
    try {
      const token = process.env.REACT_APP_BLOB_READ_WRITE_TOKEN;
      
      if (!token) {
        throw new Error('Vercel Blob token not found');
      }

      const storeId = 'store_ynMAP2Iw8PKPFAn8';
      
      const timestamp = Date.now();
      const fileName = `${employeeId}_${documentType}_${timestamp}_${file.name}`;
      const blobPath = `${employeeId}/${documentType}/${fileName}`;

      const url = `https://blob.vercel-storage.com/${storeId}/${blobPath}`;

      console.log('📤 Uploading to:', url);
      console.log('📄 File:', file.name, file.size, 'bytes');

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', response.status, errorText);
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      const finalUrl = responseData.url || url;

      console.log('✅ Upload successful! URL:', finalUrl);

      return {
        success: true,
        url: finalUrl,
        path: blobPath,
        downloadUrl: finalUrl,
      };
    } catch (error) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ====== TEST FUNCTION ======
  const testUpload = async () => {
    try {
      const token = process.env.REACT_APP_BLOB_READ_WRITE_TOKEN;
      if (!token) {
        alert('❌ Token not found! Check .env file');
        return;
      }

      console.log('🧪 Testing upload with token:', token.substring(0, 15) + '...');
      
      setUploadStatus('Testing Vercel Blob...');
      setUploading(true);

      const testContent = `Test file created at ${new Date().toISOString()}`;
      const testFile = new File([testContent], `test_${Date.now()}.txt`, { type: 'text/plain' });
      
      const result = await uploadToVercelBlob(testFile, 'test', 'test');
      
      if (result.success) {
        console.log('✅ Test successful:', result);
        alert('✅ Test successful!\nURL: ' + result.url);
        setUploadStatus('✅ Test successful!');
      } else {
        throw new Error(result.error);
      }
      
      setUploading(false);
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('❌ Test failed: ' + error.message);
      setUploadStatus('❌ Test failed: ' + error.message);
      setUploading(false);
    }
  };

  // ====== handleDocumentUpload ======
  const handleDocumentUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      alert('Please select a document type and a file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading to Vercel Blob...');

    try {
      const user = auth.currentUser;
      if (!user) {
        alert('You must be logged in to upload');
        setUploading(false);
        return;
      }

      if (!employee || !employee.id) {
        alert('Employee data not found. Please refresh and try again.');
        setUploading(false);
        return;
      }

      const uploadResult = await uploadToVercelBlob(
        selectedFile,
        employee.id,
        selectedDocType
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload to Vercel Blob failed');
      }

      setUploadProgress(50);
      setUploadStatus('Saving to database...');

      await addDoc(collection(db, 'documents'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department || 'N/A',
        documentType: selectedDocType,
        status: 'Pending Review',
        fileUrl: uploadResult.url,
        downloadUrl: uploadResult.downloadUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        storagePath: uploadResult.path,
        storageProvider: 'vercel-blob',
        uploadedAt: new Date().toISOString()
      });

      setUploadProgress(75);
      setUploadStatus('Creating notifications...');

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
      
      navigate('/compliance', { 
        state: { 
          notification: `${employee.fullName} uploaded ${selectedDocType}`,
          employeeId: employee.id,
          timestamp: new Date().toISOString()
        }
      });
      
      fetchEmployeeData();
      setUploading(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
      setUploading(false);
      alert(`Upload failed: ${error.message}`);
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

  // ====== GENERATE PAYSLIP PDF ======
  const generatePayslipPDF = (payrollData) => {
    const payslipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${employee.fullName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: #f5f7fa; 
            padding: 40px; 
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .payslip-container {
            max-width: 800px;
            width: 100%;
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          }
          .payslip-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #4a6fa5;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .payslip-header .title h1 {
            color: #1a2a4a;
            font-size: 28px;
            margin: 0;
          }
          .payslip-header .title p {
            color: #6b7a8f;
            font-size: 14px;
            margin: 4px 0 0;
          }
          .payslip-header .logo {
            text-align: right;
          }
          .payslip-header .logo h3 {
            color: #4a6fa5;
            margin: 0;
          }
          .employee-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafd;
            padding: 16px 20px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .employee-info .info-item {
            display: flex;
            flex-direction: column;
          }
          .employee-info .info-item label {
            font-size: 11px;
            text-transform: uppercase;
            color: #8a9bb5;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          .employee-info .info-item span {
            font-size: 15px;
            font-weight: 600;
            color: #1a2a4a;
          }
          .payslip-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .payslip-table th {
            background: #4a6fa5;
            color: white;
            padding: 12px 16px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
          }
          .payslip-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #eef2f7;
            font-size: 14px;
          }
          .payslip-table tr:last-child td {
            border-bottom: none;
          }
          .payslip-table .amount {
            text-align: right;
            font-weight: 500;
          }
          .payslip-table .total-row {
            background: #f0f4fe;
            font-weight: 700;
          }
          .payslip-table .total-row td {
            font-size: 16px;
          }
          .payslip-table .deduction-row td {
            color: #e74c3c;
          }
          .payslip-footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #eef2f7;
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: #8a9bb5;
          }
          .payslip-footer .status-badge {
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
          }
          .payslip-footer .status-badge.paid {
            background: #e4f5e9;
            color: #27ae60;
          }
          .payslip-footer .status-badge.pending {
            background: #fef0e0;
            color: #e67e22;
          }
          .late-warning {
            background: #fef9f0;
            border-left: 4px solid #e67e22;
            padding: 10px 16px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #856404;
          }
          @media print {
            body { padding: 20px; background: white; }
            .payslip-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="payslip-container">
          <div class="payslip-header">
            <div class="title">
              <h1>PAYSLIP</h1>
              <p>Municipality of Pagbilao, Quezon</p>
            </div>
            <div class="logo">
              <h3>HR System</h3>
              <p style="font-size:12px;color:#8a9bb5;">${payrollData.periodMonth || ''} ${payrollData.periodYear || ''}</p>
            </div>
          </div>

          <div class="employee-info">
            <div class="info-item">
              <label>Employee Name</label>
              <span>${employee.fullName}</span>
            </div>
            <div class="info-item">
              <label>Employee ID</label>
              <span>${employee.id || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Department</label>
              <span>${employee.department || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Position</label>
              <span>${employee.position || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Pay Period</label>
              <span>${payrollData.periodStart || ''} to ${payrollData.periodEnd || ''}</span>
            </div>
            <div class="info-item">
              <label>Status</label>
              <span>
                <span class="status-badge ${payrollData.status === 'Paid' ? 'paid' : 'pending'}">
                  ${payrollData.status || 'Pending'}
                </span>
              </span>
            </div>
          </div>

          ${payrollData.lateDays > 0 ? `
            <div class="late-warning">
              ⚠️ <strong>Late Deduction:</strong> ${payrollData.lateDays} late day(s) detected. 
              Deduction: ₱${payrollData.lateDeduction?.toLocaleString() || '0'}
            </div>
          ` : ''}

          <table class="payslip-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td class="amount">₱${payrollData.basicSalary?.toLocaleString() || '0'}</td>
              </tr>
              ${payrollData.lateDays > 0 ? `
                <tr class="deduction-row">
                  <td>Late Deduction (${payrollData.lateDays} days × ₱${LATE_DEDUCTION_RATE})</td>
                  <td class="amount">-₱${payrollData.lateDeduction?.toLocaleString() || '0'}</td>
                </tr>
              ` : ''}
              ${payrollData.originalDeductions > 0 ? `
                <tr class="deduction-row">
                  <td>Other Deductions</td>
                  <td class="amount">-₱${payrollData.originalDeductions?.toLocaleString() || '0'}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>Net Pay</strong></td>
                <td class="amount"><strong>₱${payrollData.netPay?.toLocaleString() || '0'}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="payslip-footer">
            <div>
              <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
            <div>
              <p>${employee.fullName} - Payslip</p>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(payslipHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert('Please allow popups to download payslip');
    }
  };

  // ====== PREVIEW MODAL ======
  const renderPreviewModal = () => {
    if (!previewFile) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setPreviewFile(false)}>
        <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', padding: '20px' }}>
          <div className="modal-header">
            <h3>{previewFileName || 'Document Preview'}</h3>
            <button className="modal-close" onClick={() => setPreviewFile(false)}>✕</button>
          </div>
          <div style={{ width: '100%', height: '80vh', minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5' }}>
            {previewFileUrl && previewFileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i) ? (
              <img 
                src={previewFileUrl} 
                alt={previewFileName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  fetch(previewFileUrl)
                    .then(res => res.blob())
                    .then(blob => {
                      const blobUrl = URL.createObjectURL(blob);
                      e.target.src = blobUrl;
                    })
                    .catch(() => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                    });
                }}
              />
            ) : (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFileUrl)}&embedded=true`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Document Preview"
              />
            )}
          </div>
        </div>
      </div>
    );
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
          onClick={() => { setActiveTab('payroll'); if(isMobile) setSidebarOpen(false); }}
          className={`sidebar-link ${activeTab === 'payroll' ? 'active' : ''}`}
        >
          <AttachMoneyIcon style={{ fontSize: 20, marginRight: 12 }} />
          My Payroll
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

      {/* Payroll Quick Summary */}
      {employeePayroll && (
        <div className="payroll-quick-summary" style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                <AttachMoneyIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
                This Month's Payroll
              </h3>
              <p style={{ margin: '5px 0 0', fontSize: '14px', color: '#666' }}>
                Net Pay: <strong>{formatCurrency(employeePayroll.netPay)}</strong>
              </p>
              {employeeLateDays > 0 && (
                <p style={{ margin: '2px 0', fontSize: '13px', color: '#e67e22' }}>
                  ⚠️ Late Days: {employeeLateDays} (Deduction: {formatCurrency(employeeLateDeduction)})
                </p>
              )}
              {employeeLateDays === 0 && employeePayroll && (
                <p style={{ margin: '2px 0', fontSize: '13px', color: '#27ae60' }}>
                  ✅ No late deductions this month
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ 
                padding: '8px 16px',
                background: employeeLateDays > 0 ? '#fff3cd' : '#d4edda',
                color: employeeLateDays > 0 ? '#856404' : '#155724',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Basic: {formatCurrency(employeePayroll.basicSalary)}
              </span>
              <span style={{ 
                padding: '8px 16px',
                background: employeeLateDeduction > 0 ? '#f8d7da' : '#e8f0fe',
                color: employeeLateDeduction > 0 ? '#721c24' : '#4a6fa5',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Deductions: {formatCurrency(employeePayroll.totalDeductions || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

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
                {attendanceLoading ? 'Processing...' : 'Time In'}
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
                {attendanceLoading ? 'Processing...' : 'Time Out'}
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
                Day Complete
              </span>
            )}
          </div>
        </div>
      </div>

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
                <button
                  onClick={() => openFileViewer(doc.fileUrl, doc.fileName)}
                  className="btn-view-doc"
                  style={{
                    padding: '4px 12px',
                    background: '#4a6fa5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px'
                  }}
                >
                  <VisibilityIcon style={{ fontSize: 16 }} />
                  View
                </button>
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
                {uploading ? 'Uploading...' : 'Upload File'}
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
            {uploading && uploadProgress > 0 && (
              <div className="progress-bar" style={{ marginTop: '10px' }}>
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${uploadProgress}%`,
                    height: '6px',
                    background: '#4a6fa5',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  {uploadProgress}% uploaded
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ====== NOTIFICATIONS TAB ======
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

  // ====== PAYSLIP MODAL ======
  const renderPayslipModal = () => {
    if (!showPayslipModal || !selectedPayroll) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowPayslipModal(false)}>
        <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh' }}>
          <div className="modal-header">
            <h3>Payslip Details</h3>
            <button className="modal-close" onClick={() => setShowPayslipModal(false)}>✕</button>
          </div>
          <div style={{ padding: '10px 0' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px',
              background: '#f8fafd',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Employee</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{employee.fullName}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Period</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{selectedPayroll.periodStart} → {selectedPayroll.periodEnd}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Department</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{employee.department || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Status</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>
                  <span className={`status-badge ${selectedPayroll.status === 'Paid' ? 'success' : 'warning'}`}>
                    {selectedPayroll.status || 'Pending'}
                  </span>
                </p>
              </div>
            </div>

            {/* Deduction History */}
            <h4 style={{ margin: '16px 0 10px', color: '#1a2a4a' }}>Deduction History</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              background: '#f8fafd',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Basic Salary</label>
                <p style={{ fontWeight: '600', fontSize: '16px', color: '#4a6fa5' }}>
                  ₱{selectedPayroll.basicSalary?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Late Days</label>
                <p style={{ fontWeight: '600', fontSize: '16px', color: selectedPayroll.lateDays > 0 ? '#e67e22' : '#27ae60' }}>
                  {selectedPayroll.lateDays || 0} {selectedPayroll.lateDays > 0 ? '⚠️' : '✅'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Late Deduction</label>
                <p style={{ fontWeight: '600', fontSize: '16px', color: selectedPayroll.lateDeduction > 0 ? '#e74c3c' : '#27ae60' }}>
                  ₱{selectedPayroll.lateDeduction?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Other Deductions</label>
                <p style={{ fontWeight: '600', fontSize: '16px', color: selectedPayroll.originalDeductions > 0 ? '#e67e22' : '#27ae60' }}>
                  ₱{selectedPayroll.originalDeductions?.toLocaleString() || '0'}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #eef2f7', paddingTop: '12px' }}>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Net Pay</label>
                <p style={{ fontWeight: '700', fontSize: '24px', color: '#4a6fa5' }}>
                  ₱{selectedPayroll.netPay?.toLocaleString() || '0'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => generatePayslipPDF(selectedPayroll)}
                className="btn-save"
                style={{
                  background: '#4a6fa5',
                  color: 'white',
                  padding: '10px 24px',
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
                <PrintIcon style={{ fontSize: 18 }} />
                Download Payslip
              </button>
              <button 
                onClick={() => setShowPayslipModal(false)}
                className="btn-cancel"
                style={{
                  background: '#f0f2f7',
                  color: '#2c3e50',
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ====== PAYROLL TAB ======
  const renderPayroll = () => {
    if (!employeePayroll) {
      return (
        <div className="employee-payroll-content">
          <div className="section-header">
            <h2><AttachMoneyIcon style={{ fontSize: 24, marginRight: 10, verticalAlign: 'middle' }} /> My Payroll</h2>
          </div>
          <div className="form-card-modern" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No payroll record found for this month.</p>
            <p style={{ fontSize: '14px', color: '#666' }}>Payroll will be processed at the end of the month.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="employee-payroll-content">
        {renderPayslipModal()}

        <div className="section-header">
          <h2><AttachMoneyIcon style={{ fontSize: 24, marginRight: 10, verticalAlign: 'middle' }} /> My Payroll</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="stats-badge">{employeePayroll.periodMonth} {employeePayroll.periodYear}</span>
            <button 
              onClick={() => {
                setSelectedPayroll(employeePayroll);
                setShowPayslipModal(true);
              }}
              className="btn-add-modern"
              style={{
                background: '#4a6fa5',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <DescriptionIcon style={{ fontSize: 18 }} />
              View Payslip
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card blue">
            <div className="stat-icon"><AttachMoneyIcon style={{ fontSize: 30 }} /></div>
            <div className="stat-info">
              <h3>Basic Salary</h3>
              <p>{formatCurrency(employeePayroll.basicSalary)}</p>
            </div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon"><TrendingDownIcon style={{ fontSize: 30 }} /></div>
            <div className="stat-info">
              <h3>Total Deductions</h3>
              <p>{formatCurrency(employeePayroll.totalDeductions || 0)}</p>
              {employeeLateDays > 0 && (
                <small style={{ color: '#e67e22', display: 'block' }}>
                  {employeeLateDays} late day(s): {formatCurrency(employeeLateDeduction)}
                </small>
              )}
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon"><CheckCircleIcon style={{ fontSize: 30 }} /></div>
            <div className="stat-info">
              <h3>Net Pay</h3>
              <p>{formatCurrency(employeePayroll.netPay)}</p>
            </div>
          </div>
        </div>

        <div className="form-card-modern">
          <h3>Payroll Details</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            padding: '10px 0'
          }}>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Period:</strong></p>
              <p>{employeePayroll.periodStart} to {employeePayroll.periodEnd}</p>
            </div>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Basic Salary:</strong></p>
              <p>{formatCurrency(employeePayroll.basicSalary)}</p>
            </div>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Late Days:</strong></p>
              <p style={{ color: employeeLateDays > 0 ? '#e67e22' : '#27ae60' }}>
                {employeeLateDays > 0 ? `${employeeLateDays} days` : 'None ✅'}
              </p>
            </div>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Late Deduction:</strong></p>
              <p style={{ color: employeeLateDeduction > 0 ? '#e74c3c' : '#27ae60' }}>
                {formatCurrency(employeeLateDeduction)}
              </p>
            </div>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Other Deductions:</strong></p>
              <p style={{ color: employeePayroll.originalDeductions > 0 ? '#e67e22' : '#27ae60' }}>
                {formatCurrency(employeePayroll.originalDeductions || 0)}
              </p>
            </div>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Net Pay:</strong></p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#4a6fa5' }}>
                {formatCurrency(employeePayroll.netPay)}
              </p>
            </div>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Status:</strong></p>
              <span className={`status-badge ${employeePayroll.status === 'Paid' ? 'success' : 'warning'}`}>
                {employeePayroll.status === 'Paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Payroll History */}
        {allPayrollHistory.length > 1 && (
          <div className="form-card-modern" style={{ marginTop: '20px' }}>
            <h3>Payroll History</h3>
            <div className="table-container">
              <table className="payroll-history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafd' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Period</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Basic Salary</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Late Days</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Deductions</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Net Pay</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayrollHistory.map((record, index) => (
                    <tr key={record.id || index} style={{ borderBottom: '1px solid #f0f2f7' }}>
                      <td style={{ padding: '10px 14px' }}>{record.periodMonth} {record.periodYear}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatCurrency(record.basicSalary)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: record.lateDays > 0 ? '#e67e22' : '#27ae60' }}>
                        {record.lateDays || 0}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: record.totalDeductions > 0 ? '#e74c3c' : '#27ae60' }}>
                        {formatCurrency(record.totalDeductions || 0)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', color: '#4a6fa5' }}>
                        {formatCurrency(record.netPay)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span className={`status-badge ${record.status === 'Paid' ? 'success' : 'warning'}`}>
                          {record.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedPayroll(record);
                            setShowPayslipModal(true);
                          }}
                          style={{
                            background: 'transparent',
                            color: '#4a6fa5',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <VisibilityIcon style={{ fontSize: 16 }} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
      {renderPreviewModal()}

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
        {activeTab === 'payroll' && renderPayroll()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
}

export default EmployeePortal;