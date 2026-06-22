import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

function Interventions() {
  const [interventions, setInterventions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [performanceRatings, setPerformanceRatings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, resolved

  useEffect(() => {
    fetchData();
    generateInterventions();
  }, []);

  const fetchData = async () => {
    // Fetch employees
    const empSnapshot = await getDocs(collection(db, 'employees'));
    setEmployees(empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch attendance records
    const attSnapshot = await getDocs(collection(db, 'attendance'));
    setAttendanceRecords(attSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch documents (compliance)
    const docSnapshot = await getDocs(collection(db, 'documents'));
    setDocuments(docSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch existing interventions
    const intSnapshot = await getDocs(collection(db, 'interventions'));
    setInterventions(intSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const generateInterventions = async () => {
    const newInterventions = [];

    // 1. Performance-based interventions
    for (const emp of employees) {
      // Check if employee has low performance rating (below 3)
      const hasLowPerformance = performanceRatings.some(rating => 
        rating.employeeId === emp.id && rating.rating <= 2
      );
      
      if (hasLowPerformance) {
        newInterventions.push({
          employeeId: emp.id,
          type: 'Performance',
          recommendation: 'Employee requires Performance Improvement Plan (PIP) and mandatory training',
          priority: 'High',
          status: 'Pending',
          dateGenerated: new Date().toISOString()
        });
      }
    }

    // 2. Attendance-based interventions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    for (const emp of employees) {
      const recentAttendance = attendanceRecords.filter(record => 
        record.employeeId === emp.id && 
        record.date >= thirtyDaysAgoStr &&
        record.status === 'Late'
      );
      
      if (recentAttendance.length >= 5) {
        newInterventions.push({
          employeeId: emp.id,
          type: 'Attendance',
          recommendation: `Employee has been late ${recentAttendance.length} times in the past 30 days. Counseling suggested.`,
          priority: 'Medium',
          status: 'Pending',
          dateGenerated: new Date().toISOString()
        });
      }
    }

    // 3. Compliance-based interventions
    for (const emp of employees) {
      const missingDocs = documents.filter(doc => 
        doc.employeeId === emp.id && doc.status === 'Missing'
      );
      
      if (missingDocs.length > 0) {
        newInterventions.push({
          employeeId: emp.id,
          type: 'Compliance',
          recommendation: `Missing ${missingDocs.length} required document(s): ${missingDocs.map(d => d.documentType).join(', ')}`,
          priority: 'High',
          status: 'Pending',
          dateGenerated: new Date().toISOString()
        });
      }
    }

    setInterventions(newInterventions);
  };

  const updateInterventionStatus = async (interventionId, newStatus) => {
    await updateDoc(doc(db, 'interventions', interventionId), { status: newStatus });
    setInterventions(interventions.map(i => 
      i.id === interventionId ? { ...i, status: newStatus } : i
    ));
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName : 'Unknown';
  };

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'High': return <span className="badge danger">High Priority</span>;
      case 'Medium': return <span className="badge warning">Medium Priority</span>;
      default: return <span className="badge info">Low Priority</span>;
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Performance': return '📊';
      case 'Attendance': return '⏰';
      case 'Compliance': return '📄';
      default: return '⚠️';
    }
  };

  const filteredInterventions = interventions.filter(i => {
    if (filter === 'pending') return i.status === 'Pending';
    if (filter === 'resolved') return i.status === 'Resolved';
    return true;
  });

  return (
    <div className="interventions-container">
      <h2>Automated Interventions</h2>
      
      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>Pending</h3>
          <p>{interventions.filter(i => i.status === 'Pending').length}</p>
        </div>
        <div className="stat-card">
          <h3>Resolved</h3>
          <p>{interventions.filter(i => i.status === 'Resolved').length}</p>
        </div>
        <div className="stat-card">
          <h3>Total</h3>
          <p>{interventions.length}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>All</button>
        <button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>Pending</button>
        <button onClick={() => setFilter('resolved')} className={filter === 'resolved' ? 'active' : ''}>Resolved</button>
        <button onClick={generateInterventions} className="btn-generate">Generate New Interventions</button>
      </div>

      {/* Interventions List */}
      <div className="interventions-list">
        {filteredInterventions.map(intervention => (
          <div key={intervention.id} className={`intervention-card ${intervention.status.toLowerCase()}`}>
            <div className="intervention-header">
              <div className="intervention-type">
                <span className="type-icon">{getTypeIcon(intervention.type)}</span>
                <strong>{intervention.type}</strong>
              </div>
              {getPriorityBadge(intervention.priority)}
            </div>
            <div className="intervention-body">
              <p><strong>Employee:</strong> {getEmployeeName(intervention.employeeId)}</p>
              <p><strong>Recommendation:</strong> {intervention.recommendation}</p>
              <p><strong>Date Generated:</strong> {new Date(intervention.dateGenerated).toLocaleDateString()}</p>
              <p><strong>Status:</strong> 
                <span className={`status-badge ${intervention.status.toLowerCase()}`}>
                  {intervention.status}
                </span>
              </p>
            </div>
            <div className="intervention-footer">
              {intervention.status === 'Pending' && (
                <>
                  <button onClick={() => updateInterventionStatus(intervention.id, 'In Progress')} className="btn-progress">
                    Mark In Progress
                  </button>
                  <button onClick={() => updateInterventionStatus(intervention.id, 'Resolved')} className="btn-resolve">
                    Mark Resolved
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        
        {filteredInterventions.length === 0 && (
          <div className="no-interventions">
            <p>No interventions found. Click "Generate New Interventions" to check for issues.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Interventions;