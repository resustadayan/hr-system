// src/other file for dashboard/EmployeePortal.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth, storage } from '../firebase';  // ← Added storage here
import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';  // ← Removed getStorage
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

      const empQuery = query(collection(db, 'employees'), where('email', '==', user.email));
      const empSnapshot = await getDocs(empQuery);
      
      if (!empSnapshot.empty) {
        const empData = { id: empSnapshot.docs[0].id, ...empSnapshot.docs[0].data() };
        setEmployee(empData);

        const balanceQuery = query(collection(db, 'leaveBalances'), where('employeeId', '==', empData.id));
        const balanceSnapshot = await getDocs(balanceQuery);
        if (!balanceSnapshot.empty) {
          setLeaveBalance(balanceSnapshot.docs[0].data());
        }

        const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', '==', empData.id));
        const leaveSnapshot = await getDocs(leaveQuery);
        setLeaveRequests(leaveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const docQuery = query(collection(db, 'documents'), where('employeeId', '==', empData.id));
        const docSnapshot = await getDocs(docQuery);
        setDocuments(docSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const notifQuery = query(collection(db, 'notifications'), where('employeeId', '==', empData.id));
        const notifSnapshot = await getDocs(notifQuery);
        setNotifications(notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    const user = auth.currentUser;
    if (!user) return;

    const empQuery = query(collection(db, 'employees'), where('email', '==', user.email));
    getDocs(empQuery).then((snapshot) => {
      if (!snapshot.empty) {
        const empData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        
        const leaveQuery = query(collection(db, 'leaveRequests'), where('employeeId', '==', empData.id));
        onSnapshot(leaveQuery, (snapshot) => {
          const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLeaveRequests(requests);
          
          requests.forEach(req => {
            if (req.status === 'Approved' || req.status === 'Rejected') {
              setNotifications(prev => {
                const exists = prev.find(n => n.leaveId === req.id);
                if (!exists) {
                  return [...prev, {
                    id: Date.now(),
                    leaveId: req.id,
                    message: `Leave request ${req.status.toLowerCase()} for ${req.type}`,
                    read: false,
                    createdAt: new Date().toISOString()
                  }];
                }
                return prev;
              });
            }
          });
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
      
      const balance = leaveFormData.type === 'Vacation' ? leaveBalance.vacationLeave : leaveBalance.sickLeave;
      if (days > balance) {
        alert(`Insufficient ${leaveFormData.type} leave balance. Available: ${balance} days`);
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'leaveRequests'), {
        employeeId: employee.id,
        type: leaveFormData.type,
        startDate: leaveFormData.startDate,
        endDate: leaveFormData.endDate,
        days: days,
        reason: leaveFormData.reason || '',
        status: 'Pending',
        dateSubmitted: new Date().toISOString()
      });

      alert('Leave request submitted successfully');
      setShowLeaveForm(false);
      setLeaveFormData({ type: 'Vacation', startDate: '', endDate: '', reason: '' });
      fetchEmployeeData();
    } catch (error) {
      console.error('Error submitting leave:', error);
      alert('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // File selection with compression
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('File is too large. Maximum size is 10MB.');
      return;
    }

    let processedFile = file;

    // If it's an image, compress it
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

  // UPLOAD with progress tracking - FIXED
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

      // ✅ FIXED: Using imported 'storage' from firebase.js
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
            
            await addDoc(collection(db, 'documents'), {
              employeeId: employee.id,
              employeeName: employee.fullName,
              documentType: selectedDocType,
              status: 'Pending Review',
              fileUrl: downloadURL,
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              uploadedAt: new Date().toISOString()
            });

            // Admin notification
            await addDoc(collection(db, 'notifications'), {
              type: 'compliance_upload',
              employeeId: employee.id,
              employeeName: employee.fullName,
              department: employee.department,
              documentType: selectedDocType,
              message: `${employee.fullName} uploaded ${selectedDocType} for compliance review`,
              read: false,
              forAdmin: true,
              createdAt: new Date().toISOString()
            });

            // Employee confirmation
            await addDoc(collection(db, 'notifications'), {
              type: 'compliance_upload_confirmation',
              employeeId: employee.id,
              message: `Your ${selectedDocType} has been uploaded and is pending review by HR`,
              read: false,
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

  const complianceRate = documents.length > 0 
    ? Math.round((documents.filter(d => d.status === 'Complete').length / documents.length) * 100)
    : 0;

  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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

      <div className="dashboard-grid">
        <div className="dashboard-box">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button onClick={() => { setActiveTab('leave'); setShowLeaveForm(true); }} className="action-btn blue">
              <CalendarTodayIcon style={{ fontSize: 18, marginRight: 8 }} />
              File Leave
            </button>
            <button onClick={() => { setActiveTab('compliance'); setShowUploadForm(true); }} className="action-btn green">
              <UploadIcon style={{ fontSize: 18, marginRight: 8 }} />
              Upload Document
            </button>
            <button onClick={() => setActiveTab('compliance')} className="action-btn purple">
              <FolderIcon style={{ fontSize: 18, marginRight: 8 }} />
              View Compliance
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
              </tr>
            ))}
            {leaveRequests.length === 0 && (
              <tr><td colSpan="5" className="empty-state">No leave requests found</td></tr>
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
                    📎 {selectedFile.name} 
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>

            {uploading && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="upload-progress-text">{uploadProgress}%</span>
              </div>
            )}

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

  const renderNotifications = () => (
    <div className="employee-notifications-content">
      <div className="section-header">
        <h2>Notifications</h2>
        {unreadNotifications > 0 && (
          <span className="badge-count-large">{unreadNotifications} unread</span>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 && (
          <div className="no-notifications">
            <NotificationsIcon style={{ fontSize: 48, color: '#b0c4de' }} />
            <p>No notifications yet</p>
          </div>
        )}
        {notifications.map(notif => (
          <div key={notif.id} className={`notification-item ${notif.read ? 'read' : 'unread'}`}>
            <div className="notification-content">
              <p>{notif.message}</p>
              <span className="notification-time">
                {new Date(notif.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
          <p><AttachMoneyIcon style={{ fontSize: 16, marginRight: 8 }} /> Salary: ₱{employee.salary?.toLocaleString() || 'N/A'}</p>
          <p><PersonIcon style={{ fontSize: 16, marginRight: 8 }} /> Status: <span className={`status-dot ${employee.status === 'Inactive' ? 'inactive' : 'active'}`}>
            {employee.status || 'Active'}
          </span></p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="employee-portal">
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
        {activeTab === 'leave' && renderLeave()}
        {activeTab === 'compliance' && renderCompliance()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
}

export default EmployeePortal;