import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

function ComplianceMonitoring() {
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filter, setFilter] = useState('all'); // all, missing, complete

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
    await updateDoc(doc(db, 'documents', docId), { status: newStatus });
    fetchDocuments();
  };

  const getComplianceStatus = (employeeId) => {
    const employeeDocs = documents.filter(doc => doc.employeeId === employeeId);
    const total = employeeDocs.length;
    const complete = employeeDocs.filter(doc => doc.status === 'Complete').length;
    return { total, complete, percentage: total === 0 ? 0 : (complete / total) * 100 };
  };

  const getMissingDocuments = (employeeId) => {
    return documents.filter(doc => doc.employeeId === employeeId && doc.status === 'Missing');
  };

  const filteredEmployees = employees.filter(emp => {
    const status = getComplianceStatus(emp.id);
    if (filter === 'missing') return status.percentage < 100;
    if (filter === 'complete') return status.percentage === 100;
    return true;
  });

  return (
    <div className="compliance-container">
      <h2>Compliance Monitoring</h2>
      
      {/* Filter Controls */}
      <div className="filter-bar">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>All Employees</button>
        <button onClick={() => setFilter('missing')} className={filter === 'missing' ? 'active' : ''}>Missing Documents</button>
        <button onClick={() => setFilter('complete')} className={filter === 'complete' ? 'active' : ''}>Fully Compliant</button>
      </div>

      {/* Compliance Summary Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Employees</h3>
          <p>{employees.length}</p>
        </div>
        <div className="stat-card">
          <h3>Fully Compliant</h3>
          <p>{employees.filter(emp => getComplianceStatus(emp.id).percentage === 100).length}</p>
        </div>
        <div className="stat-card">
          <h3>Missing Documents</h3>
          <p>{employees.filter(emp => getComplianceStatus(emp.id).percentage < 100).length}</p>
        </div>
      </div>

      {/* Employee Compliance Table */}
      <table className="compliance-table">
        <thead>
          <tr>
            <th>Employee Name</th>
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
            const missingDocs = getMissingDocuments(emp.id);
            return (
              <tr key={emp.id} className={status.percentage === 100 ? 'compliant' : 'non-compliant'}>
                <td>{emp.fullName}</td>
                <td>{emp.department}</td>
                <td>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${status.percentage}%` }}></div>
                    <span>{status.percentage.toFixed(0)}%</span>
                  </div>
                </td>
                <td>
                  {status.percentage === 100 ? 
                    <span className="badge success">Complete</span> : 
                    <span className="badge warning">Missing {status.total - status.complete} doc(s)</span>
                  }
                </td>
                <td>
                  {missingDocs.map(doc => (
                    <span key={doc.id} className="doc-missing">{doc.documentType}</span>
                  ))}
                </td>
                <td>
                  <button onClick={() => setSelectedEmployee(emp)} className="btn-view">View Details</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="modal">
          <div className="modal-content">
            <h3>{selectedEmployee.fullName} - Document Status</h3>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Status</th>
                  <th>Expiry Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.filter(doc => doc.employeeId === selectedEmployee.id).map(doc => (
                  <tr key={doc.id}>
                    <td>{doc.documentType}</td>
                    <td>
                      <span className={doc.status === 'Complete' ? 'badge success' : 'badge danger'}>
                        {doc.status}
                      </span>
                    </td>
                    <td>{doc.expiryDate || 'N/A'}</td>
                    <td>
                      <select 
                        value={doc.status} 
                        onChange={(e) => updateDocumentStatus(doc.id, e.target.value)}
                      >
                        <option value="Complete">Complete</option>
                        <option value="Missing">Missing</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setSelectedEmployee(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceMonitoring;