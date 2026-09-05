// src/components/Attendance.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where, orderBy, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Material-UI Icons
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import WarningIcon from '@mui/icons-material/Warning';
import InboxIcon from '@mui/icons-material/Inbox';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';

function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const attendanceRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
    setupRealtimeListeners();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [attendanceRecords, employees, filterDate]);

  const setupRealtimeListeners = () => {
    // Listen to attendance changes in real-time
    onSnapshot(collection(db, 'attendance'), () => {
      fetchAttendanceRecords();
    });
    
    // Listen to employee changes
    onSnapshot(collection(db, 'employees'), () => {
      fetchEmployees();
    });
  };

  const fetchEmployees = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empList);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'attendance'));
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchEmployees();
    await fetchAttendanceRecords();
    setRefreshing(false);
  };

  const recordAttendance = async () => {
    if (!selectedEmployee || !date || !timeIn) {
      alert('Please fill all required fields');
      return;
    }

    // Check if attendance already exists for this employee on this date
    const existing = attendanceRecords.find(
      r => r.employeeId === selectedEmployee && r.date === date
    );
    if (existing) {
      alert('Attendance already recorded for this employee on this date.');
      return;
    }

    setLoading(true);
    try {
      const status = timeIn <= '07:00' ? 'On Time' : 'Late';
      
      await addDoc(collection(db, 'attendance'), {
        employeeId: selectedEmployee,
        employeeName: getEmployeeName(selectedEmployee),
        department: getEmployeeDepartment(selectedEmployee),
        date: date,
        timeIn: timeIn,
        timeOut: timeOut || null,
        status: status,
        recordedBy: 'Admin',
        recordedAt: new Date().toISOString()
      });
      
      alert('Attendance recorded successfully');
      setSelectedEmployee('');
      setTimeIn('');
      setTimeOut('');
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Error recording attendance:', error);
      alert('❌ Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (timeInValue) => {
    const threshold = '07:00';
    return timeInValue <= threshold ? 'Present' : 'Late';
  };

  const calculateSummary = () => {
    const filteredRecords = attendanceRecords.filter(record => record.date === filterDate);
    const presentCount = filteredRecords.filter(r => r.status === 'Present' || r.status === 'On Time').length;
    const lateCount = filteredRecords.filter(r => r.status === 'Late').length;
    const totalEmployees = employees.length;
    const presentEmployees = new Set(filteredRecords.map(r => r.employeeId)).size;
    const absentCount = totalEmployees - presentEmployees;
    
    setSummary({
      present: presentCount,
      late: lateCount,
      absent: absentCount > 0 ? absentCount : 0,
      total: totalEmployees
    });
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName || emp.name || 'Unknown' : 'Unknown';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.department || 'N/A' : 'N/A';
  };

  const filteredRecords = attendanceRecords.filter(record => record.date === filterDate);

  // Sort records by time in
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (a.timeIn && b.timeIn) {
      return a.timeIn.localeCompare(b.timeIn);
    }
    return 0;
  });

  // Group records by employee for AM/PM display
  const getRecordsGroupedByEmployee = () => {
    const grouped = {};
    sortedRecords.forEach(record => {
      if (!grouped[record.employeeId]) {
        grouped[record.employeeId] = [];
      }
      grouped[record.employeeId].push(record);
    });
    return grouped;
  };

  // Get AM/PM entries for an employee with separate statuses
  const getAMPMEntries = (employeeRecords) => {
    const sorted = [...employeeRecords].sort((a, b) => (a.entryNumber || 0) - (b.entryNumber || 0));
    
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

  // Get status color for PDF/Print
  const getStatusColor = (status) => {
    if (status === 'Late' || status === 'Under Time') return '#e67e22';
    if (status === 'Over Time') return '#27ae60';
    if (status === 'On Time' || status === 'Present') return '#2ecc71';
    return '#888';
  };

  // ===== EXPORT FUNCTIONS =====

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text('Attendance Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(74, 111, 165);
      doc.text('Human Resource Management - Pagbilao, Quezon', pageWidth / 2, 28, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(`Date: ${new Date(filterDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pageWidth / 2, 35, { align: 'center' });
      
      doc.setDrawColor(74, 111, 165);
      doc.setLineWidth(0.5);
      doc.line(20, 40, pageWidth - 20, 40);
      
      let yPosition = 48;
      
      // Summary Cards as a table
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Summary', 20, yPosition);
      yPosition += 8;
      
      const summaryRows = [
        ['Present', summary.present.toString()],
        ['Late', summary.late.toString()],
        ['Absent', summary.absent.toString()],
        ['Total Employees', summary.total.toString()]
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Status', 'Count']],
        body: summaryRows,
        theme: 'striped',
        headStyles: { 
          fillColor: [74, 111, 165], 
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: 'bold'
        },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });
      
      yPosition = doc.lastAutoTable.finalY + 12;
      
      // Check if we need a new page
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Attendance Records with AM/PM columns including statuses
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Attendance Records (AM/PM Entries)', 20, yPosition);
      yPosition += 8;
      
      const groupedRecords = getRecordsGroupedByEmployee();
      const employeeIds = Object.keys(groupedRecords);
      
      if (employeeIds.length > 0) {
        const attendanceRows = employeeIds.map((empId, index) => {
          const empRecords = groupedRecords[empId];
          const { amTimeIn, amTimeOut, amStatus, pmTimeIn, pmTimeOut, pmStatus, combinedStatus, remarks } = getAMPMEntries(empRecords);
          
          return [
            (index + 1).toString(),
            getEmployeeName(empId),
            getEmployeeDepartment(empId),
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
        
        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Employee', 'Dept', 'AM In', 'AM Out', 'AM Status', 'PM In', 'PM Out', 'PM Status', 'Daily Status', 'Remarks']],
          body: attendanceRows,
          theme: 'striped',
          headStyles: { 
            fillColor: [74, 111, 165], 
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
          },
          styles: { fontSize: 8 },
          margin: { left: 12, right: 12 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 30 },
            2: { cellWidth: 22 },
            3: { cellWidth: 14 },
            4: { cellWidth: 14 },
            5: { cellWidth: 16 },
            6: { cellWidth: 14 },
            7: { cellWidth: 14 },
            8: { cellWidth: 16 },
            9: { cellWidth: 18 },
            10: { cellWidth: 30 }
          }
        });
      } else {
        // No records message
        doc.setFontSize(12);
        doc.setTextColor(127, 140, 141);
        doc.text('No attendance records found for this date.', pageWidth / 2, yPosition + 10, { align: 'center' });
      }
      
      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Attendance Report | ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`Attendance_Report_${filterDate}.pdf`);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Handle Print
  const handlePrint = () => {
    try {
      const groupedRecords = getRecordsGroupedByEmployee();
      const employeeIds = Object.keys(groupedRecords);
      
      let recordsHTML = '';
      if (employeeIds.length > 0) {
        recordsHTML = employeeIds.map((empId, index) => {
          const empRecords = groupedRecords[empId];
          const { amTimeIn, amTimeOut, amStatus, pmTimeIn, pmTimeOut, pmStatus, combinedStatus, remarks } = getAMPMEntries(empRecords);
          
          const amColor = getStatusColor(amStatus);
          const pmColor = getStatusColor(pmStatus);
          const combinedColor = getStatusColor(combinedStatus);
          
          return `
            <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">${getEmployeeName(empId)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">${getEmployeeDepartment(empId)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${amTimeIn}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${amTimeOut}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; color: ${amColor}; font-weight: 600;">${amStatus}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${pmTimeIn}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${pmTimeOut}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; color: ${pmColor}; font-weight: 600;">${pmStatus}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; color: ${combinedColor}; font-weight: 700;">${combinedStatus}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; color: #666;">${remarks || '—'}</td>
            </tr>
          `;
        }).join('');
      }

      const printContent = `
        <div style="padding: 15px; font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; font-size: 12px;">
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #4a6fa5;">
            <h1 style="color: #2c3e50; font-size: 24px; margin: 0;">Human Resource Management</h1>
            <h2 style="color: #4a6fa5; font-size: 18px; margin: 5px 0;">Pagbilao, Quezon</h2>
            <h3 style="color: #34495e; font-size: 16px; margin: 8px 0;">Attendance Report (AM/PM Entries)</h3>
            <p style="color: #7f8c8d; font-size: 13px;">
              Date: ${new Date(filterDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p style="color: #7f8c8d; font-size: 11px;">
              Generated: ${new Date().toLocaleString()}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
            <div style="background: #27ae60; padding: 12px; border-radius: 6px; color: white; text-align: center;">
              <div style="font-size: 24px; font-weight: bold;">${summary.present}</div>
              <div style="font-size: 13px; opacity: 0.9;">Present</div>
            </div>
            <div style="background: #e67e22; padding: 12px; border-radius: 6px; color: white; text-align: center;">
              <div style="font-size: 24px; font-weight: bold;">${summary.late}</div>
              <div style="font-size: 13px; opacity: 0.9;">Late</div>
            </div>
            <div style="background: #e74c3c; padding: 12px; border-radius: 6px; color: white; text-align: center;">
              <div style="font-size: 24px; font-weight: bold;">${summary.absent}</div>
              <div style="font-size: 13px; opacity: 0.9;">Absent</div>
            </div>
            <div style="background: #4a6fa5; padding: 12px; border-radius: 6px; color: white; text-align: center;">
              <div style="font-size: 24px; font-weight: bold;">${summary.total}</div>
              <div style="font-size: 13px; opacity: 0.9;">Total Employees</div>
            </div>
          </div>

          <div style="margin-bottom: 20px; overflow-x: auto;">
            <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; margin-bottom: 10px;">Attendance Records</h4>
            ${employeeIds.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #4a6fa5; color: white;">
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">#</th>
                    <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Employee</th>
                    <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Department</th>
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">AM In</th>
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">AM Out</th>
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">AM Status</th>
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">PM In</th>
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">PM Out</th>
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">PM Status</th>
                    <th style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">Daily Status</th>
                    <th style="padding: 6px 8px; text-align: left; border: 1px solid #ddd;">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${recordsHTML}
                </tbody>
              </table>
              <p style="margin-top: 6px; font-size: 10px; color: #888; font-style: italic;">
                Note: Entry #1 = AM, Entry #2 = PM | Daily status determined by PM (if exists), otherwise AM
              </p>
            ` : `
              <p style="text-align: center; color: #7f8c8d; padding: 20px 0;">No attendance records found for this date.</p>
            `}
          </div>

          <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 11px;">
            <p>This report is auto-generated from HRM Pagbilao System</p>
            <p>Document ID: HR-ATTENDANCE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}</p>
            <p>© ${new Date().getFullYear()} HRM Pagbilao, Quezon</p>
          </div>
        </div>
      `;

      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Attendance Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none; }
                }
                table { font-size: 11px; }
                th, td { padding: 5px 7px; }
              </style>
            </head>
            <body>
              ${printContent}
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                };
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error printing:', error);
      alert('Failed to print. Please try again.');
    }
  };

  return (
    <div className="attendance-container" ref={attendanceRef}>

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <AccessTimeIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Attendance Tracking
          </h2>
          <p className="header-subtitle">Monitor and record daily employee attendance</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={exportToPDF} className="btn-export pdf" style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <PictureAsPdfIcon style={{ fontSize: 18 }} />
            PDF
          </button>
          <button onClick={handlePrint} className="btn-export print" style={{
            background: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <PrintIcon style={{ fontSize: 18 }} />
            Print
          </button>
          <span className="date-badge" style={{ marginLeft: '5px' }}>
            <CalendarTodayIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
            {new Date(filterDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card present">
          <div className="stat-icon">
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Present</h3>
            <p>{summary.present}</p>
          </div>
        </div>
        <div className="stat-card late">
          <div className="stat-icon">
            <WarningIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Late</h3>
            <p>{summary.late}</p>
          </div>
        </div>
        <div className="stat-card absent">
          <div className="stat-icon">
            <CancelIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Absent</h3>
            <p>{summary.absent}</p>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">
            <PeopleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Employees</h3>
            <p>{summary.total}</p>
          </div>
        </div>
      </div>

      {/* View Attendance Records with AM/PM and Statuses */}
      <div className="form-card-modern">
        <div className="filter-header">
          <h3>
            <EventNoteIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
            View Attendance Records (AM/PM)
          </h3>
          <div className="filter-controls">
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-date"
            />
            <span className="record-count">{Object.keys(getRecordsGroupedByEmployee()).length} employees</span>
          </div>
        </div>

        <div className="table-container">
          <table className="attendance-table-modern">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Department</th>
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
              {(() => {
                const groupedRecords = getRecordsGroupedByEmployee();
                const employeeIds = Object.keys(groupedRecords);
                
                if (employeeIds.length > 0) {
                  return employeeIds.map((empId, index) => {
                    const empRecords = groupedRecords[empId];
                    const { amTimeIn, amTimeOut, amStatus, pmTimeIn, pmTimeOut, pmStatus, combinedStatus, remarks } = getAMPMEntries(empRecords);
                    
                    return (
                      <tr key={empId} className={combinedStatus === 'Late' || combinedStatus === 'Under Time' ? 'late-row' : ''}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="employee-info">
                            <div className="employee-avatar small">
                              {getEmployeeName(empId).charAt(0)}
                            </div>
                            <span className="employee-name">{getEmployeeName(empId)}</span>
                          </div>
                        </td>
                        <td><span className="dept-tag">{getEmployeeDepartment(empId)}</span></td>
                        <td className="time-cell">{amTimeIn}</td>
                        <td className="time-cell">{amTimeOut}</td>
                        <td className="status-cell">
                          <span className={`status-badge ${amStatus === 'Late' || amStatus === 'Under Time' ? 'warning' : amStatus === 'Over Time' ? 'success' : amStatus === 'On Time' ? 'success' : amStatus !== '—' ? 'secondary' : 'secondary'}`}>
                            {amStatus}
                          </span>
                        </td>
                        <td className="time-cell">{pmTimeIn}</td>
                        <td className="time-cell">{pmTimeOut}</td>
                        <td className="status-cell">
                          <span className={`status-badge ${pmStatus === 'Late' || pmStatus === 'Under Time' ? 'warning' : pmStatus === 'Over Time' ? 'success' : pmStatus === 'On Time' ? 'success' : pmStatus !== '—' ? 'secondary' : 'secondary'}`}>
                            {pmStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${combinedStatus === 'Late' || combinedStatus === 'Under Time' ? 'warning' : combinedStatus === 'Over Time' ? 'success' : 'success'}`}>
                            {combinedStatus === 'Late' || combinedStatus === 'Under Time' ? (
                              <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                            ) : (
                              <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                            )}
                            {combinedStatus}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#666' }}>{remarks || '—'}</td>
                      </tr>
                    );
                  });
                } else {
                  return (
                    <tr>
                      <td colSpan="11" className="empty-state">
                        <InboxIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                        <p>No attendance records found</p>
                        <span>No records for {new Date(filterDate).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
        {Object.keys(getRecordsGroupedByEmployee()).length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
            <em>Entry #1 = AM, Entry #2 = PM | Daily status determined by PM (if exists), otherwise AM</em>
          </div>
        )}
      </div>
    </div>
  );
}

export default Attendance;