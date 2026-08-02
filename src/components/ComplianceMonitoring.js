// src/components/ComplianceMonitoring.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';

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

function ComplianceMonitoring() {
  const location = useLocation();
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const notificationRef = useRef(null);

  // Check for navigation state from EmployeePortal
  useEffect(() => {
    if (location.state) {
      const { notification, employeeId } = location.state;
      if (notification && employeeId) {
        setToastMessage(notification);
        setHighlightedEmployeeId(employeeId);
        setFilter('missing'); // Auto-filter to show pending/missing documents
        
        // Auto-dismiss toast after 8 seconds
        setTimeout(() => {
          setToastMessage(null);
        }, 8000);
        
        // Clear location state to prevent showing again on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location]);

  useEffect(() => {
    fetchEmployees();
    fetchDocuments();
    setupRealtimeListeners();
  }, []);

  const setupRealtimeListeners = () => {
    // Listen for new documents in real-time
    const unsubscribe = onSnapshot(collection(db, 'documents'), (snapshot) => {
      const docList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocuments(docList);
      
      // Check for new pending documents and show notification
      const newPending = docList.filter(d => d.status === 'Pending Review');
      if (newPending.length > 0 && toastMessage) {
        // Play notification sound or show alert if needed
      }
    });

    return unsubscribe;
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
  };

  const updateDocumentStatus = async (docId, newStatus) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'documents', docId), { 
        status: newStatus,
        reviewedAt: new Date().toISOString()
      });
      await fetchDocuments();
      
      // Find the document to get employee info
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        // Notify employee of status change
        await addDoc(collection(db, 'notifications'), {
          employeeId: doc.employeeId,
          type: 'compliance_status_updated',
          message: `Your ${doc.documentType} has been marked as ${newStatus}`,
          read: false,
          forEmployee: true,
          forAdmin: false,
          createdAt: new Date().toISOString()
        });
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
    return { 
      total, 
      complete, 
      pending,
      percentage: total === 0 ? 0 : Math.round((complete / total) * 100) 
    };
  };

  const getMissingDocuments = (employeeId) => {
    return documents.filter(doc => doc.employeeId === employeeId && doc.status === 'Pending Review');
  };

  const getStatusColor = (status) => {
    if (status === 'Complete') return 'success';
    if (status === 'Pending Review') return 'warning';
    if (status === 'Missing') return 'danger';
    if (status === 'Expired') return 'warning';
    return 'secondary';
  };

  const filteredEmployees = employees.filter(emp => {
    const status = getComplianceStatus(emp.id);
    if (filter === 'missing') return status.pending > 0 || status.percentage < 100;
    if (filter === 'complete') return status.percentage === 100;
    if (filter === 'pending') return status.pending > 0;
    return true;
  });

  const totalEmployees = employees.length;
  const fullyCompliant = employees.filter(emp => getComplianceStatus(emp.id).percentage === 100).length;
  const missingDocs = employees.filter(emp => getComplianceStatus(emp.id).pending > 0).length;
  const pendingReview = documents.filter(doc => doc.status === 'Pending Review').length;

  return (
    <div className="compliance-container">
      {/* Toast Notification for new upload */}
      {toastMessage && (
        <div className="toast-notification" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#4a6fa5',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.5s ease-out'
        }}>
          <NotificationImportantIcon style={{ fontSize: 28 }} />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>New Compliance Submission</div>
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
        <div className="stats-badge" style={{
          background: pendingReview > 0 ? '#e74c3c' : '#27ae60',
          padding: '8px 16px',
          borderRadius: '20px',
          color: 'white'
        }}>
          {pendingReview > 0 ? `⚠️ ${pendingReview} Pending` : '✅ All Reviewed'}
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
            <p>{totalEmployees}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Fully Compliant</h3>
            <p>{fullyCompliant}</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <WarningIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Pending Review</h3>
            <p>{pendingReview}</p>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">
            <DescriptionIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Need Attention</h3>
            <p>{missingDocs}</p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar-modern">
        <button 
          onClick={() => setFilter('all')} 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
        >
          <FolderIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          All Employees ({filteredEmployees.length})
        </button>
        <button 
          onClick={() => setFilter('pending')} 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          style={filter === 'pending' ? { background: '#e67e22', color: 'white' } : {}}
        >
          <WarningIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          Pending Review ({documents.filter(d => d.status === 'Pending Review').length})
        </button>
        <button 
          onClick={() => setFilter('missing')} 
          className={`filter-btn ${filter === 'missing' ? 'active' : ''}`}
        >
          <WarningIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          Missing Documents ({missingDocs})
        </button>
        <button 
          onClick={() => setFilter('complete')} 
          className={`filter-btn ${filter === 'complete' ? 'active' : ''}`}
        >
          <CheckCircleIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
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
              const pendingDocs = getMissingDocuments(emp.id);
              const isCompliant = status.percentage === 100;
              const isHighlighted = emp.id === highlightedEmployeeId;
              
              return (
                <tr 
                  key={emp.id} 
                  className={`
                    ${isCompliant ? 'compliant-row' : 'non-compliant-row'}
                    ${isHighlighted ? 'highlighted-row' : ''}
                  `}
                  style={isHighlighted ? {
                    background: '#e8f4fd',
                    borderLeft: '4px solid #4a6fa5',
                    animation: 'highlightFade 2s ease-out'
                  } : {}}
                >
                  <td>
                    <div className="employee-info">
                      <div className="employee-avatar small">
                        {emp.fullName?.charAt(0) || '?'}
                      </div>
                      <span className="employee-name">{emp.fullName}</span>
                      {isHighlighted && (
                        <span style={{
                          background: '#4a6fa5',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          marginLeft: '8px'
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                  </td>
                  <td><span className="dept-tag">{emp.department || 'N/A'}</span></td>
                  <td>
                    <div className="progress-bar-modern">
                      <div 
                        className={`progress-fill ${isCompliant ? 'complete' : 'partial'}`} 
                        style={{ width: `${status.percentage}%` }}
                      >
                        <span>{status.percentage}%</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isCompliant ? 
                      <span className="status-badge success">
                        <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Complete
                      </span> : 
                      <span className="status-badge warning">
                        <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        {status.pending} Pending
                      </span>
                    }
                  </td>
                  <td>
                    {pendingDocs.length > 0 ? (
                      <div className="missing-tags">
                        {pendingDocs.map(doc => (
                          <span key={doc.id} className="missing-tag" style={{
                            background: '#fff3cd',
                            color: '#856404',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            margin: '2px 4px'
                          }}>
                            {doc.documentType}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-missing">✓ All complete</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedEmployee(emp)} 
                      className="btn-view-details"
                      style={{
                        padding: '6px 14px',
                        background: '#4a6fa5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                      }}
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
                <span className="employee-avatar small" style={{ marginRight: '12px' }}>
                  {selectedEmployee.fullName?.charAt(0) || '?'}
                </span>
                {selectedEmployee.fullName} - Document Status
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setSelectedEmployee(null)}
              >
                <CloseIcon />
              </button>
            </div>
            
            <div className="doc-status-grid">
              {documents.filter(doc => doc.employeeId === selectedEmployee.id).map(doc => (
                <div key={doc.id} className="doc-card" style={{
                  border: doc.status === 'Pending Review' ? '2px solid #f39c12' : '1px solid #eee'
                }}>
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
                        <>
                          <EventIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </>
                      ) : 'No upload date'}
                    </span>
                    {doc.fileUrl && (
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          color: '#4a6fa5',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <VisibilityIcon style={{ fontSize: 14 }} />
                        View File
                      </a>
                    )}
                    <select 
                      value={doc.status} 
                      onChange={(e) => updateDocumentStatus(doc.id, e.target.value)}
                      className="doc-status-select"
                      disabled={loading}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        marginTop: '8px',
                        width: '100%'
                      }}
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
              <button 
                className="btn-cancel" 
                onClick={() => setSelectedEmployee(null)}
                style={{
                  padding: '10px 24px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CloseIcon style={{ fontSize: 18 }} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes highlightFade {
          0% {
            background: #cce5ff;
            transform: scale(1.02);
          }
          50% {
            background: #e8f4fd;
          }
          100% {
            background: #e8f4fd;
            transform: scale(1);
          }
        }
        
        .highlighted-row {
          animation: highlightFade 2s ease-out;
          border-left: 4px solid #4a6fa5;
        }
        
        .toast-notification {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ComplianceMonitoring;