// src/components/AnalyticsDashboard.js
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, 
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  CartesianGrid, Area, AreaChart, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Material-UI Icons
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RefreshIcon from '@mui/icons-material/Refresh';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function AnalyticsDashboard() {
  const [employeeData, setEmployeeData] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    complianceRate: 0,
    totalLeaves: 0
  });
  const dashboardRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const employees = await getDocs(collection(db, 'employees'));
      const deptCount = {};
      let totalEmployees = 0;
      employees.docs.forEach(doc => {
        const dept = doc.data().department || 'Unassigned';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
        totalEmployees++;
      });
      
      const deptData = Object.entries(deptCount).map(([name, value]) => ({ 
        name, 
        value,
        fill: getColor(name)
      }));
      setEmployeeData(deptData);
      setDepartmentStats(deptData);
      setSummary(prev => ({ ...prev, totalEmployees, totalDepartments: deptData.length }));

      const documents = await getDocs(collection(db, 'documents'));
      const total = documents.size;
      const complete = documents.docs.filter(d => d.data().status === 'Complete').length;
      const missing = total - complete;
      const complianceRate = total > 0 ? Math.round((complete / total) * 100) : 0;
      
      setComplianceData([
        { name: 'Complete', value: complete, fill: '#27ae60' },
        { name: 'Missing', value: missing, fill: '#e74c3c' }
      ]);
      setSummary(prev => ({ ...prev, complianceRate }));

      const attendance = await getDocs(collection(db, 'attendance'));
      const attendanceMap = {};
      attendance.docs.forEach(doc => {
        const date = doc.data().date;
        if (date) {
          attendanceMap[date] = (attendanceMap[date] || 0) + 1;
        }
      });
      
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
      }
      
      const attendanceArr = dates.map(date => ({
        date: date,
        present: attendanceMap[date] || 0,
        formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
      setAttendanceData(attendanceArr);

      const leaves = await getDocs(collection(db, 'leaveRequests'));
      const leaveCount = leaves.size;
      const pendingLeaves = leaves.docs.filter(d => d.data().status === 'Pending').length;
      setLeaveData([
        { name: 'Pending', value: pendingLeaves, fill: '#f39c12' },
        { name: 'Approved', value: leaves.docs.filter(d => d.data().status === 'Approved').length, fill: '#27ae60' },
        { name: 'Rejected', value: leaves.docs.filter(d => d.data().status === 'Rejected').length, fill: '#e74c3c' }
      ]);
      setSummary(prev => ({ ...prev, totalLeaves: leaveCount }));

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (name) => {
    const colors = ['#4a6fa5', '#27ae60', '#e67e22', '#7c3aed', '#e74c3c', '#1abc9c', '#f39c12', '#3498db'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const COLORS = ['#4a6fa5', '#27ae60', '#e67e22', '#7c3aed', '#e74c3c', '#1abc9c'];
  const CHART_COLORS = ['#4a6fa5', '#27ae60', '#e67e22', '#7c3aed', '#e74c3c', '#1abc9c', '#f39c12', '#3498db'];

  // Export to Excel
  // const exportToExcel = () => {
  //   try {
  //     // Prepare data for Excel
  //     const excelData = [
  //       {
  //         'Metric': 'Total Employees',
  //         'Value': summary.totalEmployees
  //       },
  //       {
  //         'Metric': 'Total Departments',
  //         'Value': summary.totalDepartments
  //       },
  //       {
  //         'Metric': 'Compliance Rate',
  //         'Value': `${summary.complianceRate}%`
  //       },
  //       {
  //         'Metric': 'Total Leave Requests',
  //         'Value': summary.totalLeaves
  //       }
  //     ];

  //     // Add department data
  //     departmentStats.forEach(dept => {
  //       excelData.push({
  //         'Metric': `Department: ${dept.name}`,
  //         'Value': `${dept.value} employees`
  //       });
  //     });

  //     // Add compliance breakdown
  //     complianceData.forEach(item => {
  //       excelData.push({
  //         'Metric': `Compliance: ${item.name}`,
  //         'Value': `${item.value} documents`
  //       });
  //     });

  //     // Add leave breakdown
  //     leaveData.forEach(item => {
  //       excelData.push({
  //         'Metric': `Leave: ${item.name}`,
  //         'Value': `${item.value} requests`
  //       });
  //     });

  //     // Add attendance data
  //     attendanceData.forEach(day => {
  //       excelData.push({
  //         'Metric': `Attendance (${day.formattedDate})`,
  //         'Value': `${day.present} present`
  //       });
  //     });

  //     const wb = XLSX.utils.book_new();
  //     const ws = XLSX.utils.json_to_sheet(excelData);
      
  //     // Set column widths
  //     ws['!cols'] = [
  //       { wch: 40 },
  //       { wch: 20 }
  //     ];
      
  //     XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
      
  //     // Generate Excel file
  //     const filename = `Analytics_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`;
  //     XLSX.writeFile(wb, filename);
  //   } catch (error) {
  //     console.error('Error exporting to Excel:', error);
  //     alert('Failed to export Excel file. Please try again.');
  //   }
  // };

  // Direct PDF Download using jsPDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text('HR Analytics Dashboard', pageWidth / 2, 20, { align: 'center' });
      
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
      
      const summaryRows = [
        ['Total Employees', summary.totalEmployees.toString()],
        ['Total Departments', summary.totalDepartments.toString()],
        ['Compliance Rate', `${summary.complianceRate}%`],
        ['Total Leave Requests', summary.totalLeaves.toString()]
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: summaryRows,
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
          0: { cellWidth: 80 },
          1: { cellWidth: 80 }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 12;
      
      // Check if we need a new page
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Department Distribution
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Department Distribution', 20, yPosition);
      yPosition += 8;
      
      const deptRows = departmentStats.map(dept => [
        dept.name, 
        dept.value.toString(),
        `${Math.round((dept.value / summary.totalEmployees) * 100)}%`
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Department', 'Employees', 'Percentage']],
        body: deptRows,
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
      
      // Attendance Trend
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Attendance Trend (Last 7 Days)', 20, yPosition);
      yPosition += 8;
      
      const attendanceRows = attendanceData.map(day => [
        day.formattedDate, 
        day.present.toString()
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Present Employees']],
        body: attendanceRows,
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
      
      // Leave Requests
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Leave Requests Status', 20, yPosition);
      yPosition += 8;
      
      const leaveRows = leaveData.map(leave => [
        leave.name, 
        leave.value.toString()
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Status', 'Count']],
        body: leaveRows,
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
      
      // Compliance Status
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Compliance Status', 20, yPosition);
      yPosition += 8;
      
      const complianceRows = complianceData.map(comp => [
        comp.name, 
        comp.value.toString()
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Status', 'Documents']],
        body: complianceRows,
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
      
      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | HR Analytics Report | ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Direct download
      doc.save(`HR_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Handle Print (opens print dialog)
  const handlePrint = () => {
    try {
      // Use the same content as PDF but with print media
      const printContent = `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4a6fa5;">
            <h1 style="color: #2c3e50; font-size: 28px; margin: 0;">Human Resource Management</h1>
            <h2 style="color: #4a6fa5; font-size: 20px; margin: 5px 0;">Pagbilao, Quezon</h2>
            <h3 style="color: #34495e; font-size: 18px; margin: 10px 0;">Analytics Dashboard Report</h3>
            <p style="color: #7f8c8d; font-size: 14px;">
              Generated: ${new Date().toLocaleString()}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
            <div style="background: #4a6fa5; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.totalEmployees}</div>
              <div style="font-size: 14px; opacity: 0.9;">Total Employees</div>
            </div>
            <div style="background: #7c3aed; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.totalDepartments}</div>
              <div style="font-size: 14px; opacity: 0.9;">Departments</div>
            </div>
            <div style="background: #27ae60; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.complianceRate}%</div>
              <div style="font-size: 14px; opacity: 0.9;">Compliance Rate</div>
            </div>
            <div style="background: #f39c12; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${summary.totalLeaves}</div>
              <div style="font-size: 14px; opacity: 0.9;">Total Leave Requests</div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Department Breakdown</h4>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background: #4a6fa5; color: white;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Department</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Number of Employees</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Percentage</th>
                </tr>
              </thead>
              <tbody>
                ${departmentStats.map(dept => `
                  <tr style="background: ${departmentStats.indexOf(dept) % 2 === 0 ? '#f8f9fa' : 'white'};">
                    <td style="padding: 10px; border: 1px solid #ddd;">${dept.name}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${dept.value}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${Math.round((dept.value / summary.totalEmployees) * 100)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div>
              <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Compliance Status</h4>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                ${complianceData.map(item => `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ecf0f1;">
                    <span>${item.name}</span>
                    <span style="font-weight: bold;">${item.value} documents</span>
                  </div>
                `).join('')}
              </div>
            </div>
            <div>
              <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Leave Requests Status</h4>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                ${leaveData.map(item => `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ecf0f1;">
                    <span>${item.name}</span>
                    <span style="font-weight: bold;">${item.value} requests</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Attendance Trend (Last 7 Days)</h4>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background: #4a6fa5; color: white;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Present Employees</th>
                </tr>
              </thead>
              <tbody>
                ${attendanceData.map(day => `
                  <tr style="background: ${attendanceData.indexOf(day) % 2 === 0 ? '#f8f9fa' : 'white'};">
                    <td style="padding: 10px; border: 1px solid #ddd;">${day.formattedDate}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${day.present}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">
            <p>This report is auto-generated from HRM Pagbilao System</p>
            <p>Document ID: HR-ANALYTICS-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}</p>
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
              <title>Analytics Dashboard Report</title>
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

  if (loading) {
    return <div className="loading">Loading analytics data...</div>;
  }

  return (
    <div className="analytics-container" ref={dashboardRef}>

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <BarChartIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Analytics Dashboard
          </h2>
          <p className="header-subtitle">Real-time HR metrics and workforce insights</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* <button onClick={fetchData} className="btn-add-modern" style={{ background: '#4a6fa5' }}>
            <RefreshIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
            Refresh
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon">
            <PeopleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Employees</h3>
            <p>{summary.totalEmployees}</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">
            <BusinessIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Departments</h3>
            <p>{summary.totalDepartments}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Compliance Rate</h3>
            <p>{summary.complianceRate}%</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <CalendarTodayIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Leave Requests</h3>
            <p>{summary.totalLeaves}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">

        {/* Chart 1: Employees by Department - Modern Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <PeopleIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Employees by Department
            </h3>
            <span className="chart-badge">{employeeData.length} departments</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={employeeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} employees`, 'Count']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {employeeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Compliance Rate - Donut Chart (More Professional) */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <CheckCircleIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Compliance Rate
            </h3>
            <span className="chart-badge">{summary.complianceRate}%</span>
          </div>
          <div className="chart-body pie-chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={complianceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#eef2f7' }}
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center-label">
              <span className="label-value">{summary.complianceRate}%</span>
              <span className="label-text">Compliant</span>
            </div>
          </div>
        </div>

        {/* Chart 3: Attendance Trend - Area Chart with Gradient */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>
              <ShowChartIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Attendance Trend (Last 7 Days)
            </h3>
            <span className="chart-badge">Daily</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={attendanceData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a6fa5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4a6fa5" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} present`, 'Employees']}
                />
                <Area 
                  type="monotone" 
                  dataKey="present" 
                  stroke="#4a6fa5" 
                  strokeWidth={3}
                  fill="url(#colorPresent)"
                  dot={{ fill: '#4a6fa5', r: 6, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 8, fill: '#4a6fa5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Leave Requests - Donut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <CalendarTodayIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Leave Requests
            </h3>
            <span className="chart-badge">{summary.totalLeaves} total</span>
          </div>
          <div className="chart-body pie-chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={leaveData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#eef2f7' }}
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center-label">
              <span className="label-value">{summary.totalLeaves}</span>
              <span className="label-text">Total Requests</span>
            </div>
          </div>
        </div>

        {/* Chart 5: Department Summary - Modern List with Progress Bars */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <BusinessIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Department Summary
            </h3>
            <span className="chart-badge">{departmentStats.length} depts</span>
          </div>
          <div className="chart-body department-list">
            {departmentStats.map((dept, index) => {
              const maxValue = Math.max(...departmentStats.map(d => d.value));
              const percentage = (dept.value / maxValue) * 100;
              return (
                <div key={index} className="dept-summary-item-modern">
                  <div className="dept-summary-left">
                    <span className="dept-dot" style={{ background: dept.fill || COLORS[index % COLORS.length] }}></span>
                    <span className="dept-summary-name">{dept.name}</span>
                  </div>
                  <div className="dept-summary-bar-wrapper">
                    <div 
                      className="dept-summary-bar" 
                      style={{ 
                        width: `${Math.max(percentage, 2)}%`,
                        background: dept.fill || COLORS[index % COLORS.length]
                      }}
                    >
                      <span className="dept-summary-count">{dept.value} employees</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {departmentStats.length === 0 && (
              <div className="empty-state">
                <p>No department data available</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default AnalyticsDashboard;