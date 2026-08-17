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
      const status = timeIn <= '08:00' ? 'On Time' : 'Late';
      
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
    const threshold = '08:00';
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

  // ===== EXPORT FUNCTIONS =====

  // Export to Excel
  // const exportToExcel = () => {
  //   try {
  //     // Prepare data for Excel
  //     const excelData = [
  //       {
  //         'Metric': 'Attendance Summary',
  //         'Date': filterDate,
  //         'Present': summary.present,
  //         'Late': summary.late,
  //         'Absent': summary.absent,
  //         'Total Employees': summary.total
  //       },
  //       {} // Empty row for spacing
  //     ];

  //     // Add attendance records
  //     sortedRecords.forEach((record, index) => {
  //       excelData.push({
  //         '#': index + 1,
  //         'Employee': getEmployeeName(record.employeeId),
  //         'Department': getEmployeeDepartment(record.employeeId),
  //         'Date': record.date,
  //         'Time In': record.timeIn || '—',
  //         'Time Out': record.timeOut || '—',
  //         'Status': record.status || 'Present',
  //         'Recorded By': record.recordedBy || 'Admin'
  //       });
  //     });

  //     if (sortedRecords.length === 0) {
  //       excelData.push({
  //         '#': '—',
  //         'Employee': 'No records found',
  //         'Department': '—',
  //         'Date': filterDate,
  //         'Time In': '—',
  //         'Time Out': '—',
  //         'Status': '—',
  //         'Recorded By': '—'
  //       });
  //     }

  //     const wb = XLSX.utils.book_new();
  //     const ws = XLSX.utils.json_to_sheet(excelData);
      
  //     // Set column widths
  //     ws['!cols'] = [
  //       { wch: 6 },
  //       { wch: 25 },
  //       { wch: 18 },
  //       { wch: 14 },
  //       { wch: 12 },
  //       { wch: 12 },
  //       { wch: 14 },
  //       { wch: 14 }
  //     ];
      
  //     XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      
  //     const filename = `Attendance_Report_${filterDate}.xlsx`;
  //     XLSX.writeFile(wb, filename);
  //   } catch (error) {
  //     console.error('Error exporting to Excel:', error);
  //     alert('Failed to export Excel file. Please try again.');
  //   }
  // };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
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
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Attendance Records
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Attendance Records', 20, yPosition);
      yPosition += 8;
      
      if (sortedRecords.length > 0) {
        const attendanceRows = sortedRecords.map((record, index) => [
          (index + 1).toString(),
          getEmployeeName(record.employeeId),
          getEmployeeDepartment(record.employeeId),
          record.timeIn || '—',
          record.timeOut || '—',
          record.status || 'Present'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Employee', 'Department', 'Time In', 'Time Out', 'Status']],
          body: attendanceRows,
          theme: 'striped',
          headStyles: { 
            fillColor: [74, 111, 165], 
            textColor: [255, 255, 255],
            fontSize: 11,
            fontStyle: 'bold'
          },
          styles: { fontSize: 10 },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 40 },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 }
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
      const printContent = `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4a6fa5;">
            <h1 style="color: #2c3e50; font-size: 28px; margin: 0;">Human Resource Management</h1>
            <h2 style="color: #4a6fa5; font-size: 20px; margin: 5px 0;">Pagbilao, Quezon</h2>
            <h3 style="color: #34495e; font-size: 18px; margin: 10px 0;">Attendance Report</h3>
            <p style="color: #7f8c8d; font-size: 14px;">
              Date: ${new Date(filterDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p style="color: #7f8c8d; font-size: 12px;">
              Generated: ${new Date().toLocaleString()}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
            <div style="background: #27ae60; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.present}</div>
              <div style="font-size: 14px; opacity: 0.9;">Present</div>
            </div>
            <div style="background: #e67e22; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.late}</div>
              <div style="font-size: 14px; opacity: 0.9;">Late</div>
            </div>
            <div style="background: #e74c3c; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.absent}</div>
              <div style="font-size: 14px; opacity: 0.9;">Absent</div>
            </div>
            <div style="background: #4a6fa5; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.total}</div>
              <div style="font-size: 14px; opacity: 0.9;">Total Employees</div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Attendance Records</h4>
            ${sortedRecords.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background: #4a6fa5; color: white;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">#</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Employee</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Department</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time In</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time Out</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedRecords.map((record, index) => `
                    <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                      <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${getEmployeeName(record.employeeId)}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${getEmployeeDepartment(record.employeeId)}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${record.timeIn || '—'}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${record.timeOut || '—'}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">
                        <span style="background: ${record.status === 'On Time' || record.status === 'Present' ? '#27ae60' : '#e67e22'}; 
                                     color: white; 
                                     padding: 4px 12px; 
                                     border-radius: 4px; 
                                     font-size: 12px;
                                     font-weight: 600;">
                          ${record.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <p style="text-align: center; color: #7f8c8d; padding: 30px 0;">No attendance records found for this date.</p>
            `}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">
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
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none; }
                }
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
          {/* <button onClick={refreshData} className="btn-add-modern" style={{ background: '#4a6fa5' }} disabled={refreshing}>
            <RefreshIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button> */}
          {/* <button onClick={exportToExcel} className="btn-export excel" style={{
            background: '#217346',
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
            <FileDownloadIcon style={{ fontSize: 18 }} />
            Excel
          </button> */}
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

      {/* Record Attendance Form */}
      <div className="form-card-modern">
        <h3>
          <AddIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
          Record Attendance
        </h3>
        <div className="form-grid-inline">
          <div className="form-group">
            <label>
              <PersonIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Select Employee
            </label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              required
            >
              <option value="">— Select Employee —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName || emp.name} - {emp.department}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>
              <CalendarTodayIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Date
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>
              <AccessTimeIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Time In
            </label>
            <input 
              type="time" 
              value={timeIn} 
              onChange={(e) => setTimeIn(e.target.value)}
              placeholder="Time In"
              required
            />
          </div>
          
          <div className="form-group">
            <label>
              <AccessTimeIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Time Out (Optional)
            </label>
            <input 
              type="time" 
              value={timeOut} 
              onChange={(e) => setTimeOut(e.target.value)}
              placeholder="Time Out"
            />
          </div>
          
          <div className="form-group btn-group">
            <button 
              onClick={recordAttendance} 
              className="btn-record"
              disabled={loading}
            >
              <SaveIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              {loading ? 'Recording...' : 'Record Attendance'}
            </button>
          </div>
        </div>
      </div>

      {/* View Attendance Records */}
      <div className="form-card-modern">
        <div className="filter-header">
          <h3>
            <EventNoteIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
            View Attendance Records
          </h3>
          <div className="filter-controls">
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-date"
            />
            <span className="record-count">{sortedRecords.length} records</span>
          </div>
        </div>

        <div className="table-container">
          <table className="attendance-table-modern">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record, index) => (
                <tr key={record.id} className={record.status === 'Late' ? 'late-row' : ''}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="employee-info">
                      <div className="employee-avatar small">
                        {getEmployeeName(record.employeeId).charAt(0)}
                      </div>
                      <span className="employee-name">{getEmployeeName(record.employeeId)}</span>
                    </div>
                  </td>
                  <td><span className="dept-tag">{getEmployeeDepartment(record.employeeId)}</span></td>
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
                  <td>
                    <span className="source-badge">
                      {record.recordedBy === 'Admin' ? 'Admin' : 'Employee'}
                    </span>
                  </td>
                </tr>
              ))}
              {sortedRecords.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <InboxIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                    <p>No attendance records found</p>
                    <span>No records for {new Date(filterDate).toLocaleDateString()}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Attendance;