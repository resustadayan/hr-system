// src/other file for dashboard/EmployeePortal.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/contexts/AuthContext';
import { logout } from '../firebase';
import imageCompression from 'browser-image-compression';
import html2pdf from 'html2pdf.js';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import GetAppIcon from '@mui/icons-material/GetApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import logo from '../assets/hrmo logo.jpg';

// Late deduction rate (matches Payroll.js)
const LATE_DEDUCTION_RATE = 500;

function EmployeePortal() {
  const navigate = useNavigate();
  const { user: authUser, userRole, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [employee, setEmployee] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState({ sickLeave: 0, vacationLeave: 0, maternityLeave: 0, paternityLeave: 0 });
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
  const [officeStartTime, setOfficeStartTime] = useState('07:00');
  const [officeEndTime, setOfficeEndTime] = useState('06:00');
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    underTimeDays: 0,
    overTimeDays: 0
  });

  // ====== PAYROLL STATES ======
  const [employeePayroll, setEmployeePayroll] = useState(null);
  const [employeeLateDays, setEmployeeLateDays] = useState(0);
  const [employeeLateDeduction, setEmployeeLateDeduction] = useState(0);
  const [allPayrollHistory, setAllPayrollHistory] = useState([]);
  const [payrollSummary, setPayrollSummary] = useState({
    totalEarned: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    totalLateDays: 0,
    totalPayrolls: 0
  });
  const [isRefreshingPayroll, setIsRefreshingPayroll] = useState(false);

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

  // Fetch employee data when auth user changes
  useEffect(() => {
    if (authUser) {
      fetchEmployeeData();
    } else if (!authLoading) {
      navigate('/login');
    }
  }, [authUser, authLoading]);

  // ====== REAL-TIME EMPLOYEE DATA LISTENER ======
  useEffect(() => {
    if (employee && employee.id) {
      const employeeDocRef = doc(db, 'employees', employee.id);
      const unsubscribe = onSnapshot(employeeDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedData = { id: docSnapshot.id, ...docSnapshot.data() };
          setEmployee(updatedData);
          console.log('🔄 Employee data updated in real-time:', updatedData);
          
          if (updatedData.salary !== employee.salary) {
            console.log('💰 Salary updated from', employee.salary, 'to', updatedData.salary);
            fetchEmployeePayroll();
          }
        }
      }, (error) => {
        console.error('Error listening to employee updates:', error);
      });
      
      return () => unsubscribe();
    }
  }, [employee?.id]);

  // ====== REFRESH PAYROLL FUNCTION ======
  const refreshPayrollData = async () => {
    if (!employee) {
      console.log('No employee data available for refresh');
      return;
    }
    setIsRefreshingPayroll(true);
    try {
      await fetchEmployeePayroll();
      console.log('Payroll data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing payroll:', error);
    } finally {
      setIsRefreshingPayroll(false);
    }
  };

  // ====== FETCH EMPLOYEE PAYROLL ======
  const fetchEmployeePayroll = async () => {
    if (!employee) {
      console.log('No employee data available');
      return;
    }
    
    console.log('Fetching payroll for employee ID:', employee.id);
    console.log('Employee data:', employee);
    
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      console.log(`📅 Current period: ${startDate} to ${endDate}`);

      const payrollQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', employee.id),
        where('periodStart', '==', startDate),
        where('periodEnd', '==', endDate)
      );
      const payrollSnapshot = await getDocs(payrollQuery);
      
      console.log(`📊 Found ${payrollSnapshot.size} payroll records for current period`);
      
      if (!payrollSnapshot.empty) {
        const payrollData = payrollSnapshot.docs[0].data();
        console.log('📄 Payroll data:', payrollData);
        setEmployeePayroll(payrollData);
        setEmployeeLateDays(payrollData.lateDays || 0);
        setEmployeeLateDeduction(payrollData.lateDeduction || 0);
      } else {
        console.log('⚠️ No payroll record found for current period');
        setEmployeePayroll(null);
        setEmployeeLateDays(0);
        setEmployeeLateDeduction(0);
      }

      const allPayrollQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', employee.id)
      );
      const allPayrollSnapshot = await getDocs(allPayrollQuery);
      const history = allPayrollSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`📊 Found ${history.length} total payroll records for this employee`);
      
      history.sort((a, b) => b.periodStart?.localeCompare(a.periodStart) || 0);
      setAllPayrollHistory(history);

      const summary = history.reduce((acc, record) => ({
        totalEarned: acc.totalEarned + (record.basicSalary || 0),
        totalDeductions: acc.totalDeductions + (record.totalDeductions || 0),
        totalNetPay: acc.totalNetPay + (record.netPay || 0),
        totalLateDays: acc.totalLateDays + (record.lateDays || 0),
        totalPayrolls: acc.totalPayrolls + 1
      }), { totalEarned: 0, totalDeductions: 0, totalNetPay: 0, totalLateDays: 0, totalPayrolls: 0 });
      
      setPayrollSummary(summary);

    } catch (error) {
      console.error('❌ Error fetching payroll:', error);
    }
  };

  // ====== FETCH EMPLOYEE DATA ======
  const fetchEmployeeData = async () => {
    if (!authUser) {
      console.log('No authenticated user');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Fetching employee data for user:', authUser.email);
      console.log('🔍 User UID:', authUser.uid);

      let empData = null;
      let empId = null;

      const empQuery = query(collection(db, 'employees'), where('email', '==', authUser.email));
      const empSnapshot = await getDocs(empQuery);
      
      console.log('📊 Employees found:', empSnapshot.size);
      
      if (!empSnapshot.empty) {
        const docRef = empSnapshot.docs[0];
        empData = { id: docRef.id, ...docRef.data() };
        empId = docRef.id;
        console.log('✅ Employee found with ID:', empId);
        console.log('📋 Employee data:', empData);
      } else {
        console.log('⚠️ No employee document found for email:', authUser.email);
        
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          empData = {
            id: authUser.uid,
            fullName: userData.name || userData.fullName || authUser.email?.split('@')[0] || 'User',
            email: userData.email || authUser.email,
            department: userData.department || '',
            position: userData.position || '',
            salary: userData.salary || '',
            phone: userData.phone || '',
            dateHired: userData.dateHired || '',
            status: userData.status || 'Active'
          };
          empId = empData.id;
          console.log('Created employee data from user document:', empData);
          
          try {
            await addDoc(collection(db, 'employees'), {
              ...empData,
              createdAt: new Date().toISOString()
            });
            console.log('Employee saved to employees collection');
          } catch (saveError) {
            console.warn('Could not save employee to collection:', saveError);
          }
        } else {
          console.error('No user document found for UID:', authUser.uid);
        }
      }

      if (empData) {
        setEmployee(empData);
        console.log('🎯 Using employee ID for queries:', empId);

        // Fetch leave balance
        const balanceQuery = query(collection(db, 'leaveBalances'), where('employeeId', '==', empId));
        const balanceSnapshot = await getDocs(balanceQuery);
        if (!balanceSnapshot.empty) {
          const balanceData = balanceSnapshot.docs[0].data();
          const balanceId = balanceSnapshot.docs[0].id;
          setLeaveBalanceId(balanceId);
          setLeaveBalance({ 
            sickLeave: balanceData.sickLeave || 0, 
            vacationLeave: balanceData.vacationLeave || 0,
            maternityLeave: balanceData.maternityLeave || 0,
            paternityLeave: balanceData.paternityLeave || 0 
          });
        } else {
          const defaultBalance = {
            employeeId: empId,
            sickLeave: 5,
            vacationLeave: 5,
            maternityLeave: 105,
            paternityLeave: 7,
            createdAt: new Date().toISOString()
          };
          const newBalanceRef = await addDoc(collection(db, 'leaveBalances'), defaultBalance);
          setLeaveBalanceId(newBalanceRef.id);
          setLeaveBalance({ sickLeave: 5, vacationLeave: 5, maternityLeave: 105, paternityLeave: 7 });
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
            new Notification('Leave Request Update', {
              body: latest.message,
              icon: '/favicon.ico'
            });
          }
        }

        // ====== SETUP REALTIME LISTENERS AFTER DATA IS LOADED ======
        setTimeout(() => {
          setupRealtimeListeners();
        }, 300);
      } else {
        console.error('No employee data found!');
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

// Helper function to parse time string to minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

// Helper function to format time from Date object
const formatTime = (date) => {
  if (!date) return null;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const handleTimeIn = async () => {
  if (!employee) return;
  
  setAttendanceLoading(true);
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    const timeInStr = formatTime(currentTime);
    
    // Check existing entries for today
    const existingQuery = query(
      collection(db, 'attendance'),
      where('employeeId', '==', employee.id),
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
      employeeId: employee.id,
      employeeName: employee.fullName,
      department: employee.department,
      date: today,
      timeIn: timeInStr,
      timeOut: null,
      status: status,
      entryNumber: entryNumber,
      recordedAt: new Date().toISOString(),
      timestamp: Timestamp.now()
    });

    await addDoc(collection(db, 'notifications'), {
      employeeId: employee.id,
      employeeName: employee.fullName,
      department: employee.department,
      type: 'attendance_timein',
      message: `${employee.fullName} timed in at ${timeInStr} (${status}) - Entry ${entryNumber}`,
      read: false,
      forAdmin: true,
      forEmployee: false,
      createdAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'notifications'), {
      employeeId: employee.id,
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
    
    await fetchAttendanceData(employee.id);
    
  } catch (error) {
    console.error('Error timing in:', error);
    alert('Failed to time in. Please try again.');
  } finally {
    setAttendanceLoading(false);
  }
};

const handleTimeOut = async () => {
  if (!employee) return;
  
  setAttendanceLoading(true);
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    const timeOutStr = formatTime(currentTime);
    
    // Find the most recent attendance record for today that has timeIn but no timeOut
    const existingQuery = query(
      collection(db, 'attendance'),
      where('employeeId', '==', employee.id),
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
      employeeId: employee.id,
      employeeName: employee.fullName,
      department: employee.department,
      type: 'attendance_timeout',
      message: `${employee.fullName} timed out at ${timeOutStr} (${status})${overtimeMinutes > 0 ? ` (Overtime: ${overtimeMinutes} mins)` : ''}${undertimeMinutes > 0 ? ` (Undertime: ${undertimeMinutes} mins)` : ''}`,
      read: false,
      forAdmin: true,
      forEmployee: false,
      createdAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'notifications'), {
      employeeId: employee.id,
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
    if (!employee || !employee.id) return;

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

    const payrollQuery = query(
      collection(db, 'payroll'),
      where('employeeId', '==', employee.id)
    );
    onSnapshot(payrollQuery, (snapshot) => {
      console.log('Payroll data changed, refreshing...');
      fetchEmployeePayroll();
    }, (error) => {
      console.error('Payroll listener error:', error);
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

  //===leave management====//
  const handleLeaveSubmit = async (e) => {
  e.preventDefault();
  if (!leaveFormData.startDate || !leaveFormData.endDate) {
    alert('Please fill all required fields');
    return;
  }

  setSubmitting(true);
  try {
    const days = calculateDays(leaveFormData.startDate, leaveFormData.endDate);
    
    // Get the correct current balance based on leave type
    const currentBalance = leaveFormData.type === 'Vacation' 
      ? leaveBalance.vacationLeave
      : leaveFormData.type === 'Maternity'
      ? leaveBalance.maternityLeave
      : leaveFormData.type === 'Paternity'
      ? leaveBalance.paternityLeave
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

    // Update balance - using leaveFormData.type (not leaveData)
    const updatedBalance = { ...leaveBalance };
    if (leaveFormData.type === 'Vacation') {
      updatedBalance.vacationLeave = currentBalance - days;
    } else if (leaveFormData.type === 'Maternity') {
      updatedBalance.maternityLeave = currentBalance - days;
    } else if (leaveFormData.type === 'Paternity') {
      updatedBalance.paternityLeave = currentBalance - days;
    } else {
      updatedBalance.sickLeave = currentBalance - days;
    }

    if (leaveBalanceId) {
      await updateDoc(doc(db, 'leaveBalances', leaveBalanceId), {
        vacationLeave: updatedBalance.vacationLeave,
        sickLeave: updatedBalance.sickLeave,
        maternityLeave: updatedBalance.maternityLeave,
        paternityLeave: updatedBalance.paternityLeave,
        updatedAt: new Date().toISOString()
      });
    } else {
      const newBalance = {
        employeeId: employee.id,
        vacationLeave: updatedBalance.vacationLeave,
        sickLeave: updatedBalance.sickLeave,
        maternityLeave: updatedBalance.maternityLeave,
        paternityLeave: updatedBalance.paternityLeave,
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

    // Get the correct current balance based on leaveData.type
    const currentBalance = leaveData.type === 'Vacation' 
      ? leaveBalance.vacationLeave
      : leaveData.type === 'Maternity'
      ? leaveBalance.maternityLeave
      : leaveData.type === 'Paternity'
      ? leaveBalance.paternityLeave
      : leaveBalance.sickLeave;
    
    // Restore days - using leaveData (not leaveFormData)
    const updatedBalance = { ...leaveBalance };
    if (leaveData.type === 'Vacation') {
      updatedBalance.vacationLeave = currentBalance + leaveData.days;
    } else if (leaveData.type === 'Maternity') {
      updatedBalance.maternityLeave = currentBalance + leaveData.days;
    } else if (leaveData.type === 'Paternity') {
      updatedBalance.paternityLeave = currentBalance + leaveData.days;
    } else {
      updatedBalance.sickLeave = currentBalance + leaveData.days;
    }

    if (leaveBalanceId) {
      await updateDoc(doc(db, 'leaveBalances', leaveBalanceId), {
        vacationLeave: updatedBalance.vacationLeave,
        sickLeave: updatedBalance.sickLeave,
        maternityLeave: updatedBalance.maternityLeave,
        paternityLeave: updatedBalance.paternityLeave,
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

  // ====== handleDocumentUpload ======
  const handleDocumentUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      alert('Please select a document type and a file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading File.....');

    try {
      if (!authUser) {
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
        throw new Error(uploadResult.error || 'Upload file failed');
      }

      setUploadProgress(50);
      setUploadStatus('Saving compliance...');

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

  // ====== GENERATE ATTENDANCE PDF (TRUE DOWNLOAD) ======
const generateAttendancePDF = async () => {
  const loadingMsg = document.createElement('div');
  loadingMsg.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; padding: 20px 40px; border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 9999;
    font-size: 18px; font-weight: 600; color: #4a6fa5;
    display: flex; align-items: center; gap: 12px;
  `;
  loadingMsg.innerHTML = `
    <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span>
    Generating attendance report...
  `;
  document.body.appendChild(loadingMsg);

  const sortedRecords = [...attendanceRecords].sort((a, b) => b.date.localeCompare(a.date));

  const attendanceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance Report - ${employee?.fullName || 'Employee'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          background: #f5f7fa; 
          padding: 40px; 
          display: flex;
          justify-content: center;
        }
        .report-container {
          max-width: 1000px;
          width: 100%;
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #4a6fa5;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .report-header .title h1 {
          color: #1a2a4a;
          font-size: 28px;
          margin: 0;
        }
        .report-header .title p {
          color: #6b7a8f;
          font-size: 14px;
          margin: 4px 0 0;
        }
        .report-header .logo h3 {
          color: #4a6fa5;
          margin: 0;
        }
        .report-header .logo p {
          color: #8a9bb5;
          font-size: 12px;
        }
        .employee-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          background: #f8fafd;
          padding: 16px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
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
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .summary-card {
          background: #f8fafd;
          padding: 12px 16px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-card .number {
          font-size: 22px;
          font-weight: 700;
          color: #4a6fa5;
        }
        .summary-card .label {
          font-size: 11px;
          color: #8a9bb5;
          text-transform: uppercase;
        }
        .summary-card.green .number { color: #27ae60; }
        .summary-card.orange .number { color: #e67e22; }
        .summary-card.red .number { color: #e74c3c; }
        .summary-card.purple .number { color: #8e44ad; }
        .summary-card.success .number { color: #2ecc71; }
        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .attendance-table th {
          background: #4a6fa5;
          color: white;
          padding: 10px 14px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
        }
        .attendance-table td {
          padding: 10px 14px;
          border-bottom: 1px solid #eef2f7;
          font-size: 13px;
        }
        .attendance-table tr:nth-child(even) {
          background: #fafbfd;
        }
        .attendance-table .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
        }
        .status-badge.success { background: #d4edda; color: #155724; }
        .status-badge.warning { background: #fff3cd; color: #856404; }
        .status-badge.danger { background: #f8d7da; color: #721c24; }
        .status-badge.info { background: #d1ecf1; color: #0c5460; }
        .status-badge.secondary { background: #e2e3e5; color: #383d41; }
        .status-badge.undertime { background: #fef3cd; color: #856404; }
        .status-badge.overtime { background: #d4edda; color: #155724; }
        .report-footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #eef2f7;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #8a9bb5;
        }
        .report-footer .total-records {
          font-weight: 600;
          color: #4a6fa5;
        }
        @media print {
          body { padding: 20px; background: white; }
          .report-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="report-container" id="report-container">
        <div class="report-header">
          <div class="title">
            <h1>ATTENDANCE REPORT</h1>
            <p>Municipality of Pagbilao, Quezon</p>
          </div>
          <div class="logo">
            <h3>HR Management System</h3>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="employee-info">
          <div class="info-item">
            <label>Employee Name</label>
            <span>${employee?.fullName || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Department</label>
            <span>${employee?.department || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Position</label>
            <span>${employee?.position || 'N/A'}</span>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="number">${attendanceSummary.totalDays}</div>
            <div class="label">Total Days</div>
          </div>
          <div class="summary-card green">
            <div class="number">${attendanceSummary.presentDays || 0}</div>
            <div class="label">Present</div>
          </div>
          <div class="summary-card orange">
            <div class="number">${attendanceSummary.lateDays || 0}</div>
            <div class="label">Late</div>
          </div>
          <div class="summary-card purple">
            <div class="number">${attendanceSummary.underTimeDays || 0}</div>
            <div class="label">Under Time</div>
          </div>
          <div class="summary-card success">
            <div class="number">${attendanceSummary.overTimeDays || 0}</div>
            <div class="label">Over Time</div>
          </div>
          <div class="summary-card red">
            <div class="number">${attendanceSummary.absentDays || 0}</div>
            <div class="label">Absent</div>
          </div>
        </div>

        <table class="attendance-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRecords.map(record => {
              let remarks = '';
              let statusClass = 'secondary';
              if (record.status === 'On Time') {
                statusClass = 'success';
                remarks = 'On time';
              } else if (record.status === 'Late') {
                statusClass = 'warning';
                remarks = 'Late arrival';
              } else if (record.status === 'Under Time') {
                statusClass = 'undertime';
                remarks = record.undertimeMinutes ? `Undertime: ${record.undertimeMinutes} mins` : 'Undertime';
              } else if (record.status === 'Over Time') {
                statusClass = 'overtime';
                remarks = record.overtimeMinutes ? `Overtime: ${record.overtimeMinutes} mins` : 'Overtime';
              } else if (record.status === 'Present') {
                statusClass = 'success';
                remarks = 'Present';
              }
              return `
                <tr>
                  <td>${record.date}</td>
                  <td>${record.timeIn || '—'}</td>
                  <td>${record.timeOut || '—'}</td>
                  <td>
                    <span class="status-badge ${statusClass}">
                      ${record.status || 'Present'}
                    </span>
                  </td>
                  <td>${remarks}</td>
                </tr>
              `;
            }).join('')}
            ${sortedRecords.length === 0 ? `
              <tr>
                <td colspan="5" style="text-align:center; color:#8a9bb5; padding:20px;">
                  No attendance records found
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <div class="report-footer">
          <div>
            <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            <p>Office Hours: ${officeStartTime} - ${officeEndTime}</p>
          </div>
          <div>
            <p class="total-records">Total Records: ${sortedRecords.length}</p>
            <p>${employee?.fullName || 'Employee'} - Attendance Report</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create a temporary container for PDF generation
  const container = document.createElement('div');
  container.innerHTML = attendanceHTML;
  document.body.appendChild(container);

  const element = container.querySelector('.report-container');

  // Generate filename
  const fileName = `Attendance_Report_${employee?.fullName?.replace(/\s/g, '_') || 'Employee'}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Generate PDF and download using html2pdf
  try {
    await html2pdf()
      .set({
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape' 
        }
      })
      .from(element)
      .save();
    
    document.body.removeChild(container);
    document.body.removeChild(loadingMsg);
  } catch (error) {
    console.error('PDF generation failed:', error);
    document.body.removeChild(container);
    document.body.removeChild(loadingMsg);
    alert('Failed to generate PDF. Please try again.');
  }
};

  // ====== GENERATE PAYSLIP PDF (True Download) ======
  const generatePayslipPDF = (payrollData) => {
    // Show loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 20px 40px; border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 9999;
      font-size: 18px; font-weight: 600; color: #4a6fa5;
      display: flex; align-items: center; gap: 12px;
    `;
    loadingMsg.innerHTML = `
      <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span>
      Generating payslip...
    `;
    document.body.appendChild(loadingMsg);

    const payslipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${employee?.fullName || 'Employee'}</title>
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
          .payslip-header .logo p {
            font-size: 12px;
            color: #8a9bb5;
            margin: 2px 0 0;
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
        <div class="payslip-container" id="payslip-container">
          <div class="payslip-header">
            <div class="title">
              <h1>PAYSLIP</h1>
              <p>Municipality of Pagbilao, Quezon</p>
            </div>
            <div class="logo">
              <h3>HR Management System</h3>
              <p>${payrollData.periodMonth || ''} ${payrollData.periodYear || ''}</p>
            </div>
          </div>

          <div class="employee-info">
            <div class="info-item">
              <label>Employee Name</label>
              <span>${employee?.fullName || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Employee ID</label>
              <span>${employee?.id || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Department</label>
              <span>${employee?.department || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Position</label>
              <span>${employee?.position || 'N/A'}</span>
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
                <td class="amount">₱${(payrollData.basicSalary || 0).toLocaleString()}</td>
              </tr>
              ${payrollData.lateDays > 0 ? `
                <tr class="deduction-row">
                  <td>Late Deduction (${payrollData.lateDays} days × ₱${LATE_DEDUCTION_RATE.toLocaleString()})</td>
                  <td class="amount">-₱${(payrollData.lateDeduction || 0).toLocaleString()}</td>
                </tr>
              ` : ''}
              ${(payrollData.originalDeductions || 0) > 0 ? `
                <tr class="deduction-row">
                  <td>Other Deductions</td>
                  <td class="amount">-₱${(payrollData.originalDeductions || 0).toLocaleString()}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>Net Pay</strong></td>
                <td class="amount"><strong>₱${(payrollData.netPay || 0).toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="payslip-footer">
            <div>
              <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
            <div>
              <p>${employee?.fullName || 'Employee'} - Payslip</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = payslipHTML;
    document.body.appendChild(container);

    const element = container.querySelector('.payslip-container');

    // Generate filename
    const fileName = `Payslip_${employee?.fullName?.replace(/\s/g, '_') || 'Employee'}_${payrollData.periodMonth || ''}_${payrollData.periodYear || ''}.pdf`;

    // Generate PDF and download
    html2pdf()
      .set({
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      })
      .from(element)
      .save()
      .then(() => {
        document.body.removeChild(container);
        document.body.removeChild(loadingMsg);
      })
      .catch((error) => {
        console.error('PDF generation failed:', error);
        document.body.removeChild(container);
        document.body.removeChild(loadingMsg);
        alert('Failed to generate PDF. Please try again.');
      });
  };

  // ====== VIEW/PRINT PAYSLIP (Opens print dialog) ======
  const viewPayslip = (payrollData) => {
    const payslipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${employee?.fullName || 'Employee'}</title>
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
          .payslip-header .logo p {
            font-size: 12px;
            color: #8a9bb5;
            margin: 2px 0 0;
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
          .print-btn-container {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #f8fafd;
            border-radius: 8px;
            display: flex;
            justify-content: center;
            gap: 12px;
          }
          .print-btn-container button {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .print-btn-container .btn-print {
            background: #4a6fa5;
            color: white;
          }
          .print-btn-container .btn-print:hover {
            background: #3a5f8f;
          }
          .print-btn-container .btn-close {
            background: #6c757d;
            color: white;
          }
          .print-btn-container .btn-close:hover {
            background: #5a6268;
          }
          @media print {
            body { padding: 20px; background: white; }
            .payslip-container { box-shadow: none; }
            .print-btn-container { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="payslip-container" id="payslip-container">
          <div class="payslip-header">
            <div class="title">
              <h1>PAYSLIP</h1>
              <p>Municipality of Pagbilao, Quezon</p>
            </div>
            <div class="logo">
              <h3>HR Management System</h3>
              <p>${payrollData.periodMonth || ''} ${payrollData.periodYear || ''}</p>
            </div>
          </div>

          <div class="employee-info">
            <div class="info-item">
              <label>Employee Name</label>
              <span>${employee?.fullName || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Employee ID</label>
              <span>${employee?.id || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Department</label>
              <span>${employee?.department || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Position</label>
              <span>${employee?.position || 'N/A'}</span>
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
                <td class="amount">₱${(payrollData.basicSalary || 0).toLocaleString()}</td>
              </tr>
              ${payrollData.lateDays > 0 ? `
                <tr class="deduction-row">
                  <td>Late Deduction (${payrollData.lateDays} days × ₱${LATE_DEDUCTION_RATE.toLocaleString()})</td>
                  <td class="amount">-₱${(payrollData.lateDeduction || 0).toLocaleString()}</td>
                </tr>
              ` : ''}
              ${(payrollData.originalDeductions || 0) > 0 ? `
                <tr class="deduction-row">
                  <td>Other Deductions</td>
                  <td class="amount">-₱${(payrollData.originalDeductions || 0).toLocaleString()}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>Net Pay</strong></td>
                <td class="amount"><strong>₱${(payrollData.netPay || 0).toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="payslip-footer">
            <div>
              <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
            <div>
              <p>${employee?.fullName || 'Employee'} - Payslip</p>
            </div>
          </div>
        </div>

        <div class="print-btn-container">
          <button class="btn-print" onclick="window.print()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M18 9H6"></path>
              <path d="M18 16H6"></path>
              <rect x="4" y="9" width="16" height="10" rx="1" ry="1"></rect>
              <line x1="8" y1="13" x2="16" y2="13"></line>
            </svg>
            Print / Save as PDF
          </button>
          <button class="btn-close" onclick="window.close()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (printWindow) {
      printWindow.document.write(payslipHTML);
      printWindow.document.close();
      printWindow.focus();
    } else {
      alert('Please allow popups to view payslip');
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

  if (loading || authLoading) {
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
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="stats-badge">{new Date().toLocaleDateString()}</span>
        <button 
          onClick={generateAttendancePDF}
          className="btn-add-modern"
          style={{
            background: '#27ae60',
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
          <GetAppIcon style={{ fontSize: 18 }} />
          Download PDF
        </button>
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
          ✅ You have completed your attendance entry. You can time in again if needed.
        </div>
      )}
      {isTimedIn && !isTimedOut && (
        <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '8px', color: '#856404' }}>
          ⏳ You are currently timed in. Click "Time Out" when leaving.
        </div>
      )}
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
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.length > 0 ? (
              [...attendanceRecords]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 20)
                .map(record => {
                  let remarks = '';
                  if (record.status === 'Under Time' && record.undertimeMinutes) {
                    remarks = `⏱️ Undertime: ${record.undertimeMinutes} mins`;
                  } else if (record.status === 'Over Time' && record.overtimeMinutes) {
                    remarks = `⏱️ Overtime: ${record.overtimeMinutes} mins`;
                  } else if (record.status === 'Late') {
                    remarks = '⏰ Late arrival';
                  } else if (record.status === 'On Time') {
                    remarks = '✅ On time';
                  }
                  // For multiple entries, show entry number
                  if (record.entryNumber && record.entryNumber > 1) {
                    remarks = remarks ? `${remarks} (Entry ${record.entryNumber})` : `Entry ${record.entryNumber}`;
                  }
                  return (
                    <tr key={record.id} className={record.status === 'Late' || record.status === 'Under Time' ? 'late-row' : ''}>
                      <td>{record.date}</td>
                      <td className="time-cell">{record.timeIn || '—'}</td>
                      <td className="time-cell">{record.timeOut || '—'}</td>
                      <td>
                        {getAttendanceStatusBadge(record.status || 'Present')}
                      </td>
                      <td style={{ fontSize: '12px', color: '#666' }}>{remarks}</td>
                    </tr>
                  );
                })
            ) : (
              <tr>
                <td colSpan="5" className="empty-state">
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

  //====LEAVE MANAGEMENT=====//
  const renderLeave = () => (
    <div className="employee-leave-content">
      <div className="section-header">
        <h2>Application for Leave</h2>
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
          <div clasName="balance-item">
            <span className="balance-label">Maternity Leave</span>
            <span className="balance-value">{leaveBalance.maternityLeave || 0}  days</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">Paternity Leave</span>
            <span className="balance-value">{leaveBalance.paternityLeave || 0} days</span>
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
                    <option value="Maternity">Maternity Leave</option>
                    <option value="Paternity">Paternity Leave</option>
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

  //Compliance Tab//
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
                  <option value="Certificates">Certificates</option>
                  <option value="DTR">Daily Time Record (DTR)</option>
                  <option value="IPCR">Performance Commitment and Review (IPCR)</option>
                  <option value="Leave">Leave Form</option>
                  <option value="Personal Data Sheet">Personal Data Sheet</option>
                  <option value="SALN">Statement of Assets, Liabilities, and Net Worth (SALN)</option>
                  {/* <option value="Medical Certificate">Medical Certificate</option> */}
                  {/* <option value="Others">Others</option> */}
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

    const payroll = selectedPayroll;

    return (
      <div className="modal-overlay" onClick={() => setShowPayslipModal(false)}>
        <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh' }}>
          <div className="modal-header">
            <h3>
              <PictureAsPdfIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
              Payslip Details
            </h3>
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
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{payroll.periodStart} → {payroll.periodEnd}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Department</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{employee.department || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Status</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>
                  <span className={`status-badge ${payroll.status === 'Paid' ? 'success' : 'warning'}`}>
                    {payroll.status || 'Pending'}
                  </span>
                </p>
              </div>
            </div>

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
                  ₱{(payroll.basicSalary || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Late Days</label>
                <p style={{ fontWeight: '600', fontSize: '16px', color: payroll.lateDays > 0 ? '#e67e22' : '#27ae60' }}>
                  {payroll.lateDays || 0} {payroll.lateDays > 0 ? '⚠️' : '✅'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Late Deduction</label>
                <p style={{ fontWeight: '600', fontSize: '16px', color: (payroll.lateDeduction || 0) > 0 ? '#e74c3c' : '#27ae60' }}>
                  ₱{(payroll.lateDeduction || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Other Deductions</label>
                <p style={{ fontWeight: '600', fontSize: '16px', color: (payroll.originalDeductions || 0) > 0 ? '#e67e22' : '#27ae60' }}>
                  ₱{(payroll.originalDeductions || 0).toLocaleString()}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1', borderTop: '2px solid #eef2f7', paddingTop: '12px' }}>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Net Pay</label>
                <p style={{ fontWeight: '700', fontSize: '24px', color: '#4a6fa5' }}>
                  ₱{(payroll.netPay || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button 
                onClick={() => viewPayslip(payroll)}
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
                View / Print Payslip
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
    const hasCurrentPayroll = !!employeePayroll;
    const hasHistory = allPayrollHistory.length > 0;

    return (
      <div className="employee-payroll-content">
        {renderPayslipModal()}

        <div className="section-header">
          <h2><AttachMoneyIcon style={{ fontSize: 24, marginRight: 10, verticalAlign: 'middle' }} /> My Payroll</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={refreshPayrollData}
              disabled={isRefreshingPayroll}
              style={{
                padding: '6px 14px',
                background: '#4a6fa5',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: isRefreshingPayroll ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isRefreshingPayroll ? 0.7 : 1
              }}
            >
              <RefreshIcon style={{ fontSize: 16, animation: isRefreshingPayroll ? 'spin 1s linear infinite' : 'none' }} />
              {isRefreshingPayroll ? 'Refreshing...' : 'Refresh'}
            </button>
            {hasCurrentPayroll && (
              <span className="stats-badge">
                {employeePayroll.periodMonth} {employeePayroll.periodYear}
              </span>
            )}
            {hasCurrentPayroll && (
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
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div style={{ 
          padding: '10px 16px', 
          background: '#f0f4fe', 
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'center'
        }}>
          <span>Employee ID: <strong>{employee?.id || 'N/A'}</strong></span>
          <span>History Records: <strong>{allPayrollHistory.length}</strong></span>
        </div>

        {/* Payroll Summary Cards */}
        {payrollSummary.totalPayrolls > 0 && (
          <div className="stats-row">
            <div className="stat-card blue">
              <div className="stat-icon"><AttachMoneyIcon style={{ fontSize: 30 }} /></div>
              <div className="stat-info">
                <h3>Total Earned</h3>
                <p>{formatCurrency(payrollSummary.totalEarned)}</p>
              </div>
            </div>
            <div className="stat-card red">
              <div className="stat-icon"><TrendingDownIcon style={{ fontSize: 30 }} /></div>
              <div className="stat-info">
                <h3>Total Deductions</h3>
                <p>{formatCurrency(payrollSummary.totalDeductions)}</p>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon"><CheckCircleIcon style={{ fontSize: 30 }} /></div>
              <div className="stat-info">
                <h3>Total Net Pay</h3>
                <p>{formatCurrency(payrollSummary.totalNetPay)}</p>
              </div>
            </div>
            <div className="stat-card orange">
              <div className="stat-icon"><WarningIcon style={{ fontSize: 30 }} /></div>
              <div className="stat-info">
                <h3>Total Late Days</h3>
                <p>{payrollSummary.totalLateDays} days</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Month Payroll */}
        {hasCurrentPayroll && (
          <div className="form-card-modern">
            <h3>
              Current Month Payroll
              <span style={{ fontSize: '13px', fontWeight: 'normal', marginLeft: '12px', color: '#666' }}>
                ({employeePayroll.periodMonth} {employeePayroll.periodYear})
              </span>
            </h3>
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
                <p style={{ color: (employeePayroll.originalDeductions || 0) > 0 ? '#e67e22' : '#27ae60' }}>
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
        )}

        {/* Payroll History */}
        {hasHistory && (
          <div className="form-card-modern" style={{ marginTop: '20px' }}>
            <h3>
              Payroll History
              <span style={{ fontSize: '13px', fontWeight: 'normal', marginLeft: '12px', color: '#666' }}>
                {allPayrollHistory.length} record{allPayrollHistory.length > 1 ? 's' : ''}
              </span>
            </h3>
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
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: (record.totalDeductions || 0) > 0 ? '#e74c3c' : '#27ae60' }}>
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
                        <button
                          onClick={() => generatePayslipPDF(record)}
                          style={{
                            background: 'transparent',
                            color: '#27ae60',
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
                          <GetAppIcon style={{ fontSize: 16 }} />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Payroll Records */}
        {!hasCurrentPayroll && !hasHistory && (
          <div className="form-card-modern" style={{ textAlign: 'center', padding: '40px' }}>
            <AttachMoneyIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 16px' }} />
            <h3>No Payroll Records Found</h3>
            <p style={{ color: '#666', marginTop: '8px' }}>
              Your payroll will appear here after payroll processing.
            </p>
            <p style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>
              Payroll is typically processed at the end of each month.
            </p>
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

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default EmployeePortal;