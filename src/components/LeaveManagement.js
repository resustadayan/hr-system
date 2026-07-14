// src/components/LeaveManagement.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';

// Material-UI Icons
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import InboxIcon from '@mui/icons-material/Inbox';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SickIcon from '@mui/icons-material/Sick';
import WarningIcon from '@mui/icons-material/Warning';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import ManIcon from '@mui/icons-material/Man';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchLeaveRequests();
  }, []);

  const fetchEmployees = async () => {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEmployees(empList);
  };

  const fetchLeaveRequests = async () => {
    const q = query(collection(db, 'leaveRequests'));
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLeaveRequests(requests);
  };

  const submitLeave = async () => {
    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const days = calculateDays(formData.startDate, formData.endDate);
      await addDoc(collection(db, 'leaveRequests'), {
        ...formData,
        days: days,
        status: 'Pending',
        dateSubmitted: new Date().toISOString()
      });
      alert('✅ Leave request submitted successfully');
      setShowForm(false);
      setFormData({ employeeId: '', type: 'Vacation', startDate: '', endDate: '', reason: '' });
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error submitting leave:', error);
      alert('❌ Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'leaveRequests', id), { status });
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Failed to update status');
    }
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName : 'Unknown';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.department : 'N/A';
  };

  const filteredRequests = leaveRequests.filter(req => {
    if (filter === 'pending') return req.status === 'Pending';
    if (filter === 'approved') return req.status === 'Approved';
    if (filter === 'rejected') return req.status === 'Rejected';
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      'Pending': { class: 'warning', icon: <HourglassEmptyIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> },
      'Approved': { class: 'success', icon: <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> },
      'Rejected': { class: 'danger', icon: <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> }
    };
    const badge = badges[status] || badges['Pending'];
    return <span className={`status-badge ${badge.class}`}>{badge.icon} {status}</span>;
  };

  const getLeaveTypeIcon = (type) => {
    const icons = {
      'Vacation': <BeachAccessIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Sick': <SickIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Emergency': <WarningIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Maternity': <ChildCareIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Paternity': <ManIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />,
      'Others': <MoreHorizIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
    };
    return icons[type] || <MoreHorizIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />;
  };

  return (
    <div className="leave-management">

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <CalendarTodayIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Leave Management
          </h2>
          <p className="header-subtitle">Manage and track employee leave requests</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="btn-add-modern"
        >
          <AddIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
          New Leave Request
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon">
            <AssignmentIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Requests</h3>
            <p>{leaveRequests.length}</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <HourglassEmptyIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Pending</h3>
            <p>{leaveRequests.filter(r => r.status === 'Pending').length}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Approved</h3>
            <p>{leaveRequests.filter(r => r.status === 'Approved').length}</p>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">
            <CancelIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Rejected</h3>
            <p>{leaveRequests.filter(r => r.status === 'Rejected').length}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="search-filter-bar">
        <div className="filter-group">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">
              <AssignmentIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              All Requests
            </option>
            <option value="pending">
              <HourglassEmptyIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Pending
            </option>
            <option value="approved">
              <CheckCircleIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Approved
            </option>
            <option value="rejected">
              <CancelIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Rejected
            </option>
          </select>
        </div>
        <div className="stats-badge">
          <span>{filteredRequests.length} requests</span>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="table-container">
        <table className="leave-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Leave Type</th>
              <th>Date Range</th>
              <th>Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(req => (
              <tr key={req.id}>
                <td>
                  <div className="employee-info">
                    <div className="employee-avatar small">
                      {getEmployeeName(req.employeeId).charAt(0)}
                    </div>
                    <span className="employee-name">{getEmployeeName(req.employeeId)}</span>
                  </div>
                </td>
                <td><span className="dept-tag">{getEmployeeDepartment(req.employeeId)}</span></td>
                <td>
                  <span className="leave-type">
                    {getLeaveTypeIcon(req.type)} {req.type}
                  </span>
                </td>
                <td>
                  <div className="date-range">
                    <span>{req.startDate}</span>
                    <span className="arrow">→</span>
                    <span>{req.endDate}</span>
                  </div>
                </td>
                <td><span className="days-badge">{req.days} day{req.days > 1 ? 's' : ''}</span></td>
                <td>{getStatusBadge(req.status)}</td>
                <td>
                  {req.status === 'Pending' && (
                    <div className="action-group">
                      <button 
                        onClick={() => updateStatus(req.id, 'Approved')} 
                        className="btn-action approve"
                      >
                        <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Approve
                      </button>
                      <button 
                        onClick={() => updateStatus(req.id, 'Rejected')} 
                        className="btn-action reject"
                      >
                        <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                        Reject
                      </button>
                    </div>
                  )}
                  {req.status !== 'Pending' && (
                    <span className="no-action">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-state">
                  <InboxIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No leave requests found</p>
                  <span>Click "New Leave Request" to get started</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-form leave-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <EventNoteIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
                New Leave Request
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setShowForm(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitLeave(); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <PersonIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Employee *
                  </label>
                  <select 
                    value={formData.employeeId} 
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    required
                  >
                    <option value="">— Select Employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <EventNoteIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Leave Type *
                  </label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="Vacation">
                      <BeachAccessIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Vacation
                    </option>
                    <option value="Sick">
                      <SickIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Sick
                    </option>
                    <option value="Emergency">
                      <WarningIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Emergency
                    </option>
                    <option value="Maternity">
                      <ChildCareIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Maternity
                    </option>
                    <option value="Paternity">
                      <ManIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Paternity
                    </option>
                    <option value="Others">
                      <MoreHorizIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                      Others
                    </option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <EventNoteIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Start Date *
                  </label>
                  <input 
                    type="date" 
                    value={formData.startDate} 
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <EventNoteIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    End Date *
                  </label>
                  <input 
                    type="date" 
                    value={formData.endDate} 
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>
                    <DescriptionIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Reason
                  </label>
                  <textarea 
                    placeholder="Enter reason for leave (optional)"
                    value={formData.reason} 
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    rows="3"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save" disabled={loading}>
                  <SaveIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowForm(false)}
                >
                  <CancelIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveManagement;