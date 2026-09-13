// src/other file for dashboard/EmployeePortal.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/contexts/AuthContext';
import { logout } from '../firebase';
import imageCompression from 'browser-image-compression';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
import Rotate90DegreesCcwIcon from '@mui/icons-material/Rotate90DegreesCcw';
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({});
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

  // ====== COMPLIANCE STATES ======
  const [selectedForm, setSelectedForm] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);


  const fileInputRef = useRef(null);

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
      name: 'Individual Performance Commitment and Review (IPCR) 2026',
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
      name: 'Statement of Assets, Liabilities, and Net Worth (SALN) Annexes 2025',
      file: salnAnnexes,
      type: 'pdf',
    }
  ]);

  // ====== HELPER FUNCTIONS ======
  const formatCurrency = (amount) => {
    if (!amount || amount === '0' || amount === 0) return '₱0';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

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


  // ====== PRINT PAYSLIP FUNCTION ======
  const printPayslip = (payrollData) => {
    if (!payrollData) return;
    
    const employeeName = employee?.fullName || 'Unknown';
    const department = employee?.department || 'N/A';
    const positionName = employee?.position || 'N/A';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${employeeName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              background: white; 
              padding: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .payslip-container {
              max-width: 700px;
              width: 100%;
              background: white;
              border: 2px solid #1a2a4a;
              padding: 30px 35px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .payslip-header {
              text-align: center;
              border-bottom: 3px double #1a2a4a;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .payslip-header h1 {
              font-size: 22px;
              font-weight: 700;
              color: #1a2a4a;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin: 0;
            }
            .payslip-header h2 {
              font-size: 16px;
              font-weight: 600;
              color: #4a6fa5;
              margin: 4px 0 0 0;
              letter-spacing: 1px;
            }
            .payslip-header p {
              font-size: 13px;
              color: #666;
              margin: 4px 0 0 0;
            }
            .employee-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 20px;
              margin-bottom: 18px;
              padding: 12px 16px;
              background: #f8fafd;
              border-radius: 6px;
              border: 1px solid #eef2f7;
            }
            .employee-info .info-item {
              display: flex;
              flex-direction: column;
            }
            .employee-info .info-label {
              font-size: 10px;
              text-transform: uppercase;
              color: #8a9bb5;
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            .employee-info .info-value {
              font-size: 14px;
              font-weight: 600;
              color: #1a2a4a;
              margin-top: 2px;
            }
            .earnings-deductions {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 15px 0 18px 0;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              color: #4a6fa5;
              border-bottom: 2px solid #4a6fa5;
              padding-bottom: 4px;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .earning-item, .deduction-item {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 13px;
              border-bottom: 1px dashed #f0f2f7;
            }
            .earning-item:last-child, .deduction-item:last-child {
              border-bottom: none;
            }
            .earning-item .label, .deduction-item .label {
              color: #333;
            }
            .earning-item .amount, .deduction-item .amount {
              font-weight: 600;
            }
            .deduction-item .amount.negative {
              color: #e74c3c;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0 6px 0;
              font-size: 16px;
              font-weight: 700;
              border-top: 3px double #1a2a4a;
              margin-top: 6px;
            }
            .total-row .label {
              color: #1a2a4a;
            }
            .total-row .amount {
              color: #27ae60;
              font-size: 18px;
            }
            .total-row .amount.negative {
              color: #e74c3c;
            }
            .payslip-footer {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #1a2a4a;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #888;
            }
            .payslip-footer .footer-left {
              text-align: left;
            }
            .payslip-footer .footer-right {
              text-align: right;
            }
            .payslip-footer p {
              margin: 2px 0;
            }
            .status-badge-print {
              display: inline-block;
              padding: 2px 14px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              background: ${payrollData.status === 'Paid' ? '#d4edda' : '#fff3cd'};
              color: ${payrollData.status === 'Paid' ? '#155724' : '#856404'};
            }
            .print-btn-container {
              text-align: center;
              margin-top: 20px;
            }
            .print-btn {
              padding: 10px 30px;
              background: #4a6fa5;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            .print-btn:hover {
              background: #3559c7;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(74,111,165,0.3);
            }
            @media print {
              body { padding: 0; }
              .print-btn-container { display: none; }
              .payslip-container { 
                border: none; 
                box-shadow: none;
                padding: 20px 25px;
              }
              .employee-info {
                background: #f8fafd;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .status-badge-print {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="payslip-header">
              <h1>Payslip</h1>
              <h2>Municipality of Pagbilao</h2>
              <p>Human Resource Management Office</p>
              <p style="font-size: 12px; color: #999; margin-top: 2px;">
                ${payrollData.periodMonth} ${payrollData.periodYear}
              </p>
            </div>

            <div class="employee-info">
              <div class="info-item">
                <span class="info-label">Employee Name</span>
                <span class="info-value">${employeeName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Position</span>
                <span class="info-value">${positionName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Department</span>
                <span class="info-value">${department}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Period</span>
                <span class="info-value">${payrollData.periodStart} → ${payrollData.periodEnd}</span>
              </div>
              <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Status</span>
                <span class="info-value"><span class="status-badge-print">${payrollData.status || 'Pending'}</span></span>
              </div>
            </div>

            <div class="earnings-deductions">
              <div>
                <div class="section-title">Earnings</div>
                <div class="earning-item">
                  <span class="label">Basic Salary</span>
                  <span class="amount">₱${(payrollData.basicSalary || 0).toLocaleString()}</span>
                </div>
                ${payrollData.allowances > 0 ? `
                  <div class="earning-item">
                    <span class="label">Allowances</span>
                    <span class="amount">₱${(payrollData.allowances || 0).toLocaleString()}</span>
                  </div>
                ` : ''}
                <div class="total-row" style="border-top: 2px solid #4a6fa5; margin-top: 4px;">
                  <span class="label">Total Earnings</span>
                  <span class="amount">₱${(payrollData.basicSalary || 0).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <div class="section-title">Deductions</div>
                ${payrollData.lateDeduction > 0 ? `
                  <div class="deduction-item">
                    <span class="label">Late Deduction (${payrollData.lateDays || 0} days)</span>
                    <span class="amount negative">-₱${(payrollData.lateDeduction || 0).toLocaleString()}</span>
                  </div>
                ` : ''}
                ${payrollData.leaveCreditsUsed > 0 ? `
                  <div class="deduction-item">
                    <span class="label">Leave Credits Used</span>
                    <span class="amount negative">-${(payrollData.leaveCreditsUsed || 0).toFixed(1)} days</span>
                  </div>
                ` : ''}
                ${payrollData.totalDeductions === 0 ? `
                  <div style="padding: 6px 0; font-size: 13px; color: #27ae60;">
                    No deductions
                  </div>
                ` : ''}
                <div class="total-row" style="border-top: 2px solid #e74c3c; margin-top: 4px;">
                  <span class="label">Total Deductions</span>
                  <span class="amount negative">-₱${(payrollData.totalDeductions || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style="background: #f0f4fe; padding: 12px 20px; border-radius: 8px; margin-top: 6px; border: 1px solid #d4e0f7;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px; font-weight: 700; color: #1a2a4a;">NET PAY</span>
                <span style="font-size: 24px; font-weight: 700; color: #4a6fa5;">₱${(payrollData.netPay || 0).toLocaleString()}</span>
              </div>
              ${payrollData.lateDays > 0 ? `
                <div style="font-size: 12px; color: #e67e22; margin-top: 4px;">
                  ⚠️ ${payrollData.lateDays} late day(s) this period
                </div>
              ` : ''}
            </div>

            <div class="payslip-footer">
              <div class="footer-left">
                <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                <p>Document ID: HR-PAY-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}</p>
              </div>
              <div class="footer-right">
                <p>This is a system-generated payslip</p>
                <p>© ${new Date().getFullYear()} HRM Pagbilao, Quezon</p>
              </div>
            </div>

            <div class="print-btn-container">
              <button class="print-btn" onclick="window.print()">
                Print Payslip
              </button>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // ====== PDF GENERATION WITH JSPDF ======
  const downloadAttendancePDF = () => {
    if (attendanceRecords.length === 0) {
      alert('No attendance records to download.');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(18);
      doc.setTextColor(26, 42, 74);
      doc.text('ATTENDANCE RECORD', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(102, 102, 102);
      const employeeInfo = `${employee?.fullName || ''} - ${employee?.position || ''} ${employee?.department ? '| ' + employee?.department : ''}`;
      doc.text(employeeInfo, pageWidth / 2, 28, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(136, 136, 136);
      const generatedDate = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      doc.text(generatedDate, pageWidth / 2, 34, { align: 'center' });

      const summaryData = [
        ['Total Days', attendanceSummary.totalDays || 0],
        ['Present', attendanceSummary.presentDays || 0],
        ['Late', attendanceSummary.lateDays || 0],
        ['Under Time', attendanceSummary.underTimeDays || 0],
        ['Over Time', attendanceSummary.overTimeDays || 0],
        ['Absent', attendanceSummary.absentDays || 0]
      ];

      let yPos = 42;
      doc.setFillColor(248, 250, 253);
      doc.rect(14, yPos - 4, pageWidth - 28, 34, 'F');

      let xPos = 20;
      summaryData.forEach((item, index) => {
        const colWidth = (pageWidth - 40) / 6;
        const centerX = xPos + colWidth / 2;
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(item[0], centerX, yPos + 4, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(74, 111, 165);
        doc.text(String(item[1]), centerX, yPos + 16, { align: 'center' });
        
        xPos += colWidth;
      });

      yPos += 34;
      
      const recordsByDate = {};
      attendanceRecords.forEach(record => {
        if (!recordsByDate[record.date]) {
          recordsByDate[record.date] = [];
        }
        recordsByDate[record.date].push(record);
      });

      const sortedDates = Object.keys(recordsByDate).sort((a, b) => b.localeCompare(a));
      
      const tableData = sortedDates.slice(0, 100).map((date, index) => {
        const dayRecords = recordsByDate[date].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
        
        let amTimeIn = '—';
        let amTimeOut = '—';
        let amStatus = '—';
        let pmTimeIn = '—';
        let pmTimeOut = '—';
        let pmStatus = '—';
        let combinedStatus = 'Present';
        let remarks = '';

        dayRecords.forEach(record => {
          const entryNum = record.entryNumber || 1;
          const timeInVal = record.timeIn || '';
          const timeOutVal = record.timeOut || '';
          const status = record.status || 'Present';
          
          if (entryNum === 1 || entryNum === 0) {
            amTimeIn = timeInVal || '—';
            amTimeOut = timeOutVal || '—';
            amStatus = status;
          } else if (entryNum === 2) {
            pmTimeIn = timeInVal || '—';
            pmTimeOut = timeOutVal || '—';
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

        return [
          String(index + 1),
          date,
          amTimeIn,
          amTimeOut,
          amStatus,
          pmTimeIn,
          pmTimeOut,
          pmStatus,
          combinedStatus,
          remarks || '—'
        ];
      });

      doc.autoTable({
        startY: yPos,
        head: [['#', 'Date', 'AM In', 'AM Out', 'AM Status', 'PM In', 'PM Out', 'PM Status', 'Daily Status', 'Remarks']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [74, 111, 165],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
          6: { cellWidth: 18 },
          7: { cellWidth: 22 },
          8: { cellWidth: 25 },
          9: { cellWidth: 35 }
        },
        didDrawCell: function(data) {
          if (data.section === 'body') {
            const status = data.cell.raw;
            const colIndex = data.column.index;
            if (colIndex === 4 || colIndex === 7 || colIndex === 8) {
              if (status === 'Late' || status === 'Under Time') {
                data.cell.styles.textColor = [230, 126, 34];
                data.cell.styles.fontStyle = 'bold';
              } else if (status === 'Over Time') {
                data.cell.styles.textColor = [39, 174, 96];
                data.cell.styles.fontStyle = 'bold';
              } else if (status === 'On Time' || status === 'Present') {
                data.cell.styles.textColor = [46, 204, 113];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(8);
      doc.setTextColor(136, 136, 136);
      doc.text('This is a system-generated attendance record.', pageWidth / 2, finalY, { align: 'center' });
      doc.text('Entry #1 = AM, Entry #2 = PM | Daily status is determined by PM (if exists), otherwise AM', pageWidth / 2, finalY + 5, { align: 'center' });

      doc.save(`Attendance_Record_${employee?.fullName || 'Employee'}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // ====== SMART FILE VIEWER ======
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
    
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    window.open(viewerUrl, '_blank');
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
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      const finalUrl = responseData.url || url;

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

  // ====== handleDocumentUpload (MULTI-FILE) ======
  const handleDocumentUpload = async () => {
    if (selectedFiles.length === 0 || !selectedDocType) {
      alert('Please select a document type and at least one file');
      return;
    }

    if (!authUser) {
      alert('You must be logged in to upload');
      return;
    }

    if (!employee || !employee.id) {
      alert('Employee data not found. Please refresh and try again.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const batchId = `batch_${Date.now()}`;
    const totalFiles = selectedFiles.length;
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatus(`Uploading ${i + 1} of ${totalFiles}: ${file.name}`);

        const uploadResult = await uploadToVercelBlob(
          file,
          employee.id,
          selectedDocType
        );

        if (!uploadResult.success) {
          console.error(`Failed to upload ${file.name}:`, uploadResult.error);
          failCount++;
          continue;
        }

        await addDoc(collection(db, 'documents'), {
          employeeId: employee.id,
          employeeName: employee.fullName,
          department: employee.department || 'N/A',
          documentType: selectedDocType,
          batchId,
          status: 'Pending Review',
          fileUrl: uploadResult.url,
          downloadUrl: uploadResult.downloadUrl,
          fileName: file.name,
          fileSize: file.size,
          storagePath: uploadResult.path,
          storageProvider: 'vercel-blob',
          uploadedAt: new Date().toISOString()
        });

        successCount++;
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      // Admin notification (one per batch)
      if (successCount > 0) {
        await addDoc(collection(db, 'notifications'), {
          type: 'compliance_upload',
          employeeId: employee.id,
          employeeName: employee.fullName,
          department: employee.department || 'N/A',
          documentType: selectedDocType,
          fileCount: successCount,
          message: `${employee.fullName} from ${employee.department || 'N/A'} uploaded ${successCount} file(s) under ${selectedDocType} for compliance review`,
          read: false,
          forAdmin: true,
          forEmployee: false,
          createdAt: new Date().toISOString()
        });

        await addDoc(collection(db, 'notifications'), {
          type: 'compliance_upload_confirmation',
          employeeId: employee.id,
          message: `Your ${successCount} file(s) under ${selectedDocType} have been uploaded and are pending review by HR`,
          read: false,
          forEmployee: true,
          forAdmin: false,
          createdAt: new Date().toISOString()
        });
      }

      setUploadStatus(
        failCount === 0
          ? `✅ All ${successCount} file(s) uploaded successfully! HR has been notified.`
          : `⚠️ ${successCount} uploaded, ${failCount} failed.`
      );

      setSelectedFiles([]);
      setSelectedDocType('');
      setShowUploadForm(false);

      await fetchEmployeeData();
    } catch (error) {
      console.error('Error uploading documents:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const processedFiles = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadStatus(`"${file.name}" is too large (max 10MB). Skipped.`);
        continue;
      }

      let processedFile = file;

      if (file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            fileType: 'image/jpeg',
          };
          processedFile = await imageCompression(file, options);
        } catch (err) {
          console.warn('Compression failed, using original:', err);
          processedFile = file;
        }
      }

      processedFiles.push(processedFile);
    }

    setSelectedFiles(processedFiles);
    setUploadProgress(0);
    setUploadStatus(`${processedFiles.length} file(s) ready to upload.`);
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

      let empData = null;
      let empId = null;

      const empQuery = query(collection(db, 'employees'), where('email', '==', authUser.email));
      const empSnapshot = await getDocs(empQuery);
      
      if (!empSnapshot.empty) {
        const docRef = empSnapshot.docs[0];
        empData = { id: docRef.id, ...docRef.data() };
        empId = docRef.id;
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
          
          try {
            await addDoc(collection(db, 'employees'), {
              ...empData,
              createdAt: new Date().toISOString()
            });
          } catch (saveError) {
            console.warn('Could not save employee to collection:', saveError);
          }
        }
      }

      if (empData) {
        setEmployee(empData);

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

        const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', '==', empId));
        const leaveSnapshot = await getDocs(leaveQuery);
        setLeaveRequests(leaveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const docQuery = query(collection(db, 'documents'), where('employeeId', '==', empId));
        const docSnapshot = await getDocs(docQuery);
        setDocuments(docSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        await fetchAttendanceData(empId);
        await fetchEmployeePayroll();

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

  // ====== FETCH EMPLOYEE PAYROLL ======
  const fetchEmployeePayroll = async () => {
    if (!employee) {
      console.log('No employee data available');
      return;
    }
    
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
      console.error('Error fetching payroll:', error);
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
        const allDocs = todaySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedDocs = allDocs.sort((a, b) => {
          if (a.entryNumber && b.entryNumber) return b.entryNumber - a.entryNumber;
          return (b.timeIn || '').localeCompare(a.timeIn || '');
        });
        const latestDoc = sortedDocs[0];
        const todayData = latestDoc;
        
        setTodayAttendance({ id: latestDoc.id, ...todayData });
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

  // ====== LEAVE FUNCTIONS ======
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
        dateSubmitted: new Date().toISOString(),
        creditsRestored: false
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

  // ====== RESTORE LEAVE CREDITS ON REJECTION ======
  const restoreLeaveCreditsOnRejection = async (leaveId, leaveData) => {
    try {
      if (leaveData.status !== 'Rejected') return;
      if (leaveData.creditsRestored === true) return;

      console.log(`Restoring ${leaveData.type} leave credits for ${leaveData.days} days...`);

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

      await updateDoc(doc(db, 'leaveRequests', leaveId), {
        creditsRestored: true,
        creditsRestoredAt: new Date().toISOString()
      });

      setLeaveBalance(updatedBalance);

      await addDoc(collection(db, 'notifications'), {
        employeeId: employee.id,
        employeeName: employee.fullName,
        department: employee.department,
        leaveId: leaveId,
        leaveType: leaveData.type,
        leaveDays: leaveData.days,
        message: `Your ${leaveData.type} leave request was rejected. ${leaveData.days} days have been restored to your balance.`,
        type: 'leave_rejected_restored',
        read: false,
        forEmployee: true,
        forAdmin: false,
        createdAt: new Date().toISOString()
      });

      console.log(`Successfully restored ${leaveData.days} ${leaveData.type} days`);

    } catch (error) {
      console.error('Error restoring leave credits on rejection:', error);
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

  // ====== SETUP REALTIME LISTENERS ======
  const setupRealtimeListeners = () => {
    if (!employee || !employee.id) return;

    const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', '==', employee.id));
    onSnapshot(leaveQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      requests.forEach(request => {
        if (request.status === 'Rejected' && !request.creditsRestored) {
          const previousRequest = leaveRequests.find(r => r.id === request.id);
          if (previousRequest && previousRequest.status !== 'Rejected') {
            restoreLeaveCreditsOnRejection(request.id, request);
          } else if (!previousRequest) {
            restoreLeaveCreditsOnRejection(request.id, request);
          }
        }
      });
      
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  const complianceRate = documents.length > 0 
    ? Math.round((documents.filter(d => d.status === 'Complete').length / documents.length) * 100)
    : 0;

  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // ====== EFFECTS ======
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const audio = new Audio('/notification.mp3');
    setNotificationSound(audio);
  }, []);

  useEffect(() => {
    if (authUser) {
      fetchEmployeeData();
    } else if (!authLoading) {
      navigate('/login');
    }
  }, [authUser, authLoading]);

  useEffect(() => {
    if (employee && employee.id) {
      const employeeDocRef = doc(db, 'employees', employee.id);
      const unsubscribe = onSnapshot(employeeDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedData = { id: docSnapshot.id, ...docSnapshot.data() };
          setEmployee(updatedData);
          console.log('Employee data updated in real-time:', updatedData);
          
          if (updatedData.salary !== employee.salary) {
            console.log('Salary updated from', employee.salary, 'to', updatedData.salary);
            fetchEmployeePayroll();
          }
        }
      }, (error) => {
        console.error('Error listening to employee updates:', error);
      });
      
      return () => unsubscribe();
    }
  }, [employee?.id]);

  // ====== VIEW PDF MODAL ======
  const openPdfViewer = (formId) => {
    setSelectedForm(formId);
    setShowEditModal(true);
  };


  // ====== RENDER COMPLIANCE TAB ======
  const renderCompliance = () => {
    const formData = selectedForm ? complianceFiles.find(f => f.id === selectedForm) : null;

    // Build groups for uploaded documents
    const groupedDocuments = documents.reduce((acc, doc) => {
      const key = doc.documentType || 'Uncategorized';
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    }, {});
    const groupKeys = Object.keys(groupedDocuments).sort((a, b) => a.localeCompare(b));

    return (
      <div className="employee-compliance-content" style={{ padding: '20px' }}>
        <div className="section-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a2a4a' }}>My Compliance</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowUploadForm(true)} 
              className="btn-add-modern"
              style={{
                padding: '8px 16px',
                background: '#4a6fa5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <UploadIcon style={{ fontSize: 16 }} />
              Upload File
            </button>
          </div>
        </div>

        {/* Progress Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #eef2f7'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Compliance Rate</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#4a6fa5' }}>{complianceRate}%</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: '#eef2f7', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div 
              style={{ 
                width: `${complianceRate}%`,
                height: '100%',
                background: complianceRate === 100 ? '#27ae60' : '#4a6fa5',
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
          <p style={{ 
            marginTop: '8px', 
            fontSize: '13px', 
            color: '#888',
            marginBottom: 0
          }}>
            {documents.filter(d => d.status === 'Complete').length} of {documents.length} documents complete
          </p>
        </div>

        {/* Forms Grid */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#333',
            marginBottom: '8px'
          }}>
            <TextFieldsIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
            Compliance Forms
          </h3>
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
            Click a form to view PDF
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '12px' 
          }}>
            {complianceFiles.map(form => (
              <button
                key={form.id}
                onClick={() => openPdfViewer(form.id)}
                style={{
                  padding: '16px 20px',
                  background: 'white',
                  border: '1px solid #eef2f7',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4a6fa5';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,111,165,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#eef2f7';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <DescriptionIcon style={{ fontSize: 28, color: '#4a6fa5' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '500', fontSize: '13px', color: '#333' }}>{form.name}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{form.type.toUpperCase()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ====== Uploaded Documents (Grouped by Document Type) ====== */}
        <div className="documents-list">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#333',
            marginBottom: '12px'
          }}>
            Uploaded Documents
            <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#888', marginLeft: 8 }}>
              ({documents.length} file{documents.length !== 1 ? 's' : ''} in {groupKeys.length} group{groupKeys.length !== 1 ? 's' : ''})
            </span>
          </h3>

          {documents.length === 0 && (
            <p className="no-data" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              No documents found
            </p>
          )}

          {groupKeys.map(groupKey => {
            const files = groupedDocuments[groupKey];
            const isExpanded = !!expandedGroups[groupKey];

            // Determine aggregated group status
            const statuses = files.map(f => f.status);
            const allComplete = statuses.every(s => s === 'Complete');
            const anyMissing = statuses.some(s => s === 'Missing');
            const groupStatus = allComplete
              ? 'Complete'
              : anyMissing
              ? 'Missing'
              : 'Pending Review';

            return (
              <div
                key={groupKey}
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #eef2f7',
                  marginBottom: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* Group header (clickable) */}
                <div
                  onClick={() =>
                    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))
                  }
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isExpanded ? '#f8fafd' : 'white',
                    borderBottom: isExpanded ? '1px solid #eef2f7' : 'none',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <FolderIcon style={{ fontSize: 20, color: '#4a6fa5' }} />
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{groupKey}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#e8f0fe',
                        color: '#4a6fa5',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}
                    >
                      {files.length} file{files.length !== 1 ? 's' : ''}
                    </span>
                    {getDocStatusBadge(groupStatus)}
                  </div>
                  <span
                    style={{
                      fontSize: '18px',
                      color: '#888',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    ▶
                  </span>
                </div>

                {/* Expanded file list */}
                {isExpanded && (
                  <div style={{ padding: '4px 0' }}>
                    {files
                      .slice()
                      .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
                      .map(doc => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 16px 10px 44px',
                            borderTop: '1px solid #f4f6fa',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              flexWrap: 'wrap',
                              minWidth: 0,
                              flex: 1
                            }}
                          >
                            <DescriptionIcon style={{ fontSize: 16, color: '#8a9bb5', flexShrink: 0 }} />
                            <span
                              style={{
                                fontSize: '13px',
                                color: '#333',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '280px'
                              }}
                              title={doc.fileName}
                            >
                              {doc.fileName || 'Unnamed file'}
                            </span>
                            {doc.scanned && (
                              <span style={{ fontSize: '11px', color: '#27ae60' }}>📄 Scanned</span>
                            )}
                            {getDocStatusBadge(doc.status)}
                            <span style={{ fontSize: '11px', color: '#aaa' }}>
                              {doc.uploadedAt
                                ? new Date(doc.uploadedAt).toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                          <div>
                            {doc.fileUrl && (
                              <button
                                onClick={() => openFileViewer(doc.fileUrl, doc.fileName)}
                                style={{
                                  padding: '5px 12px',
                                  background: '#4a6fa5',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px'
                                }}
                              >
                                <VisibilityIcon style={{ fontSize: 14 }} />
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* PDF Viewer Modal */}
        {showEditModal && formData && (
          <div 
            className="modal-overlay" 
            onClick={() => setShowEditModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()} 
              style={{ 
                maxWidth: '95vw', 
                maxHeight: '95vh',
                width: '95vw',
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid #eef2f7',
                flexShrink: 0
              }}>
                <h3 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PictureAsPdfIcon style={{ fontSize: 20 }} />
                  {formData.name}
                </h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '20px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ 
                padding: '12px',
                background: '#f5f7fa',
                minHeight: isMobile ? '60vh' : '70vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {formData.type === 'pdf' ? (
                  <iframe
                    src={formData.file}
                    style={{
                      width: '100%',
                      height: isMobile ? '60vh' : '75vh',
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
                      maxHeight: isMobile ? '60vh' : '75vh',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      background: 'white'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="modal-overlay" onClick={() => setShowUploadForm(false)}>
            <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', borderRadius: '12px' }}>
              <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7' }}>
                <h3 style={{ margin: 0 }}>Upload Document</h3>
                <button className="modal-close" onClick={() => setShowUploadForm(false)} style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}>✕</button>
              </div>
              
              <div style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Document Type</label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="upload-select"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #dde1e8',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    required
                  >
                    <option value="">Select Document Type</option>
                    <option value="Accomplishment">Accomplishment Report</option>
                    <option value="Certificates">Certificates</option>
                    <option value="DTR">Daily Time Record (DTR)</option>
                    <option value="IPCR">Individual Performance Commitment and Review (IPCR)</option>
                    <option value="Pass Slip">Pass Slip</option>
                    <option value="Personal Data Sheet">Personal Data Sheet</option>
                    <option value="SALN">Statement of Assets, Liabilities, and Net Worth (SALN)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>
                    Choose File(s) <span style={{ color: '#888', fontWeight: 'normal' }}>— you can select multiple</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="upload-input"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #dde1e8',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    required
                  />
                  {selectedFiles.length > 0 && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: '#f8fafd',
                        borderRadius: '8px',
                        border: '1px solid #eef2f7',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '6px', color: '#4a6fa5' }}>
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected:
                      </div>
                      {selectedFiles.map((f, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 0',
                            borderTop: idx > 0 ? '1px dashed #e6ecf5' : 'none'
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '300px'
                            }}
                            title={f.name}
                          >
                            {f.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#888', fontSize: '11px' }}>
                              {(f.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedFiles(prev => prev.filter((_, i) => i !== idx))
                              }
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#e74c3c',
                                cursor: 'pointer',
                                fontSize: '14px',
                                lineHeight: 1,
                                padding: '0 4px'
                              }}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button 
                    onClick={handleDocumentUpload} 
                    className="btn-save" 
                    disabled={uploading || selectedFiles.length === 0 || !selectedDocType}
                    style={{
                      padding: '10px 32px',
                      background: (!uploading && selectedFiles.length > 0 && selectedDocType) ? '#4a6fa5' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (!uploading && selectedFiles.length > 0 && selectedDocType) ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {uploading
                      ? `Uploading ${uploadProgress}%...`
                      : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} File${selectedFiles.length !== 1 ? 's' : ''}`}
                  </button>
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    onClick={() => setShowUploadForm(false)}
                    disabled={uploading}
                    style={{
                      padding: '10px 24px',
                      background: '#f0f2f7',
                      color: '#333',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {uploadStatus && <p className="upload-status" style={{ marginTop: '12px', fontSize: '13px', color: uploadStatus.includes('success') || uploadStatus.includes('✅') ? '#27ae60' : uploadStatus.includes('⚠️') ? '#e67e22' : '#666', textAlign: 'center' }}>{uploadStatus}</p>}
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
          </div>
        )}
      </div>
    );
  };

  // ====== RENDER DASHBOARD ======
  const renderDashboard = () => (
    <div className="employee-dashboard-content">
      <div className="welcome-header">
        <h1>Welcome, {employee?.fullName}</h1>
        <p>Here's your HR overview</p>
      </div>

      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon green" style={{ background: '#d4edda', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircleIcon style={{ color: '#27ae60' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>Leave Balance</h3>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{leaveBalance.vacationLeave || 0} VL / {leaveBalance.sickLeave || 0} SL / {leaveBalance.maternityLeave || 0} ML / {leaveBalance.paternityLeave || 0} PL</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon orange" style={{ background: '#fff3cd', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HourglassEmptyIcon style={{ color: '#f39c12' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>Pending Leaves</h3>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{pendingLeaves}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon purple" style={{ background: '#e8d5f5', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FolderIcon style={{ color: '#8e44ad' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>Compliance Rate</h3>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{complianceRate}%</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon blue" style={{ background: '#d4e0f7', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><NotificationsIcon style={{ color: '#4a6fa5' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>Notifications</h3>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{unreadNotifications}</p>
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
                  Late Days: {employeeLateDays} (Deduction: {formatCurrency(employeeLateDeduction)})
                </p>
              )}
              {employeeLateDays === 0 && employeePayroll && (
                <p style={{ margin: '2px 0', fontSize: '13px', color: '#27ae60' }}>
                  No late deductions this month
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

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="dashboard-box" style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '16px' }}>Quick Actions</h2>
          <div className="actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button onClick={() => { setActiveTab('attendance'); }} className="action-btn blue" style={{ padding: '12px', background: '#719de7', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}>
              <AccessTimeIcon style={{ fontSize: 18 }} />
              Time In/Out
            </button>
            <button onClick={() => { setActiveTab('leave'); setShowLeaveForm(true); }} className="action-btn green" style={{ padding: '12px', background: '#5fd079', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}>
              <CalendarTodayIcon style={{ fontSize: 18 }} />
              File Leave
            </button>
            <button onClick={() => { setActiveTab('compliance'); setShowUploadForm(true); }} className="action-btn purple" style={{ padding: '12px', background: '#b082cf', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}>
              <UploadIcon style={{ fontSize: 18 }} />
              Upload Document
            </button>
            <button onClick={() => setActiveTab('notifications')} className="action-btn orange" style={{ padding: '12px', background: '#dabc5a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}>
              <NotificationsIcon style={{ fontSize: 18 }} />
              Notifications
            </button>
          </div>
        </div>

        <div className="dashboard-box" style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '16px' }}>Recent Leave Requests</h2>
          {leaveRequests.slice(0, 3).map(req => (
            <div key={req.id} className="recent-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f2f7' }}>
              <span className="recent-type" style={{ fontWeight: '500' }}>{req.type}</span>
              <span className="recent-dates" style={{ fontSize: '13px', color: '#666' }}>{req.startDate} → {req.endDate}</span>
              {getStatusBadge(req.status)}
            </div>
          ))}
          {leaveRequests.length === 0 && (
            <p className="no-data" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No leave requests yet</p>
          )}
        </div>
      </div>
    </div>
  );

  // ====== RENDER ATTENDANCE ======
  const renderAttendance = () => (
    <div className="employee-attendance-content">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}><AccessTimeIcon style={{ fontSize: 24, marginRight: 10, verticalAlign: 'middle' }} /> My Attendance</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="stats-badge" style={{ padding: '6px 14px', background: '#678ed2', borderRadius: '6px', fontSize: '13px' }}>{new Date().toLocaleDateString()}</span>
          <button 
            onClick={downloadAttendancePDF}
            disabled={attendanceRecords.length === 0}
            style={{
              padding: '8px 18px',
              background: attendanceRecords.length === 0 ? '#ccc' : '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: attendanceRecords.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: attendanceRecords.length === 0 ? 0.6 : 1
            }}
          >
            <PictureAsPdfIcon style={{ fontSize: 18 }} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon blue" style={{ fontSize: '24px' }}><EventNoteIcon /></div>
          <div className="stat-info">
            <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Total Days</h3>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{attendanceSummary.totalDays}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon green" style={{ fontSize: '24px' }}><CheckCircleIcon style={{ color: '#27ae60' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Present</h3>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{attendanceSummary.presentDays}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon orange" style={{ fontSize: '24px' }}><WarningIcon style={{ color: '#f39c12' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Late</h3>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{attendanceSummary.lateDays}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon purple" style={{ fontSize: '24px' }}><WarningIcon style={{ color: '#8e44ad' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Under Time</h3>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{attendanceSummary.underTimeDays || 0}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon success" style={{ fontSize: '24px' }}><CheckCircleIcon style={{ color: '#27ae60' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Over Time</h3>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{attendanceSummary.overTimeDays || 0}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon red" style={{ fontSize: '24px' }}><CancelIcon style={{ color: '#e74c3c' }} /></div>
          <div className="stat-info">
            <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Absent</h3>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{attendanceSummary.absentDays || 0}</p>
          </div>
        </div>
      </div>

      <div className="form-card-modern" style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '10px' }}>
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

      <div className="form-card-modern" style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '10px' }}>
          <TimelineIcon />
          Attendance History
        </h3>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="attendance-table-modern" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafd', borderBottom: '2px solid #eef2f7' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>AM In</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>AM Out</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>AM Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>PM In</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>PM Out</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>PM Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Daily Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length > 0 ? (
                (() => {
                  const recordsByDate = {};
                  attendanceRecords.forEach(record => {
                    if (!recordsByDate[record.date]) {
                      recordsByDate[record.date] = [];
                    }
                    recordsByDate[record.date].push(record);
                  });

                  const sortedDates = Object.keys(recordsByDate).sort((a, b) => b.localeCompare(a));

                  return sortedDates.slice(0, 50).map((date, index) => {
                    const dayRecords = recordsByDate[date].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
                    
                    let amTimeIn = '—';
                    let amTimeOut = '—';
                    let amStatus = '—';
                    let pmTimeIn = '—';
                    let pmTimeOut = '—';
                    let pmStatus = '—';
                    let combinedStatus = 'Present';
                    let remarks = '';

                    dayRecords.forEach(record => {
                      const entryNum = record.entryNumber || 1;
                      const timeInVal = record.timeIn || '';
                      const timeOutVal = record.timeOut || '';
                      const status = record.status || 'Present';
                      
                      if (entryNum === 1 || entryNum === 0) {
                        amTimeIn = timeInVal || '—';
                        amTimeOut = timeOutVal || '—';
                        amStatus = status;
                      } else if (entryNum === 2) {
                        pmTimeIn = timeInVal || '—';
                        pmTimeOut = timeOutVal || '—';
                        pmStatus = status;
                      }
                      
                      if (record.status === 'Under Time' && record.undertimeMinutes) {
                        const remark = `Undertime: ${record.undertimeMinutes} mins`;
                        remarks = remarks ? `${remarks}, ${remark}` : remark;
                      } else if (record.status === 'Over Time' && record.overtimeMinutes) {
                        const remark = `Overtime: ${record.overtimeMinutes} mins`;
                        remarks = remarks ? `${remarks}, ${remark}` : remark;
                      } else if (record.status === 'Late') {
                        remarks = remarks ? `${remarks}, Late` : 'Late';
                      } else if (record.status === 'On Time') {
                        remarks = remarks ? `${remarks}, On time` : 'On time';
                      }
                    });

                    if (pmStatus && pmStatus !== '—' && pmStatus !== 'Present' && pmStatus !== 'On Time') {
                      combinedStatus = pmStatus;
                    } else if (amStatus && amStatus !== '—' && (amStatus === 'Late' || amStatus === 'Under Time')) {
                      combinedStatus = amStatus;
                    } else if (amStatus === 'Over Time' || pmStatus === 'Over Time') {
                      combinedStatus = 'Over Time';
                    } else if (amStatus === 'On Time' || pmStatus === 'On Time' || amStatus === 'Present' || pmStatus === 'Present') {
                      combinedStatus = 'On Time';
                    } else if (amStatus === '—' && pmStatus === '—') {
                      combinedStatus = 'Absent';
                    }

                    if (remarks && remarks.startsWith(', ')) {
                      remarks = remarks.substring(2);
                    }

                    const getStatusBadgeForTable = (status) => {
                      if (status === '—' || status === 'Absent') {
                        return <span className="status-badge secondary">{status}</span>;
                      }
                      return getAttendanceStatusBadge(status);
                    };

                    return (
                      <tr key={date} style={{ borderBottom: '1px solid #f0f2f7' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '10px 14px' }}>{date}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{amTimeIn}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{amTimeOut}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{getStatusBadgeForTable(amStatus)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{pmTimeIn}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{pmTimeOut}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{getStatusBadgeForTable(pmStatus)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{getStatusBadgeForTable(combinedStatus)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: '#666' }}>{remarks || '—'}</td>
                      </tr>
                    );
                  });
                })()
              ) : (
                <tr>
                  <td colSpan="10" className="empty-state" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No attendance records found
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
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>Application for Leave</h2>
        <button onClick={() => setShowLeaveForm(true)} className="btn-add-modern" style={{ padding: '8px 16px', background: '#4a6fa5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
          <CalendarTodayIcon style={{ fontSize: 18 }} />
          File Leave
        </button>
      </div>

      <div className="leave-balance-card" style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Your Leave Balance</h3>
        <div className="balance-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div className="balance-item" style={{ background: '#f8fafd', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <span className="balance-label" style={{ fontSize: '13px', color: '#666' }}>Vacation Leave</span>
            <span className="balance-value" style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', display: 'block' }}>{leaveBalance.vacationLeave || 0} days</span>
          </div>
          <div className="balance-item" style={{ background: '#f8fafd', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <span className="balance-label" style={{ fontSize: '13px', color: '#666' }}>Sick Leave</span>
            <span className="balance-value" style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', display: 'block' }}>{leaveBalance.sickLeave || 0} days</span>
          </div>
          <div className="balance-item" style={{ background: '#f8fafd', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <span className="balance-label" style={{ fontSize: '13px', color: '#666' }}>Maternity Leave</span>
            <span className="balance-value" style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', display: 'block' }}>{leaveBalance.maternityLeave || 0} days</span>
          </div>
          <div className="balance-item" style={{ background: '#f8fafd', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <span className="balance-label" style={{ fontSize: '13px', color: '#666' }}>Paternity Leave</span>
            <span className="balance-value" style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', display: 'block' }}>{leaveBalance.paternityLeave || 0} days</span>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="leave-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: '#f8fafd', borderBottom: '2px solid #eef2f7' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Dates</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Days</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Reason</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map(req => (
              <tr key={req.id} style={{ borderBottom: '1px solid #f0f2f7' }}>
                <td style={{ padding: '12px 16px' }}>{req.type}</td>
                <td style={{ padding: '12px 16px' }}>{req.startDate} → {req.endDate}</td>
                <td style={{ padding: '12px 16px' }}>{req.days}</td>
                <td style={{ padding: '12px 16px' }}>{req.reason || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(req.status)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {req.status === 'Pending' && (
                    <button 
                      onClick={() => handleCancelLeave(req.id, req)}
                      className="btn-cancel-leave"
                      title="Cancel Leave Request"
                      style={{
                        padding: '4px 12px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <DeleteIcon style={{ fontSize: 16 }} />
                      Cancel
                    </button>
                  )}
                  {req.status !== 'Pending' && (
                    <span className="no-action" style={{ color: '#999' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {leaveRequests.length === 0 && (
              <tr><td colSpan="6" className="empty-state" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No leave requests found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showLeaveForm && (
        <div className="modal-overlay" onClick={() => setShowLeaveForm(false)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', maxWidth: '500px', width: '100%', padding: '0', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>File Leave Request</h3>
              <button className="modal-close" onClick={() => setShowLeaveForm(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
            </div>
            <form onSubmit={handleLeaveSubmit} style={{ padding: '20px' }}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Leave Type *</label>
                  <select 
                    value={leaveFormData.type} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, type: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #dde1e8', borderRadius: '8px', fontSize: '14px' }}
                    required
                  >
                    <option value="Vacation">Vacation Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Maternity">Maternity Leave</option>
                    <option value="Paternity">Paternity Leave</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Start Date *</label>
                  <input 
                    type="date" 
                    value={leaveFormData.startDate} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, startDate: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #dde1e8', borderRadius: '8px', fontSize: '14px' }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>End Date *</label>
                  <input 
                    type="date" 
                    value={leaveFormData.endDate} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, endDate: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #dde1e8', borderRadius: '8px', fontSize: '14px' }}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px' }}>Reason</label>
                  <textarea 
                    placeholder="Enter reason for leave"
                    value={leaveFormData.reason} 
                    onChange={(e) => setLeaveFormData({...leaveFormData, reason: e.target.value})}
                    rows="3"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #dde1e8', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
              <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="submit" className="btn-save" disabled={submitting} style={{ padding: '10px 32px', background: '#4a6fa5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowLeaveForm(false)} style={{ padding: '10px 24px', background: '#f0f2f7', color: '#333', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
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
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Notifications</h2>
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
            <span className="badge-count-large" style={{ padding: '6px 14px', background: '#f61e1b', borderRadius: '6px', fontSize: '13px' }}>{unreadNotifications} unread</span>
          </div>
        </div>

        <div className="notifications-list">
          {sortedNotifications.length === 0 && (
            <div className="no-notifications" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
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
                        background: '#e8dacd',
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

  // ====== RENDER PAYROLL ======
  const renderPayroll = () => {
    const hasCurrentPayroll = !!employeePayroll;
    const hasHistory = allPayrollHistory.length > 0;
    const position = employee?.position || employee?.employmentType || 'Unknown';
    const usesLeaveCredits = LEAVE_CREDIT_POSITIONS.includes(position);
    const usesMonetaryDeduction = MONETARY_DEDUCTION_POSITIONS.includes(position);

    return (
      <div className="employee-payroll-content">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}><AttachMoneyIcon style={{ fontSize: 24, marginRight: 10, verticalAlign: 'middle' }} /> My Payroll</h2>
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
              <>
                <span className="stats-badge" style={{ padding: '6px 14px', background: '#e8f0fe', borderRadius: '6px', fontSize: '13px' }}>
                  {employeePayroll.periodMonth} {employeePayroll.periodYear}
                </span>
              </>
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
          <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div className="stat-card blue" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div className="stat-icon"><AttachMoneyIcon style={{ fontSize: 24, color: '#4a6fa5' }} /></div>
              <div className="stat-info">
                <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Total Earned</h3>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{formatCurrency(payrollSummary.totalEarned)}</p>
              </div>
            </div>
            <div className="stat-card red" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div className="stat-icon"><TrendingDownIcon style={{ fontSize: 24, color: '#e74c3c' }} /></div>
              <div className="stat-info">
                <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Total Deductions</h3>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{formatCurrency(payrollSummary.totalDeductions)}</p>
              </div>
            </div>
            <div className="stat-card green" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div className="stat-icon"><CheckCircleIcon style={{ fontSize: 24, color: '#27ae60' }} /></div>
              <div className="stat-info">
                <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Total Net Pay</h3>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{formatCurrency(payrollSummary.totalNetPay)}</p>
              </div>
            </div>
            <div className="stat-card orange" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div className="stat-icon"><WarningIcon style={{ fontSize: 24, color: '#f39c12' }} /></div>
              <div className="stat-info">
                <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Total Late Days</h3>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{payrollSummary.totalLateDays} days</p>
              </div>
            </div>
            {payrollSummary.totalLeaveCreditsUsed > 0 && (
              <div className="stat-card teal" style={{ background: 'white', borderRadius: '10px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                <div className="stat-icon"><PeopleIcon style={{ fontSize: 24, color: '#1abc9c' }} /></div>
                <div className="stat-info">
                  <h3 style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Leave Credits Used</h3>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{payrollSummary.totalLeaveCreditsUsed.toFixed(1)} days</p>
                </div>
              </div>
            )}
          </div>
        )}

        {hasCurrentPayroll && (
          <div className="form-card-modern" style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
              Current Month Payroll
              <span style={{ fontSize: '13px', fontWeight: 'normal', marginLeft: '12px', color: '#666' }}>
                ({employeePayroll.periodMonth} {employeePayroll.periodYear})
              </span>
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '10px 0'
            }}>
              <div>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Period:</strong></p>
                <p style={{ margin: '5px 0' }}>{employeePayroll.periodStart} to {employeePayroll.periodEnd}</p>
              </div>
              <div>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Basic Salary:</strong></p>
                <p style={{ margin: '5px 0', fontWeight: '500' }}>{formatCurrency(employeePayroll.basicSalary)}</p>
              </div>
              <div>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Late Days:</strong></p>
                <p style={{ margin: '5px 0', color: employeeLateDays > 0 ? '#e67e22' : '#27ae60', fontWeight: '500' }}>
                  {employeeLateDays > 0 ? `${employeeLateDays} days` : 'None ✅'}
                </p>
              </div>
              <div>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Deduction Type:</strong></p>
                <p style={{ margin: '5px 0', 
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
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Leave Credits Used:</strong></p>
                  <p style={{ margin: '5px 0', color: '#27ae60', fontWeight: '600' }}>
                    {employeePayroll.leaveCreditsUsed.toFixed(1)} days
                  </p>
                </div>
              )}
              {deductionType === 'monetary' && employeePayroll.monetaryDeduction > 0 && (
                <div>
                  <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Monetary Deduction:</strong></p>
                  <p style={{ margin: '5px 0', color: '#e74c3c', fontWeight: '600' }}>
                    {formatCurrency(employeePayroll.monetaryDeduction)}
                  </p>
                </div>
              )}
              <div>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Net Pay:</strong></p>
                <p style={{ margin: '5px 0', fontSize: '20px', fontWeight: 'bold', color: '#4a6fa5' }}>
                  {formatCurrency(employeePayroll.netPay)}
                </p>
              </div>
              <div>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '13px' }}><strong>Status:</strong></p>
                <span className={`status-badge ${employeePayroll.status === 'Paid' ? 'success' : 'warning'}`}>
                  {employeePayroll.status === 'Paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {hasHistory && (
          <div className="form-card-modern" style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
              Payroll History
              <span style={{ fontSize: '13px', fontWeight: 'normal', marginLeft: '12px', color: '#666' }}>
                {allPayrollHistory.length} record{allPayrollHistory.length > 1 ? 's' : ''}
              </span>
            </h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="payroll-history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafd', borderBottom: '2px solid #eef2f7' }}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!hasCurrentPayroll && !hasHistory && (
          <div className="form-card-modern" style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <AttachMoneyIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 16px' }} />
            <h3 style={{ marginTop: 0 }}>No Payroll Records Found</h3>
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
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>My Profile</h2>
      </div>

      <div className="profile-card" style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="profile-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#4a6fa5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', flexShrink: 0 }}>
          <span>{employee?.fullName?.charAt(0) || '?'}</span>
        </div>
        <div className="profile-details" style={{ flex: 1, minWidth: '250px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px' }}>{employee?.fullName}</h3>
          <p style={{ margin: '6px 0', color: '#666' }}><BusinessIcon style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }} /> {employee?.department}</p>
          <p style={{ margin: '6px 0', color: '#666' }}><WorkIcon style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }} /> {employee?.position}</p>
          <p style={{ margin: '6px 0', color: '#666' }}><EmailIcon style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }} /> {employee?.email}</p>
          <p style={{ margin: '6px 0', color: '#666' }}><CalendarTodayIcon style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }} /> Hired: {employee?.dateHired || 'N/A'}</p>
          <p style={{ margin: '6px 0', color: '#666' }}><AttachMoneyIcon style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }} /> Salary: {formatCurrency(employee?.salary)}</p>
          <p style={{ margin: '6px 0', color: '#666' }}><PersonIcon style={{ fontSize: 16, marginRight: 8, verticalAlign: 'middle' }} /> Status: <span className={`status-dot ${employee?.status === 'Inactive' ? 'inactive' : 'active'}`} style={{ padding: '2px 12px', borderRadius: '12px', background: employee?.status === 'Inactive' ? '#f8d7da' : '#d4edda', color: employee?.status === 'Inactive' ? '#721c24' : '#155724', fontSize: '13px' }}>
            {employee?.status || 'Active'}
          </span></p>
        </div>
      </div>
    </div>
  );

  // ====== RENDER PAYSLIP MODAL ======
  const renderPayslipModal = () => {
    if (!showPayslipModal || !selectedPayroll) return null;

    const payroll = selectedPayroll;

    const printModalPayslip = () => {
      setShowPayslipModal(false);
      setTimeout(() => {
        printPayslip(payroll);
      }, 300);
    };

    return (
      <div className="modal-overlay" onClick={() => setShowPayslipModal(false)} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', maxWidth: '700px', width: '100%', padding: '0', maxHeight: '90vh', overflow: 'auto' }}>
          <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>
              <PictureAsPdfIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
              Payslip Details
            </h3>
            <button className="modal-close" onClick={() => setShowPayslipModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
          </div>
          <div style={{ padding: '20px' }}>
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
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{employee?.fullName}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Period</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{payroll.periodStart} → {payroll.periodEnd}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase' }}>Department</label>
                <p style={{ fontWeight: '600', margin: '2px 0' }}>{employee?.department || 'N/A'}</p>
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
                onClick={printModalPayslip}
                style={{
                  background: '#2c3e50',
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
                onMouseEnter={(e) => { e.target.style.background = '#1a2a4a'; }}
                onMouseLeave={(e) => { e.target.style.background = '#2c3e50'; }}
              >
                <PrintIcon style={{ fontSize: 18 }} />
                Print Payslip
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

  // ====== SIDEBAR ======
  const Sidebar = () => (
    <div className={`employee-sidebar ${sidebarOpen ? 'open' : 'closed'}`} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '250px',
      background: '#1a2a4a',
      color: 'white',
      transition: 'transform 0.3s ease',
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
      zIndex: 100,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="sidebar-top" style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <img src={logo} alt="LGU Logo" className="sidebar-logo" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '8px' }} />
        <h3 style={{ margin: 0, fontSize: '18px' }}>HR System</h3>
        <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Pagbilao LGU</p>
        <div className="user-badge" style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <span className="user-name" style={{ display: 'block', fontWeight: 'bold', fontSize: '14px' }}>{employee?.fullName}</span>
          <span className="user-role" style={{ display: 'block', fontSize: '12px', opacity: 0.8 }}>{employee?.position}</span>
          <span className="user-dept" style={{ display: 'block', fontSize: '11px', opacity: 0.6 }}>{employee?.department}</span>
        </div>
      </div>

      <div className="sidebar-menu" style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {[
          { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
          { id: 'attendance', icon: <AccessTimeIcon />, label: 'Attendance' },
          { id: 'leave', icon: <CalendarTodayIcon />, label: 'Leave Management', badge: pendingLeaves },
          { id: 'compliance', icon: <FolderIcon />, label: 'My Compliance' },
          { id: 'notifications', icon: <NotificationsIcon />, label: 'Notifications', badge: unreadNotifications },
          { id: 'payroll', icon: <AttachMoneyIcon />, label: 'My Payroll' },
          { id: 'profile', icon: <PersonIcon />, label: 'My Profile' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => { setActiveTab(item.id); if(isMobile) setSidebarOpen(false); }}
            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px 20px',
              background: activeTab === item.id ? 'rgba(74,111,165,0.3)' : 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              gap: '12px',
              position: 'relative'
            }}
            onMouseEnter={(e) => { if (activeTab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { if (activeTab !== item.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span style={{
                position: 'absolute',
                right: '16px',
                background: '#e74c3c',
                color: 'white',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 'bold'
              }}>{item.badge}</span>
            )}
          </button>
        ))}

        <button onClick={handleLogout} className="logout-btn" style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '12px 20px',
          background: 'transparent',
          border: 'none',
          color: '#e74c3c',
          fontSize: '14px',
          cursor: 'pointer',
          gap: '12px',
          marginTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '20px'
        }}>
          <LogoutIcon style={{ fontSize: 20 }} />
          Logout
        </button>
      </div>
    </div>
  );

  // ====== PREVIEW MODAL ======
  const renderPreviewModal = () => {
    if (!previewFile) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setPreviewFile(false)} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div className="modal-form" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', maxWidth: '90%', maxHeight: '90%', width: '100%', padding: '0', overflow: 'hidden' }}>
          <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{previewFileName || 'Document Preview'}</h3>
            <button className="modal-close" onClick={() => setPreviewFile(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
          </div>
          <div style={{ padding: '20px', height: '80vh', minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5' }}>
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

  // ====== MAIN RETURN ======
  if (loading || authLoading) {
    return <div className="loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }}>Loading your portal...</div>;
  }

  if (!employee) {
    return <div className="error" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#e74c3c' }}>No employee profile found. Please contact HR.</div>;
  }

  return (
    <div className="employee-portal" style={{ display: 'flex', minHeight: '100vh', background: '#f0f4fe' }}>
      {renderPreviewModal()}

      {showNotificationAlert && latestNotification && (
        <div className={`notification-alert ${latestNotification.status === 'Approved' ? 'approved' : 'rejected'}`} style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 24px',
          borderRadius: '12px',
          background: latestNotification.status === 'Approved' ? '#d4edda' : '#f8d7da',
          border: `2px solid ${latestNotification.status === 'Approved' ? '#27ae60' : '#e74c3c'}`,
          zIndex: 2000,
          maxWidth: '400px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease'
        }}>
          <div className="alert-content" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="alert-icon" style={{ fontSize: '24px' }}>
              {latestNotification.status === 'Approved' ? '✅' : '❌'}
            </span>
            <span className="alert-message" style={{ flex: 1, fontSize: '14px' }}>{latestNotification.message}</span>
            <button onClick={dismissAlert} className="alert-close" style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>×</button>
          </div>
        </div>
      )}

      {isMobile && (
        <div className="mobile-header" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: '#1a2a4a',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 99
        }}>
          <button onClick={toggleSidebar} className="menu-btn" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <MenuIcon />
          </button>
          <span className="mobile-title" style={{ fontSize: '16px', fontWeight: 'bold' }}>HR System</span>
          <span className="mobile-user" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4a6fa5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{employee?.fullName?.charAt(0) || '?'}</span>
        </div>
      )}

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 99
        }}></div>
      )}

      <Sidebar />

      <div className={`employee-main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} style={{
        flex: 1,
        padding: isMobile ? '70px 16px 16px' : '24px',
        marginLeft: isMobile ? 0 : (sidebarOpen ? '250px' : '0'),
        transition: 'margin-left 0.3s ease',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'leave' && renderLeave()}
        {activeTab === 'compliance' && renderCompliance()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'payroll' && renderPayroll()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {renderPayslipModal()}
    </div>
  );
}

export default EmployeePortal;