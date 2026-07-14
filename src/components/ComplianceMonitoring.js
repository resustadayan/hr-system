// src/components/ComplianceMonitoring.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

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

function ComplianceMonitoring() {
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchDocuments();
  }, []);

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
      await updateDoc(doc(db, 'documents', docId), { status: newStatus });
      await fetchDocuments();
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
    return { 
      total, 
      complete, 
      percentage: total === 0 ? 0 : Math.round((complete / total) * 100) 
    };
  };

  const getMissingDocuments = (employeeId) => {
    return documents.filter(doc => doc.employeeId === employeeId && doc.status === 'Missing');
  };

  const getStatusColor = (status) => {
    if (status === 'Complete') return 'success';
    if (status === 'Missing') return 'danger';
    if (status === 'Expired') return 'warning';
    return 'secondary';
  };

  const filteredEmployees = employees.filter(emp => {
    const status = getComplianceStatus(emp.id);
    if (filter === 'missing') return status.percentage < 100;
    if (filter === 'complete') return status.percentage === 100;
    return true;
  });

  const totalEmployees = employees.length;
  const fullyCompliant = employees.filter(emp => getComplianceStatus(emp.id).percentage === 100).length;
  const missingDocs = employees.filter(emp => getComplianceStatus(emp.id).percentage < 100).length;

  return (
    <div className="compliance-container">

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <CheckCircleIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Compliance Monitoring
          </h2>
          <p className="header-subtitle">Track and manage employee document compliance</p>
        </div>
        <div className="stats-badge">
          <span>{fullyCompliant}/{totalEmployees} Compliant</span>
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
        <div className="stat-card red">
          <div className="stat-icon">
            <DescriptionIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Missing Documents</h3>
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
          All Employees
        </button>
        <button 
          onClick={() => setFilter('missing')} 
          className={`filter-btn ${filter === 'missing' ? 'active' : ''}`}
        >
          <WarningIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          Missing Documents
        </button>
        <button 
          onClick={() => setFilter('complete')} 
          className={`filter-btn ${filter === 'complete' ? 'active' : ''}`}
        >
          <CheckCircleIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          Fully Compliant
        </button>
        <span className="filter-count">{filteredEmployees.length} employees</span>
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
              <th>Missing Documents</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const status = getComplianceStatus(emp.id);
              const missingDocsList = getMissingDocuments(emp.id);
              const isCompliant = status.percentage === 100;
              
              return (
                <tr key={emp.id} className={isCompliant ? 'compliant-row' : 'non-compliant-row'}>
                  <td>
                    <div className="employee-info">
                      <div className="employee-avatar small">
                        {emp.fullName?.charAt(0) || '?'}
                      </div>
                      <span className="employee-name">{emp.fullName}</span>
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
                        {status.total - status.complete} Missing
                      </span>
                    }
                  </td>
                  <td>
                    {missingDocsList.length > 0 ? (
                      <div className="missing-tags">
                        {missingDocsList.map(doc => (
                          <span key={doc.id} className="missing-tag">{doc.documentType}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-missing">—</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedEmployee(emp)} 
                      className="btn-view-details"
                    >
                      <VisibilityIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      View Details
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
                <div key={doc.id} className="doc-card">
                  <div className="doc-info">
                    <span className="doc-type">{doc.documentType}</span>
                    <span className={`doc-status ${getStatusColor(doc.status)}`}>
                      {doc.status === 'Complete' && <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />}
                      {doc.status === 'Missing' && <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />}
                      {doc.status === 'Expired' && <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />}
                      {doc.status}
                    </span>
                  </div>
                  <div className="doc-details">
                    <span className="doc-expiry">
                      {doc.expiryDate ? (
                        <>
                          <EventIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                          Expires: {doc.expiryDate}
                        </>
                      ) : 'No expiry date'}
                    </span>
                    <select 
                      value={doc.status} 
                      onChange={(e) => updateDocumentStatus(doc.id, e.target.value)}
                      className="doc-status-select"
                      disabled={loading}
                    >
                      <option value="Complete">
                        <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Complete
                      </option>
                      <option value="Missing">
                        <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Missing
                      </option>
                      <option value="Expired">
                        <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Expired
                      </option>
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
              >
                <CloseIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceMonitoring;