// src/components/LeaveManagement.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Material-UI Icons
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import InboxIcon from '@mui/icons-material/Inbox';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SickIcon from '@mui/icons-material/Sick';
import WarningIcon from '@mui/icons-material/Warning';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import ManIcon from '@mui/icons-material/Man';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';

function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const leaveRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
    fetchLeaveRequests();
  }, []);

  const fetchEmployees = async () => {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEmployees(empList);
  };

  const fetchLeaveRequests = async () => {
    const q = query(collection(db, 'leaveRequests'));
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLeaveRequests(requests);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchEmployees();
    await fetchLeaveRequests();
    setRefreshing(false);
  };

  const submitLeave = async () => {
    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const days = calculateDays(formData.startDate, formData.endDate);
      await addDoc(collection(db, 'leaveRequests'), {
        ...formData,
        days: days,
        status: 'Pending',
        dateSubmitted: new Date().toISOString()
      });
      alert('✅ Leave request submitted successfully');
      setShowForm(false);
      setFormData({ employeeId: '', type: 'Vacation', startDate: '', endDate: '', reason: '' });
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error submitting leave:', error);
      alert('❌ Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'leaveRequests', id), { status });
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Failed to update status');
    }
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName : 'Unknown';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.department : 'N/A';
  };

  const filteredRequests = leaveRequests.filter(req => {
    if (filter === 'pending') return req.status === 'Pending';
    if (filter === 'approved') return req.status === 'Approved';
    if (filter === 'rejected') return req.status === 'Rejected';
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      'Pending': { class: 'warning', icon: <HourglassEmptyIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> },
      'Approved': { class: 'success', icon: <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> },
      'Rejected': { class: 'danger', icon: <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> }
    };
    const badge = badges[status] || badges['Pending'];
    return <span className={`status-badge ${badge.class}`}>{badge.icon} {status}</span>;
  };

  const getLeaveTypeIcon = (type) => {
    const icons = {
      'Vacation': <BeachAccessIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Sick': <SickIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Emergency': <WarningIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Maternity': <ChildCareIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Paternity': <ManIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Others': <MoreHorizIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
    };
    return icons[type] || <MoreHorizIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />;
  };

  // ===== EXPORT FUNCTIONS =====

  // Export to Excel
  // const exportToExcel = () => {
  //   try {
  //     const summaryData = {
  //       'Metric': 'Leave Summary',
  //       'Total Requests': leaveRequests.length,
  //       'Pending': leaveRequests.filter(r => r.status === 'Pending').length,
  //       'Approved': leaveRequests.filter(r => r.status === 'Approved').length,
  //       'Rejected': leaveRequests.filter(r => r.status === 'Rejected').length
  //     };

  //     const excelData = [summaryData, {}];

  //     // Add leave records
  //     filteredRequests.forEach((req, index) => {
  //       excelData.push({
  //         '#': index + 1,
  //         'Employee': getEmployeeName(req.employeeId),
  //         'Department': getEmployeeDepartment(req.employeeId),
  //         'Leave Type': req.type || 'Vacation',
  //         'Start Date': req.startDate || '—',
  //         'End Date': req.endDate || '—',
  //         'Days': req.days || 0,
  //         'Status': req.status || 'Pending',
  //         'Reason': req.reason || '—'
  //       });
  //     });

  //     if (filteredRequests.length === 0) {
  //       excelData.push({
  //         '#': '—',
  //         'Employee': 'No leave requests found',
  //         'Department': '—',
  //         'Leave Type': '—',
  //         'Start Date': '—',
  //         'End Date': '—',
  //         'Days': '—',
  //         'Status': '—',
  //         'Reason': '—'
  //       });
  //     }

  //     const wb = XLSX.utils.book_new();
  //     const ws = XLSX.utils.json_to_sheet(excelData);
      
  //     ws['!cols'] = [
  //       { wch: 6 },
  //       { wch: 25 },
  //       { wch: 18 },
  //       { wch: 16 },
  //       { wch: 14 },
  //       { wch: 14 },
  //       { wch: 8 },
  //       { wch: 14 },
  //       { wch: 30 }
  //     ];
      
  //     XLSX.utils.book_append_sheet(wb, ws, 'Leave Requests');
      
  //     const filename = `Leave_Requests_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      doc.text('Leave Management Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(74, 111, 165);
      doc.text('Human Resource Management - Pagbilao, Quezon', pageWidth / 2, 28, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });
      
      doc.setDrawColor(74, 111, 165);
      doc.setLineWidth(0.5);
      doc.line(20, 40, pageWidth - 20, 40);
      
      let yPosition = 48;
      
      // Summary Cards as a table
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Summary', 20, yPosition);
      yPosition += 8;
      
      const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
      const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
      const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;
      
      const summaryRows = [
        ['Total Requests', leaveRequests.length.toString()],
        ['Pending', pendingCount.toString()],
        ['Approved', approvedCount.toString()],
        ['Rejected', rejectedCount.toString()]
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Count']],
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
      
      // Leave Records
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Leave Requests', 20, yPosition);
      yPosition += 8;
      
      if (filteredRequests.length > 0) {
        const leaveRows = filteredRequests.map((req) => [
          getEmployeeName(req.employeeId),
          getEmployeeDepartment(req.employeeId),
          req.type || 'Vacation',
          req.startDate || '—',
          req.endDate || '—',
          (req.days || 0).toString(),
          req.status || 'Pending'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Employee', 'Department', 'Leave Type', 'Start', 'End', 'Days', 'Status']],
          body: leaveRows,
          theme: 'striped',
          headStyles: { 
            fillColor: [74, 111, 165], 
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
          },
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 30 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 12 },
            6: { cellWidth: 22 }
          }
        });
      } else {
        doc.setFontSize(12);
        doc.setTextColor(127, 140, 141);
        doc.text('No leave requests found.', pageWidth / 2, yPosition + 10, { align: 'center' });
      }
      
      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Leave Management Report | ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`Leave_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Handle Print
  const handlePrint = () => {
    try {
      const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
      const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
      const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;

      const printContent = `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4a6fa5;">
            <h1 style="color: #2c3e50; font-size: 28px; margin: 0;">Human Resource Management</h1>
            <h2 style="color: #4a6fa5; font-size: 20px; margin: 5px 0;">Pagbilao, Quezon</h2>
            <h3 style="color: #34495e; font-size: 18px; margin: 10px 0;">Leave Management Report</h3>
            <p style="color: #7f8c8d; font-size: 14px;">
              Generated: ${new Date().toLocaleString()}
            </p>
            <p style="color: #7f8c8d; font-size: 12px;">
              Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
            <div style="background: #4a6fa5; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${leaveRequests.length}</div>
              <div style="font-size: 14px; opacity: 0.9;">Total Requests</div>
            </div>
            <div style="background: #e67e22; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${pendingCount}</div>
              <div style="font-size: 14px; opacity: 0.9;">Pending</div>
            </div>
            <div style="background: #27ae60; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${approvedCount}</div>
              <div style="font-size: 14px; opacity: 0.9;">Approved</div>
            </div>
            <div style="background: #e74c3c; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${rejectedCount}</div>
              <div style="font-size: 14px; opacity: 0.9;">Rejected</div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Leave Requests</h4>
            ${filteredRequests.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background: #4a6fa5; color: white;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">#</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Employee</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Department</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Leave Type</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Start Date</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">End Date</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Days</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRequests.map((req, index) => `
                    <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                      <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${getEmployeeName(req.employeeId)}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${getEmployeeDepartment(req.employeeId)}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${req.type || 'Vacation'}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${req.startDate || '—'}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">${req.endDate || '—'}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${req.days || 0}</td>
                      <td style="padding: 10px; border: 1px solid #ddd;">
                        <span style="background: ${req.status === 'Approved' ? '#27ae60' : req.status === 'Rejected' ? '#e74c3c' : '#e67e22'}; 
                                     color: white; 
                                     padding: 4px 12px; 
                                     border-radius: 4px; 
                                     font-size: 12px;
                                     font-weight: 600;">
                          ${req.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <p style="text-align: center; color: #7f8c8d; padding: 30px 0;">No leave requests found.</p>
            `}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">
            <p>This report is auto-generated from HRM Pagbilao System</p>
            <p>Document ID: HR-LEAVE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}</p>
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
              <title>Leave Management Report</title>
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
    <div className="leave-management" ref={leaveRef}>

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <CalendarTodayIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Leave Management
          </h2>
          <p className="header-subtitle">Manage and track employee leave requests</p>
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
          <button 
            onClick={() => setShowForm(true)} 
            className="btn-add-modern"
          >
            <AddIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
            New Leave Request
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon">
            <AssignmentIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Requests</h3>
            <p>{leaveRequests.length}</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <HourglassEmptyIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Pending</h3>
            <p>{leaveRequests.filter(r => r.status === 'Pending').length}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Approved</h3>
            <p>{leaveRequests.filter(r => r.status === 'Approved').length}</p>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">
            <CancelIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Rejected</h3>
            <p>{leaveRequests.filter(r => r.status === 'Rejected').length}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="search-filter-bar">
        <div className="filter-group">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">
              <AssignmentIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              All Requests
            </option>
            <option value="pending">
              <HourglassEmptyIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Pending
            </option>
            <option value="approved">
              <CheckCircleIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Approved
            </option>
            <option value="rejected">
              <CancelIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Rejected
            </option>
          </select>
        </div>
        <div className="stats-badge">
          <span>{filteredRequests.length} requests</span>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="table-container">
        <table className="leave-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Leave Type</th>
              <th>Date Range</th>
              <th>Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(req => (
              <tr key={req.id}>
                <td>
                  <div className="employee-info">
                    <div className="employee-avatar small">
                      {getEmployeeName(req.employeeId).charAt(0)}
                    </div>
                    <span className="employee-name">{getEmployeeName(req.employeeId)}</span>
                  </div>
                </td>
                <td><span className="dept-tag">{getEmployeeDepartment(req.employeeId)}</span></td>
                <td>
                  <span className="leave-type">
                    {getLeaveTypeIcon(req.type)} {req.type}
                  </span>
                </td>
                <td>
                  <div className="date-range">
                    <span>{req.startDate}</span>
                    <span className="arrow">→</span>
                    <span>{req.endDate}</span>
                  </div>
                </td>
                <td><span className="days-badge">{req.days} day{req.days > 1 ? 's' : ''}</span></td>
                <td>{getStatusBadge(req.status)}</td>
                <td>
                  {req.status === 'Pending' && (
                    <div className="action-group">
                      <button 
                        onClick={() => updateStatus(req.id, 'Approved')} 
                        className="btn-action approve"
                      >
                        <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Approve
                      </button>
                      <button 
                        onClick={() => updateStatus(req.id, 'Rejected')} 
                        className="btn-action reject"
                      >
                        <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Reject
                      </button>
                    </div>
                  )}
                  {req.status !== 'Pending' && (
                    <span className="no-action">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-state">
                  <InboxIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No leave requests found</p>
                  <span>Click "New Leave Request" to get started</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-form leave-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <EventNoteIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
                New Leave Request
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setShowForm(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitLeave(); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <PersonIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Employee *
                  </label>
                  <select 
                    value={formData.employeeId} 
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    required
                  >
                    <option value="">— Select Employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <EventNoteIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Leave Type *
                  </label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="Vacation">
                      <BeachAccessIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Vacation
                    </option>
                    <option value="Sick">
                      <SickIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Sick
                    </option>
                    <option value="Emergency">
                      <WarningIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Emergency
                    </option>
                    <option value="Maternity">
                      <ChildCareIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Maternity
                    </option>
                    <option value="Paternity">
                      <ManIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Paternity
                    </option>
                    <option value="Others">
                      <MoreHorizIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Others
                    </option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <EventNoteIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Start Date *
                  </label>
                  <input 
                    type="date" 
                    value={formData.startDate} 
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <EventNoteIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    End Date *
                  </label>
                  <input 
                    type="date" 
                    value={formData.endDate} 
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>
                    <DescriptionIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Reason
                  </label>
                  <textarea 
                    placeholder="Enter reason for leave (optional)"
                    value={formData.reason} 
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    rows="3"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save" disabled={loading}>
                  <SaveIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowForm(false)}
                >
                  <CancelIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveManagement;