import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const logList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLogs(logList);
  };

  const getActionBadge = (action) => {
    const actionMap = {
      'CREATE': 'badge success',
      'UPDATE': 'badge warning',
      'DELETE': 'badge danger',
      'LOGIN': 'badge info',
      'LOGOUT': 'badge info',
      'APPROVE': 'badge success',
      'REJECT': 'badge danger'
    };
    
    const actionType = action.split('_')[0] || action;
    return actionMap[actionType] || 'badge secondary';
  };

  const filteredLogs = logs.filter(log => {
    // Filter by type
    if (filterType !== 'all' && log.action !== filterType) return false;
    
    // Filter by search term
    if (searchTerm && !log.details?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    // Filter by date range
    if (dateRange.start && new Date(log.timestamp) < new Date(dateRange.start)) return false;
    if (dateRange.end && new Date(log.timestamp) > new Date(dateRange.end)) return false;
    
    return true;
  });

  return (
    <div className="audit-logs-container">
      <h2>Audit Logs</h2>
      <p>Track all user activities and system changes for accountability and compliance.</p>

      {/* Filter Controls */}
      <div className="filters-card">
        <div className="filter-group">
          <label>Action Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Search:</label>
          <input 
            type="text" 
            placeholder="Search by user or details..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>Date From:</label>
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
        </div>
        
        <div className="filter-group">
          <label>Date To:</label>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
        
        <button onClick={fetchLogs} className="btn-refresh">Refresh</button>
      </div>

      {/* Summary Stats */}
      <div className="stats-row small">
        <div className="stat-card">
          <h3>Total Logs</h3>
          <p>{logs.length}</p>
        </div>
        <div className="stat-card">
          <h3>Filtered Logs</h3>
          <p>{filteredLogs.length}</p>
        </div>
      </div>

      {/* Logs Table */}
      <table className="logs-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User ID</th>
            <th>Action</th>
            <th>Details</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.userId || 'System'}</td>
              <td>
                <span className={getActionBadge(log.action)}>
                  {log.action}
                </span>
              </td>
              <td>{log.details || '—'}</td>
              <td>{log.ipAddress || '—'}</td>
            </tr>
          ))}
          {filteredLogs.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No audit logs found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AuditLogs;