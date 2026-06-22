import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';

function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });

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

    try {
      await addDoc(collection(db, 'attendance'), {
        employeeId: selectedEmployee,
        date: date,
        timeIn: timeIn,
        timeOut: timeOut || null,
        status: calculateStatus(timeIn),
        recordedAt: new Date().toISOString()
      });
      
      alert('Attendance recorded successfully');
      setSelectedEmployee('');
      setTimeIn('');
      setTimeOut('');
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error recording attendance:', error);
      alert('Failed to record attendance');
    }
  };

  const calculateStatus = (timeInValue) => {
    // Consider 8:00 AM as on-time threshold
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

  const filteredRecords = attendanceRecords.filter(record => record.date === filterDate);

  return (
    <div className="attendance-container">
      <h2>Attendance Tracking</h2>
      
      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card present">
          <h3>Present</h3>
          <p>{summary.present}</p>
        </div>
        <div className="stat-card late">
          <h3>Late</h3>
          <p>{summary.late}</p>
        </div>
        <div className="stat-card absent">
          <h3>Absent</h3>
          <p>{summary.absent}</p>
        </div>
        <div className="stat-card total">
          <h3>Total Employees</h3>
          <p>{summary.total}</p>
        </div>
      </div>

      {/* Record Attendance Form */}
      <div className="form-card">
        <h3>Record Attendance</h3>
        <div className="form-group">
          <select 
            value={selectedEmployee} 
            onChange={(e) => setSelectedEmployee(e.target.value)}
            required
          >
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.fullName} - {emp.department}</option>
            ))}
          </select>
          
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            required
          />
          
          <input 
            type="time" 
            value={timeIn} 
            onChange={(e) => setTimeIn(e.target.value)}
            placeholder="Time In"
            required
          />
          
          <input 
            type="time" 
            value={timeOut} 
            onChange={(e) => setTimeOut(e.target.value)}
            placeholder="Time Out (Optional)"
          />
          
          <button onClick={recordAttendance}>Record Attendance</button>
        </div>
      </div>

      {/* Filter and View Attendance */}
      <div className="form-card">
        <h3>View Attendance Records</h3>
        <div className="form-group">
          <input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {/* Attendance Records Table */}
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Employee Name</th>
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
              <td>{getEmployeeName(record.employeeId)}</td>
              <td>{employees.find(e => e.id === record.employeeId)?.department || 'N/A'}</td>
              <td>{record.date}</td>
              <td>{record.timeIn}</td>
              <td>{record.timeOut || '—'}</td>
              <td>
                <span className={`badge ${record.status === 'Present' ? 'success' : 'warning'}`}>
                  {record.status}
                </span>
              </td>
            </tr>
          ))}
          {filteredRecords.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No attendance records found for this date</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Attendance;