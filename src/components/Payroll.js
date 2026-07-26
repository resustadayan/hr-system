// src/components/Payroll.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Material-UI Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InboxIcon from '@mui/icons-material/Inbox';

function Payroll({ refreshTrigger }) {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({ 
    totalPayroll: 0, 
    avgSalary: 0, 
    departmentBreakdown: [],
    totalDeductions: 0,
    totalEmployees: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empSnapshot = await getDocs(collection(db, 'employees'));
      const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empList);

      const deptList = [...new Set(empList.map(emp => emp.department).filter(Boolean))];
      setDepartments(deptList);

      const payrollSnapshot = await getDocs(collection(db, 'payroll'));
      const payrollList = payrollSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayrollRecords(payrollList);
      calculateSummary(payrollList, empList);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh when triggered by EmployeeRecords
  useEffect(() => {
    if (refreshTrigger) {
      fetchData();
    }
  }, [refreshTrigger]);

  const calculateSummary = (records, empList) => {
    const totalPayroll = records.reduce((sum, record) => sum + (record.netPay || 0), 0);
    const totalDeductions = records.reduce((sum, record) => sum + (record.deductions || 0), 0);
    const avgSalary = records.length > 0 ? totalPayroll / records.length : 0;
    
    const deptMap = {};
    records.forEach(record => {
      const emp = empList.find(e => e.id === record.employeeId);
      const dept = emp?.department || 'Unknown';
      deptMap[dept] = (deptMap[dept] || 0) + (record.netPay || 0);
    });
    
    const departmentBreakdown = Object.entries(deptMap)
      .map(([dept, amount]) => ({ dept, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    setSummary({ 
      totalPayroll, 
      avgSalary, 
      departmentBreakdown,
      totalDeductions,
      totalEmployees: empList.length
    });
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.fullName : 'Unknown';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.department : 'Unknown';
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') {
      return (
        <span className="status-badge success">
          <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
          Paid
        </span>
      );
    }
    return (
      <span className="status-badge warning">
        <HourglassEmptyIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
        Pending
      </span>
    );
  };

  const filteredRecords = filterDepartment === 'all' 
    ? payrollRecords 
    : payrollRecords.filter(record => {
        const dept = getEmployeeDepartment(record.employeeId);
        return dept === filterDepartment;
      });

  if (loading) {
    return <div className="loading">Loading payroll data...</div>;
  }

  return (
    <div className="payroll-container">

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <AttachMoneyIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Payroll Monitoring
          </h2>
          <p className="header-subtitle">Track and manage employee salary records</p>
        </div>
        <div className="stats-badge">
          <CalendarTodayIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon">
            <AttachMoneyIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Payroll</h3>
            <p>₱{summary.totalPayroll.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">
            <BarChartIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Average Salary</h3>
            <p>₱{summary.avgSalary.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">
            <TrendingDownIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Deductions</h3>
            <p>₱{summary.totalDeductions.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <PeopleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Employees</h3>
            <p>{summary.totalEmployees}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="search-filter-bar">
        <div className="filter-group">
          <BusinessIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="stats-badge">
          <span>{filteredRecords.length} payroll records</span>
        </div>
      </div>

      {/* Department Breakdown Chart */}
      {summary.departmentBreakdown.length > 0 && (
        <div className="chart-section-modern">
          <h3>
            <BarChartIcon style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
            Payroll by Department
          </h3>
          <div className="dept-breakdown-modern">
            {summary.departmentBreakdown.map((dept, index) => {
              const percentage = summary.totalPayroll > 0 
                ? (dept.amount / summary.totalPayroll) * 100 
                : 0;
              const colors = ['#4a6fa5', '#27ae60', '#e67e22', '#7c3aed', '#e74c3c', '#1abc9c', '#f39c12', '#3498db'];
              const color = colors[index % colors.length];
              
              return (
                <div key={dept.dept} className="dept-row-modern">
                  <div className="dept-header">
                    <span className="dept-name">{dept.dept}</span>
                    <span className="dept-percentage">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="dept-bar-modern">
                    <div 
                      className="dept-fill-modern" 
                      style={{ 
                        width: `${Math.max(percentage, 2)}%`,
                        background: color
                      }}
                    >
                      <span>₱{dept.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payroll Records Table */}
      <div className="table-container">
        <table className="payroll-table-modern">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Period</th>
              <th>Basic Salary</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map(record => (
              <tr key={record.id}>
                <td>
                  <div className="employee-info">
                    <div className="employee-avatar small">
                      {getEmployeeName(record.employeeId).charAt(0)}
                    </div>
                    <span className="employee-name">{getEmployeeName(record.employeeId)}</span>
                  </div>
                </td>
                <td><span className="dept-tag">{getEmployeeDepartment(record.employeeId)}</span></td>
                <td>
                  <div className="period-cell">
                    <span>{record.periodStart}</span>
                    <span className="arrow">→</span>
                    <span>{record.periodEnd}</span>
                  </div>
                </td>
                <td className="amount-cell">₱{record.basicSalary?.toLocaleString() || '0'}</td>
                <td className="deduction-cell">₱{record.deductions?.toLocaleString() || '0'}</td>
                <td className="net-pay-cell">₱{record.netPay?.toLocaleString() || '0'}</td>
                <td>{getStatusBadge(record.status)}</td>
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-state">
                  <InboxIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No payroll records found</p>
                  <span>No records available for the selected filters</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Payroll;