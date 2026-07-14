// src/components/Attendance.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';

// Material-UI Icons
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import WarningIcon from '@mui/icons-material/Warning';
import InboxIcon from '@mui/icons-material/Inbox';

function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchAttendanceRecords();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [attendanceRecords, employees, filterDate]);

  const fetchEmployees = async () => {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEmployees(empList);
  };

  const fetchAttendanceRecords = async () => {
    const querySnapshot = await getDocs(collection(db, 'attendance'));
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAttendanceRecords(records);
  };

  const recordAttendance = async () => {
    if (!selectedEmployee || !date || !timeIn) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        employeeId: selectedEmployee,
        date: date,
        timeIn: timeIn,
        timeOut: timeOut || null,
        status: calculateStatus(timeIn),
        recordedAt: new Date().toISOString()
      });
      
      alert('✅ Attendance recorded successfully');
      setSelectedEmployee('');
      setTimeIn('');
      setTimeOut('');
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Error recording attendance:', error);
      alert('❌ Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (timeInValue) => {
    const threshold = '08:00';
    return timeInValue <= threshold ? 'Present' : 'Late';
  };

  const calculateSummary = () => {
    const filteredRecords = attendanceRecords.filter(record => record.date === filterDate);
    const presentCount = filteredRecords.filter(r => r.status === 'Present').length;
    const lateCount = filteredRecords.filter(r => r.status === 'Late').length;
    const absentCount = employees.length - filteredRecords.length;
    
    setSummary({
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      total: employees.length
    });
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName : 'Unknown';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.department : 'N/A';
  };

  const filteredRecords = attendanceRecords.filter(record => record.date === filterDate);

  return (
    <div className="attendance-container">

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <AccessTimeIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Attendance Tracking
          </h2>
          <p className="header-subtitle">Monitor and record daily employee attendance</p>
        </div>
        <div className="date-display">
          <span className="date-badge">
            <CalendarTodayIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
            {new Date(filterDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card present">
          <div className="stat-icon">
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Present</h3>
            <p>{summary.present}</p>
          </div>
        </div>
        <div className="stat-card late">
          <div className="stat-icon">
            <WarningIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Late</h3>
            <p>{summary.late}</p>
          </div>
        </div>
        <div className="stat-card absent">
          <div className="stat-icon">
            <CancelIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Absent</h3>
            <p>{summary.absent}</p>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">
            <PeopleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Employees</h3>
            <p>{summary.total}</p>
          </div>
        </div>
      </div>

      {/* Record Attendance Form */}
      <div className="form-card-modern">
        <h3>
          <AddIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
          Record Attendance
        </h3>
        <div className="form-grid-inline">
          <div className="form-group">
            <label>
              <PersonIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Select Employee
            </label>
            <select 
              value={selectedEmployee} 
              onChange={(e) => setSelectedEmployee(e.target.value)}
              required
            >
              <option value="">— Select Employee —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName} - {emp.department}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>
              <CalendarTodayIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Date
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>
              <AccessTimeIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Time In
            </label>
            <input 
              type="time" 
              value={timeIn} 
              onChange={(e) => setTimeIn(e.target.value)}
              placeholder="Time In"
              required
            />
          </div>
          
          <div className="form-group">
            <label>
              <AccessTimeIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
              Time Out (Optional)
            </label>
            <input 
              type="time" 
              value={timeOut} 
              onChange={(e) => setTimeOut(e.target.value)}
              placeholder="Time Out"
            />
          </div>
          
          <div className="form-group btn-group">
            <button 
              onClick={recordAttendance} 
              className="btn-record"
              disabled={loading}
            >
              <SaveIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
              {loading ? 'Recording...' : 'Record Attendance'}
            </button>
          </div>
        </div>
      </div>

      {/* View Attendance Records */}
      <div className="form-card-modern">
        <div className="filter-header">
          <h3>
            <EventNoteIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
            View Attendance Records
          </h3>
          <div className="filter-controls">
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-date"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="attendance-table-modern">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record.id} className={record.status === 'Late' ? 'late-row' : ''}>
                  <td>
                    <div className="employee-info">
                      <div className="employee-avatar small">
                        {getEmployeeName(record.employeeId).charAt(0)}
                      </div>
                      <span className="employee-name">{getEmployeeName(record.employeeId)}</span>
                    </div>
                  </td>
                  <td><span className="dept-tag">{getEmployeeDepartment(record.employeeId)}</span></td>
                  <td>{record.date}</td>
                  <td className="time-cell">{record.timeIn}</td>
                  <td className="time-cell">{record.timeOut || '—'}</td>
                  <td>
                    <span className={`status-badge ${record.status === 'Present' ? 'success' : 'warning'}`}>
                      {record.status === 'Present' ? (
                        <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                      ) : (
                        <WarningIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                      )}
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <InboxIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                    <p>No attendance records found</p>
                    <span>No records for {new Date(filterDate).toLocaleDateString()}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Attendance;