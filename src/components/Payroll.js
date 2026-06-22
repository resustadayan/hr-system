import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

function Payroll() {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [summary, setSummary] = useState({ totalPayroll: 0, avgSalary: 0, departmentBreakdown: [] });

  useEffect(() => {
    fetchEmployees();
    fetchPayrollRecords();
  }, []);

  const fetchEmployees = async () => {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEmployees(empList);
  };

  const fetchPayrollRecords = async () => {
    const querySnapshot = await getDocs(collection(db, 'payroll'));
    const payrollList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPayrollRecords(payrollList);
    calculateSummary(payrollList);
  };

  const calculateSummary = (records) => {
    const totalPayroll = records.reduce((sum, record) => sum + (record.netPay || 0), 0);
    const avgSalary = records.length > 0 ? totalPayroll / records.length : 0;
    
    const deptMap = {};
    records.forEach(record => {
      const emp = employees.find(e => e.id === record.employeeId);
      const dept = emp?.department || 'Unknown';
      deptMap[dept] = (deptMap[dept] || 0) + (record.netPay || 0);
    });
    
    const departmentBreakdown = Object.entries(deptMap).map(([dept, amount]) => ({ dept, amount }));
    
    setSummary({ totalPayroll, avgSalary, departmentBreakdown });
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName : 'Unknown';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.department : 'Unknown';
  };

  return (
    <div className="payroll-container">
      <h2>Payroll Monitoring</h2>
      
      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Payroll</h3>
          <p>₱{summary.totalPayroll.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Average Salary</h3>
          <p>₱{summary.avgSalary.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Total Employees</h3>
          <p>{employees.length}</p>
        </div>
      </div>

      {/* Department Breakdown Chart */}
      <div className="chart-section">
        <h3>Payroll by Department</h3>
        <div className="dept-breakdown">
          {summary.departmentBreakdown.map(dept => (
            <div key={dept.dept} className="dept-row">
              <span className="dept-name">{dept.dept}</span>
              <div className="dept-bar">
                <div 
                  className="dept-fill" 
                  style={{ width: `${(dept.amount / summary.totalPayroll) * 100}%` }}
                ></div>
              </div>
              <span className="dept-amount">₱{dept.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payroll Records Table */}
      <table className="payroll-table">
        <thead>
          <tr>
            <th>Employee Name</th>
            <th>Department</th>
            <th>Period</th>
            <th>Basic Salary</th>
            <th>Deductions</th>
            <th>Net Pay</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {payrollRecords.map(record => (
            <tr key={record.id}>
              <td>{getEmployeeName(record.employeeId)}</td>
              <td>{getEmployeeDepartment(record.employeeId)}</td>
              <td>{record.periodStart} to {record.periodEnd}</td>
              <td>₱{record.basicSalary?.toLocaleString()}</td>
              <td>₱{record.deductions?.toLocaleString()}</td>
              <td className="net-pay">₱{record.netPay?.toLocaleString()}</td>
              <td>
                <span className={`status ${record.status === 'Paid' ? 'paid' : 'pending'}`}>
                  {record.status || 'Pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Payroll;