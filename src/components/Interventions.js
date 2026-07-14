// src/components/Interventions.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

function Interventions() {
  const [interventions, setInterventions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedIntervention, setSelectedIntervention] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empSnapshot = await getDocs(collection(db, 'employees'));
      const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empList);

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
      alert('❌ Failed to update intervention status');
    }
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return 'Unknown Employee';
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName || 'Unknown Employee' : 'Unknown Employee';
  };

  const getEmployeeDepartment = (employeeId) => {
    if (!employeeId) return 'N/A';
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.department || 'N/A' : 'N/A';
  };

  const getPriorityBadge = (priority) => {
    if (!priority) return <span className="badge secondary">Low Priority</span>;
    const p = priority.toLowerCase();
    if (p === 'high') return <span className="badge danger">🔴 High Priority</span>;
    if (p === 'medium') return <span className="badge warning">🟠 Medium Priority</span>;
    return <span className="badge info">🟢 Low Priority</span>;
  };

  const getTypeIcon = (type) => {
    if (!type) return '⚠️';
    const t = type.toLowerCase();
    if (t === 'performance') return '📊';
    if (t === 'attendance') return '⏰';
    if (t === 'compliance') return '📄';
    return '⚠️';
  };

  const getTypeColor = (type) => {
    if (!type) return '#6b7a8f';
    const t = type.toLowerCase();
    if (t === 'performance') return '#7c3aed';
    if (t === 'attendance') return '#e67e22';
    if (t === 'compliance') return '#e74c3c';
    return '#6b7a8f';
  };

  const filteredInterventions = interventions.filter(i => {
    if (filter === 'pending') return i.status === 'Pending' || i.status === 'pending';
    if (filter === 'resolved') return i.status === 'Resolved' || i.status === 'resolved';
    if (filter === 'in-progress') return i.status === 'In Progress' || i.status === 'in-progress';
    return true;
  });

  const pendingCount = interventions.filter(i => i.status === 'Pending' || i.status === 'pending').length;
  const resolvedCount = interventions.filter(i => i.status === 'Resolved' || i.status === 'resolved').length;
  const inProgressCount = interventions.filter(i => i.status === 'In Progress' || i.status === 'in-progress').length;

  if (loading) {
    return <div className="loading">Loading interventions...</div>;
  }

  return (
    <div className="interventions-container">

      {/* Page Header - Updated */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>🫴🏻 Interventions</h2>
        </div>
        <button onClick={fetchData} className="btn-add-modern">
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>Pending</h3>
            <p>{pendingCount}</p>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <h3>In Progress</h3>
            <p>{inProgressCount}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Resolved</h3>
            <p>{resolvedCount}</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>Total</h3>
            <p>{interventions.length}</p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-bar-modern">
        <button 
          onClick={() => setFilter('all')} 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
        >
          📋 All
        </button>
        <button 
          onClick={() => setFilter('pending')} 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
        >
          ⏳ Pending
        </button>
        <button 
          onClick={() => setFilter('in-progress')} 
          className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
        >
          🔄 In Progress
        </button>
        <button 
          onClick={() => setFilter('resolved')} 
          className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
        >
          ✅ Resolved
        </button>
        <span className="filter-count">{filteredInterventions.length} interventions</span>
      </div>

      {/* Interventions List */}
      <div className="interventions-list">
        {filteredInterventions.length === 0 && (
          <div className="no-interventions">
            <div className="empty-icon">✅</div>
            <p>All clear! No interventions found.</p>
            <span>No pending issues requiring attention</span>
          </div>
        )}
        
        {filteredInterventions.map(intervention => {
          const status = (intervention.status || 'pending').toLowerCase();
          const typeColor = getTypeColor(intervention.type);
          
          return (
            <div key={intervention.id} className={`intervention-card ${status}`}>
              <div className="intervention-header">
                <div className="intervention-type">
                  <span className="type-icon">{getTypeIcon(intervention.type)}</span>
                  <strong style={{ color: typeColor }}>
                    {intervention.type || 'General'}
                  </strong>
                  <span className="intervention-dept">
                    {getEmployeeDepartment(intervention.employeeId)}
                  </span>
                </div>
                <div className="intervention-actions-header">
                  {getPriorityBadge(intervention.priority)}
                  <span className={`status-badge ${status}`}>
                    {status === 'pending' && '⏳ Pending'}
                    {status === 'in-progress' && '🔄 In Progress'}
                    {status === 'resolved' && '✅ Resolved'}
                  </span>
                </div>
              </div>
              
              <div className="intervention-body">
                <div className="intervention-employee">
                  <div className="employee-avatar small">
                    {getEmployeeName(intervention.employeeId).charAt(0)}
                  </div>
                  <div className="employee-details">
                    <span className="employee-name">{getEmployeeName(intervention.employeeId)}</span>
                    <span className="employee-id">#{intervention.employeeId?.slice(0, 8) || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="intervention-recommendation">
                  <span className="rec-label">💡 Recommendation:</span>
                  <p>{intervention.recommendation || 'No recommendation provided'}</p>
                </div>
                
                <div className="intervention-meta">
                  <span className="meta-item">
                    📅 {intervention.dateGenerated ? new Date(intervention.dateGenerated).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className="meta-item">
                    🏷️ {intervention.type || 'General'}
                  </span>
                </div>
              </div>
              
              <div className="intervention-footer">
                {status !== 'resolved' && (
                  <>
                    {status === 'pending' && (
                      <button 
                        onClick={() => updateInterventionStatus(intervention.id, 'In Progress')} 
                        className="btn-action in-progress"
                      >
                        🔄 Mark In Progress
                      </button>
                    )}
                    {status === 'in-progress' && (
                      <button 
                        onClick={() => updateInterventionStatus(intervention.id, 'Resolved')} 
                        className="btn-action resolve"
                      >
                        ✅ Mark Resolved
                      </button>
                    )}
                    {status === 'pending' && (
                      <button 
                        onClick={() => updateInterventionStatus(intervention.id, 'Resolved')} 
                        className="btn-action resolve"
                      >
                        ✅ Resolve
                      </button>
                    )}
                  </>
                )}
                {status === 'resolved' && (
                  <span className="resolved-badge">✅ Resolved</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Interventions;