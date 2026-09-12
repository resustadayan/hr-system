// src/components/ComplianceMonitoring.js - Enhanced with Completion Notifications & Advanced Filters
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Material-UI Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningIcon from '@mui/icons-material/Warning';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import EventIcon from '@mui/icons-material/Event';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import StarsIcon from '@mui/icons-material/Stars';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

function ComplianceMonitoring() {
  const location = useLocation();
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('info');
  const [pendingCount, setPendingCount] = useState(0);
  const [previewFile, setPreviewFile] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [completionAlerts, setCompletionAlerts] = useState([]);
  const notificationRef = useRef(null);
  const complianceRef = useRef(null);

  // ====== NEW FILTER STATES ======
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  // ====== COMPLETION TRACKING ======
  const recentlyCompleted = useRef(new Set());

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
                    body { 
                      margin: 0; 
                      padding: 0; 
                      height: 100vh; 
                      display: flex; 
                      justify-content: center; 
                      align-items: center; 
                      background: #f5f5f5; 
                    }
                    img { 
                      max-width: 100%; 
                      max-height: 100%; 
                      object-fit: contain; 
                      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
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

  // Check for navigation state from EmployeePortal
  useEffect(() => {
    if (location.state) {
      const { notification, employeeId, timestamp } = location.state;
      if (notification && employeeId) {
        setToastMessage(notification);
        setToastType('info');
        setHighlightedEmployeeId(employeeId);
        setFilter('all');
        
        setTimeout(() => {
          setToastMessage(null);
        }, 8000);
        
        window.history.replaceState({}, document.title);
      }
    }
  }, [location]);

  useEffect(() => {
    fetchEmployees();
    fetchDocuments();
    setupRealtimeListeners();
  }, []);

  // ====== REAL-TIME LISTENER FOR NEW UPLOADS AND COMPLETIONS ======
  const setupRealtimeListeners = () => {
    const unsubscribe = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const docList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const previousDocs = documents;
      const newDocs = docList.filter(d => 
        !previousDocs.some(p => p.id === d.id)
      );
      
      const completedNow = docList.filter(d => {
        const prev = previousDocs.find(p => p.id === d.id);
        return prev && prev.status !== 'Complete' && d.status === 'Complete';
      });
      
      setDocuments(docList);
      
      const pending = docList.filter(d => d.status === 'Pending Review').length;
      setPendingCount(pending);
      
      const newPending = newDocs.filter(d => d.status === 'Pending Review');
      if (newPending.length > 0 && !toastMessage) {
        const latestDoc = newPending.sort((a, b) => 
          new Date(b.uploadedAt) - new Date(a.uploadedAt)
        )[0];
        
        if (latestDoc) {
          setToastMessage(`${latestDoc.employeeName} uploaded ${latestDoc.documentType}`);
          setToastType('info');
          setHighlightedEmployeeId(latestDoc.employeeId);
          
          setTimeout(() => {
            setToastMessage(null);
          }, 8000);
        }
      }
      
      if (completedNow.length > 0) {
        const completionByEmployee = {};
        completedNow.forEach(doc => {
          if (!completionByEmployee[doc.employeeId]) {
            completionByEmployee[doc.employeeId] = [];
          }
          completionByEmployee[doc.employeeId].push(doc);
        });
        
        Object.entries(completionByEmployee).forEach(([employeeId, completedDocs]) => {
          const employee = employees.find(e => e.id === employeeId);
          if (!employee) return;
          
          const employeeDocs = docList.filter(d => d.employeeId === employeeId);
          const totalDocs = employeeDocs.length;
          const completeDocs = employeeDocs.filter(d => d.status === 'Complete').length;
          
          const oldStatus = getComplianceStatusFromDocs(employeeId, previousDocs);
          const newStatus = getComplianceStatusFromDocs(employeeId, docList);
          
          if (oldStatus.percentage < 100 && newStatus.percentage === 100) {
            addDoc(collection(db, 'notifications'), {
              type: 'compliance_completed',
              employeeId: employeeId,
              employeeName: employee.fullName,
              department: employee.department || 'N/A',
              message: `${employee.fullName} from ${employee.department || 'N/A'} is now 100% compliant! All documents are complete.`,
              read: false,
              forAdmin: true,
              forEmployee: false,
              createdAt: new Date().toISOString(),
              priority: 'high',
              category: 'compliance_completion'
            });
            
            addDoc(collection(db, 'notifications'), {
              type: 'compliance_completed',
              employeeId: employeeId,
              employeeName: employee.fullName,
              message: `🎉 Congratulations! You are now 100% compliant. All your documents have been reviewed and marked as complete.`,
              read: false,
              forEmployee: true,
              forAdmin: false,
              createdAt: new Date().toISOString(),
              priority: 'high',
              category: 'compliance_completion'
            });
            
            setToastMessage(`🎉 ${employee.fullName} is now 100% COMPLIANT!`);
            setToastType('success');
            setHighlightedEmployeeId(employeeId);
            
            recentlyCompleted.current.add(employeeId);
            
            setTimeout(() => {
              setToastMessage(null);
            }, 10000);
          }
        });
      }
    });

    return unsubscribe;
  };

  const getComplianceStatusFromDocs = (employeeId, docList) => {
    const employeeDocs = docList.filter(doc => doc.employeeId === employeeId);
    const total = employeeDocs.length;
    const complete = employeeDocs.filter(doc => doc.status === 'Complete').length;
    const pending = employeeDocs.filter(doc => doc.status === 'Pending Review').length;
    return { 
      total, 
      complete,
      pending,
      percentage: total === 0 ? 0 : Math.round((complete / total) * 100) 
    };
  };

  const fetchEmployees = async () => {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEmployees(empList);
  };

  const fetchDocuments = async () => {
    const querySnapshot = await getDocs(collection(db, 'documents'));
    const docList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDocuments(docList);
    const pending = docList.filter(d => d.status === 'Pending Review').length;
    setPendingCount(pending);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchEmployees();
    await fetchDocuments();
    setRefreshing(false);
  };

  const updateDocumentStatus = async (docId, newStatus) => {
    setLoading(true);
    try {
      const docData = documents.find(d => d.id === docId);
      const oldStatus = docData?.status;
      
      await updateDoc(doc(db, 'documents', docId), { 
        status: newStatus,
        reviewedAt: new Date().toISOString()
      });
      
      if (docData) {
        await addDoc(collection(db, 'notifications'), {
          employeeId: docData.employeeId,
          employeeName: docData.employeeName,
          type: 'compliance_status_updated',
          message: `Your ${docData.documentType} has been marked as ${newStatus}`,
          read: false,
          forEmployee: true,
          forAdmin: false,
          createdAt: new Date().toISOString()
        });
      }
      
      await fetchDocuments();
      
      if (docData && newStatus === 'Complete' && oldStatus !== 'Complete') {
        const freshDocs = await getDocs(collection(db, 'documents'));
        const freshDocList = freshDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const employeeDocs = freshDocList.filter(d => d.employeeId === docData.employeeId);
        const totalDocs = employeeDocs.length;
        const completeDocs = employeeDocs.filter(d => d.status === 'Complete').length;
        
        if (totalDocs > 0 && completeDocs === totalDocs) {
          const employee = employees.find(e => e.id === docData.employeeId);
          if (employee) {
            await addDoc(collection(db, 'notifications'), {
              type: 'compliance_completed',
              employeeId: docData.employeeId,
              employeeName: employee.fullName,
              department: employee.department || 'N/A',
              message: `🎉 ${employee.fullName} from ${employee.department || 'N/A'} is now 100% compliant! All documents are complete.`,
              read: false,
              forAdmin: true,
              forEmployee: false,
              createdAt: new Date().toISOString(),
              priority: 'high',
              category: 'compliance_completion'
            });
            
            await addDoc(collection(db, 'notifications'), {
              type: 'compliance_completed',
              employeeId: docData.employeeId,
              employeeName: employee.fullName,
              message: `🎉 Congratulations! You are now 100% compliant. All your documents have been reviewed and marked as complete.`,
              read: false,
              forEmployee: true,
              forAdmin: false,
              createdAt: new Date().toISOString(),
              priority: 'high',
              category: 'compliance_completion'
            });
            
            setToastMessage(`🎉 ${employee.fullName} is now 100% COMPLIANT!`);
            setToastType('success');
            setHighlightedEmployeeId(docData.employeeId);
            
            setTimeout(() => {
              setToastMessage(null);
            }, 10000);
          }
        }
      }
      
      alert('✅ Document status updated successfully');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('❌ Failed to update document status');
    } finally {
      setLoading(false);
    }
  };

  const getComplianceStatus = (employeeId) => {
    const employeeDocs = documents.filter(doc => doc.employeeId === employeeId);
    const total = employeeDocs.length;
    const complete = employeeDocs.filter(doc => doc.status === 'Complete').length;
    const pending = employeeDocs.filter(doc => doc.status === 'Pending Review').length;
    const missing = employeeDocs.filter(doc => doc.status === 'Missing' || doc.status === 'Expired').length;
    return { 
      total, 
      complete,
      pending,
      missing,
      percentage: total === 0 ? 0 : Math.round((complete / total) * 100) 
    };
  };

  const getPendingDocuments = (employeeId) => {
    return documents.filter(doc => doc.employeeId === employeeId && doc.status === 'Pending Review');
  };

  const getStatusColor = (status) => {
    if (status === 'Complete') return 'success';
    if (status === 'Pending Review') return 'warning';
    if (status === 'Missing') return 'danger';
    if (status === 'Expired') return 'warning';
    return 'secondary';
  };

  // ====== GET UNIQUE DEPARTMENTS & ROLES ======
  const uniqueDepartments = ['All Departments', ...new Set(employees.map(emp => emp.department).filter(Boolean))];
  const uniqueRoles = ['All Roles', ...new Set(employees.map(emp => emp.role || emp.position).filter(Boolean))];

  // ====== ENHANCED FILTERING WITH SEARCH, DEPARTMENT, ROLE ======
  const filteredEmployees = employees.filter(emp => {
    // Filter by compliance status
    const status = getComplianceStatus(emp.id);
    if (filter === 'pending' && status.pending === 0) return false;
    if (filter === 'missing' && status.pending === 0 && status.percentage >= 100) return false;
    if (filter === 'complete' && status.percentage !== 100) return false;

    // Filter by search term (name or email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const nameMatch = (emp.fullName || '').toLowerCase().includes(term);
      const emailMatch = (emp.email || '').toLowerCase().includes(term);
      if (!nameMatch && !emailMatch) return false;
    }

    // Filter by department
    if (departmentFilter !== 'All Departments') {
      if (emp.department !== departmentFilter) return false;
    }

    // Filter by role
    if (roleFilter !== 'All Roles') {
      if ((emp.role || emp.position) !== roleFilter) return false;
    }

    return true;
  });

  const totalEmployees = employees.length;
  const fullyCompliant = employees.filter(emp => getComplianceStatus(emp.id).percentage === 100).length;
  const missingDocs = employees.filter(emp => getComplianceStatus(emp.id).pending > 0).length;

  // ===== EXPORT FUNCTIONS =====

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text('Compliance Monitoring Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(74, 111, 165);
      doc.text('Human Resource Management - Pagbilao, Quezon', pageWidth / 2, 28, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });
      doc.text(`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`, pageWidth / 2, 42, { align: 'center' });
      
      doc.setDrawColor(74, 111, 165);
      doc.setLineWidth(0.5);
      doc.line(20, 47, pageWidth - 20, 47);
      
      let yPosition = 55;
      
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Summary', 20, yPosition);
      yPosition += 8;
      
      const summaryRows = [
        ['Total Employees', totalEmployees.toString()],
        ['Fully Compliant', fullyCompliant.toString()],
        ['Pending Review', pendingCount.toString()],
        ['Need Attention', missingDocs.toString()]
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
      
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Employee Compliance Status', 20, yPosition);
      yPosition += 8;
      
      if (filteredEmployees.length > 0) {
        const complianceRows = filteredEmployees.map((emp) => {
          const status = getComplianceStatus(emp.id);
          return [
            emp.fullName || 'Unknown',
            emp.department || 'N/A',
            status.total.toString(),
            status.complete.toString(),
            status.pending.toString(),
            `${status.percentage}%`
          ];
        });
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Employee', 'Department', 'Total', 'Complete', 'Pending', 'Rate']],
          body: complianceRows,
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
            0: { cellWidth: 40 },
            1: { cellWidth: 30 },
            2: { cellWidth: 15 },
            3: { cellWidth: 15 },
            4: { cellWidth: 15 },
            5: { cellWidth: 20 }
          }
        });
      } else {
        doc.setFontSize(12);
        doc.setTextColor(127, 140, 141);
        doc.text('No employees found matching the filter.', pageWidth / 2, yPosition + 10, { align: 'center' });
      }
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Compliance Report | ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    try {
      const printContent = `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4a6fa5;">
            <h1 style="color: #2c3e50; font-size: 28px; margin: 0;">Human Resource Management</h1>
            <h2 style="color: #4a6fa5; font-size: 20px; margin: 5px 0;">Pagbilao, Quezon</h2>
            <h3 style="color: #34495e; font-size: 18px; margin: 10px 0;">Compliance Monitoring Report</h3>
            <p style="color: #7f8c8d; font-size: 14px;">
              Generated: ${new Date().toLocaleString()}
            </p>
            <p style="color: #7f8c8d; font-size: 12px;">
              Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
            <div style="background: #4a6fa5; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${totalEmployees}</div>
              <div style="font-size: 14px; opacity: 0.9;">Total Employees</div>
            </div>
            <div style="background: #27ae60; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${fullyCompliant}</div>
              <div style="font-size: 14px; opacity: 0.9;">Fully Compliant</div>
            </div>
            <div style="background: #e67e22; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${pendingCount}</div>
              <div style="font-size: 14px; opacity: 0.9;">Pending Review</div>
            </div>
            <div style="background: #e74c3c; padding: 15px; border-radius: 8px; color: white; text-align: center;">
              <div style="font-size: 28px; font-weight: bold;">${missingDocs}</div>
              <div style="font-size: 14px; opacity: 0.9;">Need Attention</div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h4 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Employee Compliance Status</h4>
            ${filteredEmployees.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background: #4a6fa5; color: white;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">#</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Employee</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Department</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Total</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Complete</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Pending</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Rate</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredEmployees.map((emp, index) => {
                    const status = getComplianceStatus(emp.id);
                    return `
                      <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                        <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${emp.fullName || 'Unknown'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${emp.department || 'N/A'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${status.total}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${status.complete}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${status.pending}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${status.percentage}%</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                          <span style="background: ${status.percentage === 100 ? '#27ae60' : '#e67e22'}; 
                                       color: white; 
                                       padding: 4px 12px; 
                                       border-radius: 4px; 
                                       font-size: 12px;
                                       font-weight: 600;">
                            ${status.percentage === 100 ? '✅ Compliant' : '⏳ In Progress'}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : `
              <p style="text-align: center; color: #7f8c8d; padding: 30px 0;">No employees found matching the filter.</p>
            `}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ecf0f1; text-align: center; color: #7f8c8d; font-size: 12px;">
            <p>This report is auto-generated from HRM Pagbilao System</p>
            <p>Document ID: HR-COMPLIANCE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}</p>
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
              <title>Compliance Monitoring Report</title>
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
    <div className="compliance-container" ref={complianceRef}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toastType === 'success' ? '#27ae60' : 
                     toastType === 'warning' ? '#e67e22' : '#4a6fa5',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.5s ease-out',
          maxWidth: '450px'
        }}>
          {toastType === 'success' ? (
            <StarsIcon style={{ fontSize: 32, color: '#ffd700' }} />
          ) : (
            <NotificationImportantIcon style={{ fontSize: 28 }} />
          )}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
              {toastType === 'success' ? '🎉 COMPLIANCE COMPLETE!' : 'New Submission'}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>{toastMessage}</div>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              marginLeft: '12px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <CheckCircleIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Compliance Monitoring
          </h2>
          <p className="header-subtitle">Track and manage employee document compliance</p>
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
          <div className="stats-badge" style={{
            background: pendingCount > 0 ? '#e74c3c' : '#27ae60',
            padding: '8px 16px',
            borderRadius: '20px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {pendingCount > 0 ? (
              <>
                <WarningIcon style={{ fontSize: 18 }} />
                {pendingCount} Pending Review
              </>
            ) : (
              <>
                <CheckCircleIcon style={{ fontSize: 18 }} />
                All Reviewed
              </>
            )}
          </div>
          {fullyCompliant > 0 && (
            <div className="stats-badge" style={{
              background: '#27ae60',
              padding: '8px 16px',
              borderRadius: '20px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <DoneAllIcon style={{ fontSize: 18 }} />
              {fullyCompliant} Fully Compliant
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon"><PeopleIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info"><h3>Total Employees</h3><p>{totalEmployees}</p></div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircleIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info"><h3>Fully Compliant</h3><p>{fullyCompliant}</p></div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><WarningIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info"><h3>Pending Review</h3><p>{pendingCount}</p></div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><DescriptionIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info"><h3>Need Attention</h3><p>{missingDocs}</p></div>
        </div>
      </div>

      {/* ====== ADVANCED FILTER BAR (Search, Department, Role, Count) ====== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          flex: 1,
          minWidth: '280px'
        }}>
          <SearchIcon style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '20px'
          }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 44px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4a6fa5';
              e.target.style.background = 'white';
              e.target.style.boxShadow = '0 0 0 3px rgba(74, 111, 165, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.background = '#f8fafc';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Filter Icon */}
        <FilterListIcon style={{ color: '#94a3b8', fontSize: '24px' }} />

        {/* Department Filter */}
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={{
            padding: '10px 36px 10px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2394a3b8\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            minWidth: '160px',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#4a6fa5';
            e.target.style.background = 'white';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.background = '#f8fafc';
          }}
        >
          {uniqueDepartments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '10px 36px 10px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2394a3b8\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            minWidth: '160px',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#4a6fa5';
            e.target.style.background = 'white';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.background = '#f8fafc';
          }}
        >
          {uniqueRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        {/* User Count Badge */}
        <div style={{
          background: '#4a6fa5',
          color: 'white',
          padding: '8px 18px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <PeopleIcon style={{ fontSize: 16 }} />
          {filteredEmployees.length} {filteredEmployees.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      {/* Filter Controls (Status) */}
      <div className="filter-bar-modern">
        <button onClick={() => setFilter('all')} className={`filter-btn ${filter === 'all' ? 'active' : ''}`}>
          <FolderIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          All Employees ({filteredEmployees.length})
        </button>
        <button onClick={() => setFilter('pending')} className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} style={filter === 'pending' ? { background: '#e67e22', color: 'white' } : {}}>
          <WarningIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          Pending Review ({pendingCount})
        </button>
        <button onClick={() => setFilter('missing')} className={`filter-btn ${filter === 'missing' ? 'active' : ''}`}>
          <WarningIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          Missing Documents ({missingDocs})
        </button>
        <button onClick={() => setFilter('complete')} className={`filter-btn ${filter === 'complete' ? 'active' : ''}`} style={filter === 'complete' ? { background: '#27ae60', color: 'white' } : {}}>
          <DoneAllIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          Fully Compliant ({fullyCompliant})
        </button>
      </div>

      {/* Compliance Table */}
      <div className="table-container">
        <table className="compliance-table-modern">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Compliance Rate</th>
              <th>Status</th>
              <th>Pending Documents</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const status = getComplianceStatus(emp.id);
              const pendingDocs = getPendingDocuments(emp.id);
              const isCompliant = status.percentage === 100;
              const isHighlighted = emp.id === highlightedEmployeeId;
              const justCompleted = recentlyCompleted.current.has(emp.id);
              
              return (
                <tr 
                  key={emp.id} 
                  className={`${isCompliant ? 'compliant-row' : 'non-compliant-row'} ${isHighlighted ? 'highlighted-row' : ''} ${justCompleted ? 'just-completed' : ''}`}
                  style={isHighlighted ? { 
                    background: isCompliant ? '#d4edda' : '#e8f4fd', 
                    borderLeft: `4px solid ${isCompliant ? '#27ae60' : '#4a6fa5'}`,
                    animation: 'highlightFade 2s ease-out' 
                  } : isCompliant ? { background: '#f0faf4' } : {}}
                >
                  <td>
                    <div className="employee-info">
                      <div className="employee-avatar small">{emp.fullName?.charAt(0) || '?'}</div>
                      <span className="employee-name">{emp.fullName}</span>
                      {isHighlighted && (
                        <span style={{ 
                          background: isCompliant ? '#27ae60' : '#4a6fa5', 
                          color: 'white', 
                          fontSize: '10px', 
                          padding: '2px 10px', 
                          borderRadius: '12px', 
                          marginLeft: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isCompliant ? (
                            <>🎉 COMPLIANT</>
                          ) : (
                            <>NEW</>
                          )}
                        </span>
                      )}
                      {isCompliant && !isHighlighted && (
                        <span style={{ 
                          background: '#27ae60', 
                          color: 'white', 
                          fontSize: '10px', 
                          padding: '2px 10px', 
                          borderRadius: '12px', 
                          marginLeft: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <StarsIcon style={{ fontSize: 12 }} />
                          Complete
                        </span>
                      )}
                    </div>
                  </td>
                  <td><span className="dept-tag">{emp.department || 'N/A'}</span></td>
                  <td>
                    <div className="progress-bar-modern">
                      <div className={`progress-fill ${isCompliant ? 'complete' : 'partial'}`} style={{ width: `${status.percentage}%` }}>
                        <span>{status.percentage}%</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isCompliant ? 
                      <span className="status-badge success"><CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Complete</span> : 
                      <span className="status-badge warning"><WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> {status.pending} Pending</span>
                    }
                  </td>
                  <td>
                    {pendingDocs.length > 0 ? (
                      <div className="missing-tags">
                        {pendingDocs.map(doc => (
                          <span key={doc.id} className="missing-tag" style={{ background: '#fff3cd', color: '#856404', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', margin: '2px 4px' }}>
                            {doc.documentType}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-missing" style={{ color: '#27ae60', fontWeight: '600' }}>
                        <DoneAllIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        All complete
                      </span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedEmployee(emp)} 
                      className="btn-view-details"
                      style={{ padding: '6px 14px', background: '#4a6fa5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <VisibilityIcon style={{ fontSize: 16 }} />
                      Review Documents
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">
                  <FolderIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No employees found</p>
                  <span>Try adjusting your filters</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span className="employee-avatar small" style={{ marginRight: '12px' }}>{selectedEmployee.fullName?.charAt(0) || '?'}</span>
                {selectedEmployee.fullName} - Document Status
              </h3>
              <button className="modal-close" onClick={() => setSelectedEmployee(null)}><CloseIcon /></button>
            </div>
            
            <div className="doc-status-grid">
              {documents.filter(doc => doc.employeeId === selectedEmployee.id).map(doc => (
                <div key={doc.id} className="doc-card" style={{ border: doc.status === 'Pending Review' ? '2px solid #f39c12' : '1px solid #eee' }}>
                  <div className="doc-info">
                    <span className="doc-type">{doc.documentType}</span>
                    <span className={`doc-status ${getStatusColor(doc.status)}`}>
                      {doc.status === 'Complete' && <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />}
                      {doc.status === 'Pending Review' && <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />}
                      {doc.status === 'Missing' && <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />}
                      {doc.status === 'Expired' && <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />}
                      {doc.status}
                    </span>
                  </div>
                  <div className="doc-details">
                    <span className="doc-expiry">
                      {doc.uploadedAt ? (
                        <><EventIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</>
                      ) : 'No upload date'}
                    </span>
                    {doc.fileUrl && (
                      <button
                        onClick={() => openFileViewer(doc.fileUrl, doc.fileName)}
                        style={{ color: '#4a6fa5', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '14px' }}
                        onMouseEnter={(e) => e.target.style.background = '#e8f0fe'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <VisibilityIcon style={{ fontSize: 14 }} />
                        View File
                      </button>
                    )}
                    <select 
                      value={doc.status} 
                      onChange={(e) => updateDocumentStatus(doc.id, e.target.value)}
                      className="doc-status-select"
                      disabled={loading}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '8px', width: '100%' }}
                    >
                      <option value="Pending Review">⏳ Pending Review</option>
                      <option value="Complete">✅ Complete</option>
                      <option value="Missing">❌ Missing</option>
                      <option value="Expired">⚠️ Expired</option>
                    </select>
                  </div>
                </div>
              ))}
              {documents.filter(doc => doc.employeeId === selectedEmployee.id).length === 0 && (
                <div className="empty-state">
                  <FolderIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No documents found for this employee</p>
                </div>
              )}
            </div>
            
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <button className="btn-cancel" onClick={() => setSelectedEmployee(null)} style={{ padding: '10px 24px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <CloseIcon style={{ fontSize: 18 }} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
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
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes highlightFade {
          0% { background: #cce5ff; transform: scale(1.02); }
          50% { background: #e8f4fd; }
          100% { background: #e8f4fd; transform: scale(1); }
        }
        @keyframes completionPulse {
          0% { background: #d4edda; box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.4); }
          50% { background: #b8e6c9; box-shadow: 0 0 20px rgba(39, 174, 96, 0.2); }
          100% { background: #d4edda; box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
        }
        .highlighted-row { 
          animation: highlightFade 2s ease-out; 
          border-left: 4px solid #4a6fa5; 
        }
        .just-completed {
          animation: completionPulse 2s ease 3;
          border-left: 4px solid #27ae60 !important;
        }
        .compliant-row {
          background: #f0faf4;
        }
        .toast-notification { animation: slideIn 0.5s ease-out; }
      `}</style>
    </div>
  );
}

export default ComplianceMonitoring;