// src/other file for dashboard/EmployeePortal.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/contexts/AuthContext';
import { logout } from '../firebase';
import imageCompression from 'browser-image-compression';
import html2pdf from 'html2pdf.js';

import { PDFDocument } from 'pdf-lib';

// Material-UI Icons
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import UploadIcon from '@mui/icons-material/Upload';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import logo from '../assets/hrmo logo.jpg';

// Import documents
import accomplishmentReport from '../for_comply/ACCOMPLISHMENT REPORT.pdf';
import ipcr2026 from '../for_comply/IPCR2026.pdf';
import passSlipForm from '../for_comply/PASS SLIP FORM.pdf';
import personalDataSheet from '../for_comply/Personal_Data_Sheet.pdf';
import salnAnnexes from '../for_comply/SALN Annexes 2025.pdf';

// Late deduction rate (matches Payroll.js)
const MONETARY_DEDUCTION_RATE = 1.50;
const LEAVE_DEDUCTION_RATE = 0.5;
const LEAVE_CREDIT_POSITIONS = ['Casual', 'Permanent', 'Regular', 'Probationary'];
const MONETARY_DEDUCTION_POSITIONS = ['Job Order', 'JO', 'Contractual'];

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
  const [officeEndTime, setOfficeEndTime] = useState('18:00');
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
  const [deductionType, setDeductionType] = useState('none');

  // ====== EDITABLE COMPLIANCE STATES ======
  const [selectedForm, setSelectedForm] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savedFieldData, setSavedFieldData] = useState({});
  const [editingFieldData, setEditingFieldData] = useState({ formId: null, fieldKey: null, field: null });
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [signaturePosition, setSignaturePosition] = useState({ x: 100, y: 300 });
  const [signatureSize, setSignatureSize] = useState({ width: 150, height: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [signatureScale, setSignatureScale] = useState(1);
  const [showSignatureControls, setShowSignatureControls] = useState(false);
  const signatureContainerRef = useRef(null);
  const signatureImageRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [signatureData, setSignatureData] = useState(null);


  // ====== COMPLIANCE FILES CONFIGURATION ======
  const [complianceFiles] = useState([
    {
      id: 'accomplishment',
      name: 'Accomplishment Report',
      file: accomplishmentReport,
      type: 'pdf',
    },
    {
      id: 'ipcr',
      name: 'Performance Commitment and Review (IPCR) 2026',
      file: ipcr2026,
      type: 'pdf',
    },
    {
      id: 'passSlip',
      name: 'Pass Slip',
      file: passSlipForm,
      type: 'pdf',
    },
    {
      id: 'pds',
      name: 'Personal Data Sheet',
      file: personalDataSheet,
      type: 'pdf',
    },
    {
      id: 'saln',
      name: 'Statement of Assets, Liabilities, and Net Wort (SALN) Annexes 2025',
      file: salnAnnexes,
      type: 'pdf',
    }
  ]);

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

  // Add this useEffect in the main component body with your other useEffect hooks
useEffect(() => {
  const saved = localStorage.getItem('savedSignature');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      setSignaturePreview(data.preview);
      setSignaturePosition(data.position || { x: 100, y: 300 });
      setSignatureSize(data.size || { width: 150, height: 60 });
      setSignatureScale(data.scale || 1);
      setShowSignatureControls(true);
      setSignatureData(data);
      console.log('✅ Signature loaded from localStorage');
    } catch (e) {
      console.error('Error loading saved signature:', e);
    }
  }
}, []);

// Add this useEffect for container size
useEffect(() => {
  const updateSize = () => {
    const container = document.querySelector('.pdf-viewer-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width || 800, height: rect.height || 1000 });
    }
  };
  
  updateSize();
  window.addEventListener('resize', updateSize);
  return () => window.removeEventListener('resize', updateSize);
}, [showEditModal]);


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
    
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
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
        setDeductionType(payrollData.deductionType || 'none');
      } else {
        setEmployeePayroll(null);
        setEmployeeLateDays(0);
        setEmployeeLateDeduction(0);
        setDeductionType('none');
      }

      const allPayrollQuery = query(
        collection(db, 'payroll'),
        where('employeeId', '==', employee.id)
      );
      const allPayrollSnapshot = await getDocs(allPayrollQuery);
      const history = allPayrollSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      history.sort((a, b) => b.periodStart?.localeCompare(a.periodStart) || 0);
      setAllPayrollHistory(history);

      const summary = history.reduce((acc, record) => ({
        totalEarned: acc.totalEarned + (record.basicSalary || 0),
        totalDeductions: acc.totalDeductions + (record.totalDeductions || 0),
        totalNetPay: acc.totalNetPay + (record.netPay || 0),
        totalLateDays: acc.totalLateDays + (record.lateDays || 0),
        totalPayrolls: acc.totalPayrolls + 1,
        totalLeaveCreditsUsed: acc.totalLeaveCreditsUsed + (record.leaveCreditsUsed || 0),
        totalMonetaryDeductions: acc.totalMonetaryDeductions + (record.monetaryDeduction || 0)
      }), { 
        totalEarned: 0, 
        totalDeductions: 0, 
        totalNetPay: 0, 
        totalLateDays: 0, 
        totalPayrolls: 0,
        totalLeaveCreditsUsed: 0,
        totalMonetaryDeductions: 0
      });
      
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
        console.log('Employee found with ID:', empId);
        console.log('Employee data:', empData);
      } else {
        console.log('No employee document found for email:', authUser.email);
        
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
        console.log('Using employee ID for queries:', empId);

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

  // ====== SIGNATURE FUNCTIONS ======
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Signature file is too large. Maximum size is 2MB.');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file for the signature.');
      return;
    }
    
    setSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignaturePreview(event.target.result);
      setShowSignatureControls(true);
      setSignaturePosition({ x: 100, y: 300 });
      setSignatureSize({ width: 150, height: 60 });
      setSignatureScale(1);
    };
    reader.readAsDataURL(file);
  };

  const removeSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(null);
    setShowSignatureControls(false);
  };

  // ====== SIGNATURE DRAG AND RESIZE FUNCTIONS ======
  const handleSignatureMouseDown = (e) => {
    if (!signaturePreview) return;
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target;
    if (target.className && target.className.includes('resize-handle')) {
      setIsResizing(true);
      setResizeStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleSignatureMouseMove = (e) => {
    if (isDragging && signatureContainerRef.current) {
      const containerRect = signatureContainerRef.current.parentElement.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragOffset.x;
      const newY = e.clientY - containerRect.top - dragOffset.y;
      
      setSignaturePosition({
        x: Math.max(0, Math.min(newX, containerRect.width - signatureSize.width)),
        y: Math.max(0, Math.min(newY, containerRect.height - signatureSize.height))
      });
    }
    
    if (isResizing && signatureContainerRef.current) {
      const containerRect = signatureContainerRef.current.parentElement.getBoundingClientRect();
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(50, signatureSize.width + deltaX);
      const newHeight = Math.max(30, signatureSize.height + deltaY);
      
      setSignatureSize({
        width: Math.min(newWidth, containerRect.width - signaturePosition.x),
        height: Math.min(newHeight, containerRect.height - signaturePosition.y)
      });
      
      setResizeStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleSignatureMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleSignatureMouseMove);
      document.addEventListener('mouseup', handleSignatureMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleSignatureMouseMove);
        document.removeEventListener('mouseup', handleSignatureMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, signaturePosition, signatureSize]);

  const zoomSignature = (direction) => {
    const newScale = direction === 'in' ? signatureScale + 0.1 : signatureScale - 0.1;
    const clampedScale = Math.max(0.3, Math.min(3, newScale));
    setSignatureScale(clampedScale);
    setSignatureSize({
      width: 150 * clampedScale,
      height: 60 * clampedScale
    });
  };

  const resetSignaturePosition = () => {
    setSignaturePosition({ x: 100, y: 300 });
    setSignatureSize({ width: 150, height: 60 });
    setSignatureScale(1);
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
        const allDocs = todaySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      
      const existingQuery = query(
        collection(db, 'attendance'),
        where('employeeId', '==', employee.id),
        where('date', '==', today)
      );
      const existingSnapshot = await getDocs(existingQuery);
      const existingDocs = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const incompleteEntry = existingDocs.find(doc => doc.timeIn && !doc.timeOut);
      
      if (incompleteEntry) {
        alert('You have an incomplete attendance entry. Please time out first.');
        setAttendanceLoading(false);
        return;
      }

      const entryNumber = existingDocs.length + 1;
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

      let recordToUpdate = null;
      let recordId = null;
      
      const docs = existingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

      const officeEndMinutes = timeToMinutes(officeEndTime);
      const timeOutMinutes = timeToMinutes(timeOutStr);
      
      let status = recordToUpdate.status || 'Present';
      let overtimeMinutes = 0;
      let undertimeMinutes = 0;

      if (timeOutMinutes < officeEndMinutes) {
        const diffMinutes = officeEndMinutes - timeOutMinutes;
        if (diffMinutes >= 15) {
          status = 'Under Time';
          undertimeMinutes = diffMinutes;
        } else {
          status = recordToUpdate.status === 'Late' ? 'Late' : 'On Time';
        }
      } else if (timeOutMinutes > officeEndMinutes) {
        const diffMinutes = timeOutMinutes - officeEndMinutes;
        if (diffMinutes >= 15) {
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

  // ===leave management====//
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

      const currentBalance = leaveData.type === 'Vacation' 
        ? leaveBalance.vacationLeave
        : leaveData.type === 'Maternity'
        ? leaveBalance.maternityLeave
        : leaveData.type === 'Paternity'
        ? leaveBalance.paternityLeave
        : leaveBalance.sickLeave;
      
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

  // ====== EDITABLE COMPLIANCE FUNCTIONS ======

  // Open the editable form modal
  const openEditableForm = (formId) => {
    setSelectedForm(formId);
    setShowEditModal(true);
    setSignaturePosition({ x: 100, y: 300 });
    setSignatureSize({ width: 150, height: 60 });
    setSignatureScale(1);
  };

  // Handle field value change
  const handleFieldChange = (formId, fieldKey, value) => {
    setSavedFieldData(prev => ({
      ...prev,
      [formId]: {
        ...(prev[formId] || {}),
        [fieldKey]: value
      }
    }));
  };

  // Get field value
  const getFieldValue = (formId, fieldKey) => {
    const saved = savedFieldData[formId] || {};
    return saved[fieldKey] || '';
  };

  // ====== STATUS BADGE FUNCTIONS ======
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

    const container = document.createElement('div');
    container.innerHTML = attendanceHTML;
    document.body.appendChild(container);
    const element = container.querySelector('.report-container');

    const fileName = `Attendance_Report_${employee?.fullName?.replace(/\s/g, '_') || 'Employee'}_${new Date().toISOString().split('T')[0]}.pdf`;

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

  // ====== GENERATE PAYSLIP PDF ======
  const generatePayslipPDF = (payrollData) => {
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
                  <td>Late Deduction (${payrollData.lateDays} days × ₱${MONETARY_DEDUCTION_RATE.toLocaleString()})</td>
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

    const container = document.createElement('div');
    container.innerHTML = payslipHTML;
    document.body.appendChild(container);
    const element = container.querySelector('.payslip-container');

    const fileName = `Payslip_${employee?.fullName?.replace(/\s/g, '_') || 'Employee'}_${payrollData.periodMonth || ''}_${payrollData.periodYear || ''}.pdf`;

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

  // ====== VIEW/PRINT PAYSLIP ======
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
                  <td>Late Deduction (${payrollData.lateDays} days × ₱${MONETARY_DEDUCTION_RATE.toLocaleString()})</td>
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

  // ====== RENDER COMPLIANCE TAB - FIXED VERSION (NO HOOKS INSIDE) ======
const renderCompliance = () => {
  const formData = selectedForm ? complianceFiles.find(f => f.id === selectedForm) : null;

  // Save signature position and size
  const saveSignature = () => {
    if (!signaturePreview) {
      alert('Please upload a signature first.');
      return;
    }
    
    const data = {
      preview: signaturePreview,
      position: signaturePosition,
      size: signatureSize,
      scale: signatureScale
    };
    
    localStorage.setItem('savedSignature', JSON.stringify(data));
    setSignatureData(data);
    
    setSavedFieldData(prev => ({
      ...prev,
      signature: data
    }));
    
    alert('Signature saved successfully!');
  };

  // Download PDF with signature - FIXED VERSION
  const downloadPDFWithSignature = async () => {
    if (!signaturePreview) {
      alert('Please upload a signature first.');
      return;
    }

    try {
      // Get the container
      const container = document.querySelector('.pdf-viewer-container');
      if (!container) {
        alert('PDF container not found.');
        return;
      }

      // Get the signature overlay element directly
      const overlay = container.querySelector('.signature-overlay');
      if (!overlay) {
        alert('Signature not found. Please place the signature first.');
        return;
      }

      // Get actual positions from the DOM
      const containerRect = container.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      // Calculate percentage positions based on actual DOM positions
      const containerWidth = containerRect.width || 800;
      const containerHeight = containerRect.height || 1000;
      
      const relX = ((overlayRect.left - containerRect.left) / containerWidth) * 100;
      const relY = ((overlayRect.top - containerRect.top) / containerHeight) * 100;
      const relWidth = (overlayRect.width / containerWidth) * 100;
      const relHeight = (overlayRect.height / containerHeight) * 100;

      console.log('DOM Positions:', {
        container: { width: containerWidth, height: containerHeight },
        overlay: { left: overlayRect.left, top: overlayRect.top, width: overlayRect.width, height: overlayRect.height },
        percentages: { relX, relY, relWidth, relHeight }
      });

      // Get the PDF file URL
      const pdfUrl = formData.file;

      // Fetch the PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      const pdfData = await response.arrayBuffer();

      // Load the PDF using pdf-lib
      const pdfDoc = await PDFDocument.load(pdfData);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Convert signature image to PNG
      const canvas = document.createElement('canvas');
      canvas.width = signatureSize.width * 2;
      canvas.height = signatureSize.height * 2;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.src = signaturePreview;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const signatureImageData = canvas.toDataURL('image/png');
      const signatureImageBytes = await fetch(signatureImageData).then(res => res.arrayBuffer());
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

      // Calculate position on PDF page
      const pdfX = (relX / 100) * width;
      const pdfY = height - ((relY + relHeight) / 100) * height;
      const pdfWidth = (relWidth / 100) * width;
      const pdfHeight = (relHeight / 100) * height;

      console.log('PDF Positions:', { pdfX, pdfY, pdfWidth, pdfHeight });

      // Draw the signature on the PDF
      firstPage.drawImage(signatureImage, {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
        opacity: 1,
      });

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formData.name.replace(/\s/g, '_')}_signed.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      alert('PDF with signature downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF with signature:', error);
      alert('Error downloading PDF: ' + error.message);
    }
  };

  // Handle scroll to keep signature in correct position
  const handleScroll = (e) => {
    // The signature position is already relative to the container
    // No need to update position on scroll
  };

  return (
    <div className="employee-compliance-content">
      <div className="section-header">
        <h2>My Compliance</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={downloadPDFWithSignature}
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
            Download Signed PDF
          </button>
          <button onClick={() => setShowUploadForm(true)} className="btn-add-modern">
            <UploadIcon style={{ fontSize: 18, marginRight: 8 }} />
            Upload Document
          </button>
        </div>
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

      {/* Editable Compliance Forms Section */}
      <div className="editable-forms-section" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>
          <TextFieldsIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
          Editable Compliance Forms
        </h3>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
          Click on any form to view and fill in the fields.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {complianceFiles.map(form => (
            <button
              key={form.id}
              onClick={() => openEditableForm(form.id)}
              style={{
                padding: '16px',
                background: 'white',
                border: '2px solid #eef2f7',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4a6fa5';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,111,165,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#eef2f7';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <DescriptionIcon style={{ fontSize: 32, color: '#4a6fa5' }} />
              <span style={{ fontWeight: '600', fontSize: '14px' }}>{form.name}</span>
              <span style={{ fontSize: '11px', color: '#888' }}>{form.type.toUpperCase()}</span>
              {savedFieldData[form.id] && Object.values(savedFieldData[form.id]).some(v => v) && (
                <span style={{ fontSize: '10px', color: '#27ae60' }}>✅ Fields filled</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editable Form Modal */}
      {showEditModal && formData && (
        <div className="modal-overlay" onClick={() => {
          setShowEditModal(false);
          setSignatureFile(null);
          setSignaturePreview(null);
          setShowSignatureControls(false);
        }}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '95vw', 
            maxHeight: '95vh',
            width: '95vw',
            padding: '20px',
            overflow: 'auto'
          }}>
            <div className="modal-header">
              <h3>
                <TextFieldsIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
                View & Sign: {formData.name}
              </h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="modal-close" 
                  onClick={() => {
                    setShowEditModal(false);
                    setSignatureFile(null);
                    setSignaturePreview(null);
                    setShowSignatureControls(false);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* E-Signature Upload Section */}
            <div style={{ 
              background: '#f8fafd', 
              padding: '16px 20px', 
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #eef2f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  <DragIndicatorIcon style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} />
                  E-Signature
                </span>
                {!signaturePreview ? (
                  <label style={{
                    padding: '6px 16px',
                    background: '#4a6fa5',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#3a5f8f'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#4a6fa5'}
                  >
                    <UploadIcon style={{ fontSize: 16 }} />
                    Upload Signature
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <span style={{ fontSize: '13px', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircleIcon style={{ fontSize: 16 }} />
                    Signature uploaded - Drag to position, resize from corner
                  </span>
                )}
              </div>
              
              {signaturePreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{
                    border: '1px solid #eef2f7',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    background: 'white'
                  }}>
                    <img 
                      src={signaturePreview} 
                      alt="Signature" 
                      style={{ 
                        maxHeight: '40px', 
                        maxWidth: '150px',
                        objectFit: 'contain'
                      }} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => zoomSignature('in')}
                      style={{
                        padding: '4px 10px',
                        background: '#4a6fa5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Zoom In"
                    >
                      <ZoomInIcon style={{ fontSize: 14 }} />
                    </button>
                    <button
                      onClick={() => zoomSignature('out')}
                      style={{
                        padding: '4px 10px',
                        background: '#4a6fa5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Zoom Out"
                    >
                      <ZoomOutIcon style={{ fontSize: 14 }} />
                    </button>
                    <button
                      onClick={resetSignaturePosition}
                      style={{
                        padding: '4px 10px',
                        background: '#f39c12',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Reset Position"
                    >
                      Reset
                    </button>
                    <button
                      onClick={removeSignature}
                      style={{
                        padding: '4px 12px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#c0392b'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#e74c3c'}
                    >
                      <DeleteIcon style={{ fontSize: 14 }} />
                      Remove
                    </button>
                    <button
                      onClick={saveSignature}
                      style={{
                        padding: '4px 16px',
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: '600'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#219a52'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#27ae60'}
                      title="Save Signature"
                    >
                      <SaveIcon style={{ fontSize: 14 }} />
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* PDF/Image Viewer with Signature Overlay */}
            <div 
              className="pdf-viewer-container"
              style={{ 
                padding: '20px 0',
                background: '#f5f7fa',
                borderRadius: '8px',
                padding: '20px',
                position: 'relative',
                overflow: 'auto',
                maxHeight: '70vh'
              }}
              onScroll={handleScroll}
            >
              <div style={{ 
                background: 'white', 
                borderRadius: '8px', 
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                minHeight: '500px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* PDF/Image Display */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  padding: '20px',
                  background: '#f8fafd',
                  borderRadius: '8px',
                  position: 'relative',
                  minHeight: '500px',
                  width: '100%'
                }}>
                  {formData.type === 'pdf' ? (
                    <iframe
                      src={formData.file}
                      style={{
                        width: '100%',
                        height: '600px',
                        border: 'none',
                        borderRadius: '8px',
                        background: 'white'
                      }}
                      title={formData.name}
                    />
                  ) : (
                    <img 
                      src={formData.file} 
                      alt={formData.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '600px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                  )}
                  
                  {/* Signature Overlay - Draggable and Resizable */}
                  {signaturePreview && (
                    <div
                      ref={signatureContainerRef}
                      className="signature-overlay"
                      style={{
                        position: 'absolute',
                        left: signaturePosition.x + 'px',
                        top: signaturePosition.y + 'px',
                        width: signatureSize.width + 'px',
                        height: signatureSize.height + 'px',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        border: isDragging || isResizing ? '2px dashed #4a6fa5' : '2px dashed transparent',
                        borderRadius: '4px',
                        zIndex: 100,
                        userSelect: 'none',
                        touchAction: 'none',
                        transition: isDragging || isResizing ? 'none' : 'border 0.2s ease'
                      }}
                      onMouseDown={handleSignatureMouseDown}
                      onMouseEnter={() => setShowSignatureControls(true)}
                      onMouseLeave={() => setShowSignatureControls(false)}
                    >
                      <img
                        ref={signatureImageRef}
                        src={signaturePreview}
                        alt="Signature"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          pointerEvents: 'none',
                          opacity: 0.9
                        }}
                        draggable={false}
                      />
                      
                      {/* Resize Handle - Bottom Right Corner */}
                      <div
                        className="resize-handle"
                        style={{
                          position: 'absolute',
                          bottom: '-6px',
                          right: '-6px',
                          width: '14px',
                          height: '14px',
                          backgroundColor: '#4a6fa5',
                          borderRadius: '50%',
                          cursor: 'nwse-resize',
                          border: '2px solid white',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          pointerEvents: 'auto',
                          display: showSignatureControls ? 'block' : 'none'
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsResizing(true);
                          setResizeStart({ x: e.clientX, y: e.clientY });
                        }}
                      />
                      
                      {/* Drag Indicator */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-20px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(74, 111, 165, 0.8)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          whiteSpace: 'nowrap',
                          display: showSignatureControls ? 'block' : 'none',
                          pointerEvents: 'none'
                        }}
                      >
                        Drag to move
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Instructions Footer */}
            <div style={{ 
              marginTop: '16px', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #eef2f7',
              paddingTop: '16px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span>💡Upload your signature image, then drag to position</span>
                <span>↕ Drag from the signature to move</span>
                <span>↘ Drag the blue dot to resize</span>
                <span>💾 Click "Save" to store your signature</span>
                {signaturePreview && (
                  <span style={{ color: '#27ae60', fontWeight: '600' }}>✓ Signature placed</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {signaturePreview && (
                  <button 
                    onClick={downloadPDFWithSignature}
                    style={{
                      padding: '10px 24px',
                      background: '#27ae60',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#219a52'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#27ae60'}
                  >
                    <GetAppIcon style={{ fontSize: 18 }} />
                    Download Signed PDF
                  </button>
                )}
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setSignatureFile(null);
                    setSignaturePreview(null);
                    setShowSignatureControls(false);
                  }}
                  style={{
                    padding: '10px 24px',
                    background: '#4a6fa5',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#3a5f8f'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#4a6fa5'}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
};

  // ====== RENDER DASHBOARD ======
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

  // ====== RENDER ATTENDANCE ======
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
                      remarks = 'Late arrival';
                    } else if (record.status === 'On Time') {
                      remarks = 'On time';
                    }
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

  // ====== RENDER LEAVE ======
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
          <div className="balance-item">
            <span className="balance-label">Maternity Leave</span>
            <span className="balance-value">{leaveBalance.maternityLeave || 0} days</span>
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

  // ====== RENDER NOTIFICATIONS ======
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

  // ====== RENDER PAYSLIP MODAL ======
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

  // ====== RENDER PAYROLL ======
  const renderPayroll = () => {
    const hasCurrentPayroll = !!employeePayroll;
    const hasHistory = allPayrollHistory.length > 0;
    const position = employee?.position || employee?.employmentType || 'Unknown';
    const usesLeaveCredits = LEAVE_CREDIT_POSITIONS.includes(position);
    const usesMonetaryDeduction = MONETARY_DEDUCTION_POSITIONS.includes(position);

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

        <div style={{
          padding: '12px 20px',
          background: usesLeaveCredits ? '#d4edda' : (usesMonetaryDeduction ? '#fff3cd' : '#f0f4fe'),
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span><WorkIcon style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }} /> 
            <strong>Position:</strong> {position}
          </span>
          <span>|</span>
          <span>
            <strong>Deduction Type:</strong> 
            {usesLeaveCredits ? (
              <span style={{ color: '#27ae60', fontWeight: '600' }}> Leave Credits ({LEAVE_DEDUCTION_RATE} day per late)</span>
            ) : usesMonetaryDeduction ? (
              <span style={{ color: '#e74c3c', fontWeight: '600' }}> Monetary (₱{MONETARY_DEDUCTION_RATE} per late)</span>
            ) : (
              <span style={{ color: '#6c757d' }}> None</span>
            )}
          </span>
        </div>

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
            {payrollSummary.totalLeaveCreditsUsed > 0 && (
              <div className="stat-card teal">
                <div className="stat-icon"><PeopleIcon style={{ fontSize: 30 }} /></div>
                <div className="stat-info">
                  <h3>Leave Credits Used</h3>
                  <p>{payrollSummary.totalLeaveCreditsUsed.toFixed(1)} days</p>
                  <small>Total</small>
                </div>
              </div>
            )}
          </div>
        )}

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
                <p style={{ margin: '5px 0', color: '#666' }}><strong>Deduction Type:</strong></p>
                <p style={{ 
                  color: deductionType === 'leave' ? '#27ae60' : 
                         deductionType === 'monetary' ? '#e74c3c' : '#6c757d',
                  fontWeight: '600'
                }}>
                  {deductionType === 'leave' ? `Leave Credits (${LEAVE_DEDUCTION_RATE} day/late)` :
                   deductionType === 'monetary' ? `Monetary (₱${MONETARY_DEDUCTION_RATE}/late)` :
                   'No deduction'}
                </p>
              </div>
              {deductionType === 'leave' && employeePayroll.leaveCreditsUsed > 0 && (
                <div>
                  <p style={{ margin: '5px 0', color: '#666' }}><strong>Leave Credits Used:</strong></p>
                  <p style={{ color: '#27ae60', fontWeight: '600' }}>
                    {employeePayroll.leaveCreditsUsed.toFixed(1)} days
                  </p>
                </div>
              )}
              {deductionType === 'monetary' && employeePayroll.monetaryDeduction > 0 && (
                <div>
                  <p style={{ margin: '5px 0', color: '#666' }}><strong>Monetary Deduction:</strong></p>
                  <p style={{ color: '#e74c3c', fontWeight: '600' }}>
                    {formatCurrency(employeePayroll.monetaryDeduction)}
                  </p>
                </div>
              )}
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
                        {record.leaveCreditsUsed > 0 && (
                          <span style={{ fontSize: '11px', display: 'block', color: '#27ae60' }}>
                            Leave: {record.leaveCreditsUsed.toFixed(1)} days
                          </span>
                        )}
                        {record.monetaryDeduction > 0 && (
                          <span style={{ fontSize: '11px', display: 'block', color: '#e74c3c' }}>
                            ₱{record.monetaryDeduction.toFixed(2)}
                          </span>
                        )}
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

  // ====== RENDER PROFILE ======
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

  // ====== SIDEBAR ======
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

  // ====== MAIN RETURN ======
  if (loading || authLoading) {
    return <div className="loading">Loading your portal...</div>;
  }

  if (!employee) {
    return <div className="error">No employee profile found. Please contact HR.</div>;
  }

  return (
    <div className="employee-portal">
      {renderPreviewModal()}

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