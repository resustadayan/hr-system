// src/components/Interventions.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

function Interventions() {
  const [interventions, setInterventions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const empSnapshot = await getDocs(collection(db, 'employees'));
      const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empList);

      // Fetch interventions
      const intSnapshot = await getDocs(collection(db, 'interventions'));
      const intList = intSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInterventions(intList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInterventionStatus = async (interventionId, newStatus) => {
    try {
      await updateDoc(doc(db, 'interventions', interventionId), { status: newStatus });
      setInterventions(interventions.map(i => 
        i.id === interventionId ? { ...i, status: newStatus } : i
      ));
    } catch (error) {
      console.error('Error updating intervention:', error);
      alert('Failed to update intervention status');
    }
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return 'Unknown Employee';
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName || 'Unknown Employee' : 'Unknown Employee';
  };

  const getPriorityBadge = (priority) => {
    if (!priority) return <span className="badge secondary">Low Priority</span>;
    const p = priority.toLowerCase();
    if (p === 'high') return <span className="badge danger">High Priority</span>;
    if (p === 'medium') return <span className="badge warning">Medium Priority</span>;
    return <span className="badge info">Low Priority</span>;
  };

  const getTypeIcon = (type) => {
    if (!type) return '⚠️';
    const t = type.toLowerCase();
    if (t === 'performance') return '📊';
    if (t === 'attendance') return '⏰';
    if (t === 'compliance') return '📄';
    return '⚠️';
  };

  const filteredInterventions = interventions.filter(i => {
    if (filter === 'pending') return i.status === 'Pending' || i.status === 'pending';
    if (filter === 'resolved') return i.status === 'Resolved' || i.status === 'resolved';
    return true;
  });

  const pendingCount = interventions.filter(i => i.status === 'Pending' || i.status === 'pending').length;
  const resolvedCount = interventions.filter(i => i.status === 'Resolved' || i.status === 'resolved').length;

  if (loading) {
    return <div className="loading">Loading interventions...</div>;
  }

  return (
    <div className="interventions-container">
      <h2>Automated Interventions</h2>
      
      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>Pending</h3>
          <p>{pendingCount}</p>
        </div>
        <div className="stat-card">
          <h3>Resolved</h3>
          <p>{resolvedCount}</p>
        </div>
        <div className="stat-card">
          <h3>Total</h3>
          <p>{interventions.length}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar">
        <button 
          onClick={() => setFilter('all')} 
          className={filter === 'all' ? 'active' : ''}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('pending')} 
          className={filter === 'pending' ? 'active' : ''}
        >
          Pending
        </button>
        <button 
          onClick={() => setFilter('resolved')} 
          className={filter === 'resolved' ? 'active' : ''}
        >
          Resolved
        </button>
        <button onClick={fetchData} className="btn-generate">
          Refresh
        </button>
      </div>

      {/* Interventions List */}
      <div className="interventions-list">
        {filteredInterventions.length === 0 && (
          <div className="no-interventions">
            <p>No interventions found. Click "Refresh" to check for new issues.</p>
          </div>
        )}
        
        {filteredInterventions.map(intervention => (
          <div key={intervention.id} className={`intervention-card ${(intervention.status || 'pending').toLowerCase()}`}>
            <div className="intervention-header">
              <div className="intervention-type">
                <span className="type-icon">{getTypeIcon(intervention.type)}</span>
                <strong>{intervention.type || 'General'}</strong>
              </div>
              {getPriorityBadge(intervention.priority)}
            </div>
            <div className="intervention-body">
              <p><strong>Employee:</strong> {getEmployeeName(intervention.employeeId)}</p>
              <p><strong>Recommendation:</strong> {intervention.recommendation || 'No recommendation provided'}</p>
              <p><strong>Date Generated:</strong> {intervention.dateGenerated ? new Date(intervention.dateGenerated).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Status:</strong> 
                <span className={`status-badge ${(intervention.status || 'pending').toLowerCase()}`}>
                  {intervention.status || 'Pending'}
                </span>
              </p>
            </div>
            <div className="intervention-footer">
              {intervention.status !== 'Resolved' && intervention.status !== 'resolved' && (
                <>
                  <button onClick={() => updateInterventionStatus(intervention.id, 'In Progress')} className="btn-progress">
                    Mark In Progress
                  </button>
                  <button onClick={() => updateInterventionStatus(intervention.id, 'Resolved')} className="btn-resolve">
                    Mark Resolved
                  </button>
                </>
              )}
              {intervention.status === 'Resolved' && (
                <span className="badge success">✓ Resolved</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Interventions;