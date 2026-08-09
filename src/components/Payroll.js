// src/components/Payroll.js - Enhanced Version
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';

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
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import PaidIcon from '@mui/icons-material/Paid';
import PendingIcon from '@mui/icons-material/Pending';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PrintIcon from '@mui/icons-material/Print';
import CancelIcon from '@mui/icons-material/Cancel';

function Payroll({ refreshTrigger, onPayrollProcessed }) {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({ 
    totalPayroll: 0, 
    avgSalary: 0, 
    departmentBreakdown: [],
    totalDeductions: 0,
    totalEmployees: 0,
    totalLateDeductions: 0,
    totalLateDays: 0,
    paidCount: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [processMessage, setProcessMessage] = useState('');
  const [processSuccess, setProcessSuccess] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const LATE_DEDUCTION_RATE = 500;

  // Real-time listener for payroll changes
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'payroll'), () => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching payroll data...');
      
      const empSnapshot = await getDocs(collection(db, 'employees'));
      const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empList);

      const deptList = [...new Set(empList.map(emp => emp.department || emp.dept).filter(Boolean))];
      setDepartments(deptList);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
      const allAttendance = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const monthAttendance = allAttendance.filter(record => {
        return record.date >= startDate && record.date <= endDate;
      });
      setAttendanceRecords(monthAttendance);

      const payrollSnapshot = await getDocs(collection(db, 'payroll'));
      const payrollList = payrollSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const lateDaysMap = {};
      monthAttendance.forEach(record => {
        if (record.status === 'Late' || record.status === 'late') {
          lateDaysMap[record.employeeId] = (lateDaysMap[record.employeeId] || 0) + 1;
        }
      });

      const updatedPayroll = payrollList.map(record => {
        const lateDays = lateDaysMap[record.employeeId] || 0;
        const lateDeduction = lateDays * LATE_DEDUCTION_RATE;
        const originalDeductions = record.deductions || record.otherDeductions || 0;
        const totalDeductions = originalDeductions + lateDeduction;
        const netPay = (record.basicSalary || 0) - totalDeductions;

        return {
          ...record,
          lateDays: lateDays,
          lateDeduction: lateDeduction,
          originalDeductions: originalDeductions,
          totalDeductions: totalDeductions,
          netPay: netPay,
          hasLate: lateDays > 0
        };
      });

      setPayrollRecords(updatedPayroll);
      calculateSummary(updatedPayroll, empList, lateDaysMap);

    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (records, empList, lateDaysMap) => {
    const totalPayroll = records.reduce((sum, record) => sum + (record.netPay || 0), 0);
    const totalDeductions = records.reduce((sum, record) => sum + (record.totalDeductions || 0), 0);
    const totalLateDeductions = records.reduce((sum, record) => sum + (record.lateDeduction || 0), 0);
    const totalLateDays = Object.values(lateDaysMap || {}).reduce((sum, val) => sum + val, 0);
    const avgSalary = records.length > 0 ? totalPayroll / records.length : 0;
    const paidCount = records.filter(r => r.status === 'Paid').length;
    const pendingCount = records.filter(r => r.status === 'Pending' || !r.status).length;
    
    const deptMap = {};
    records.forEach(record => {
      const emp = empList.find(e => e.id === record.employeeId);
      const dept = emp?.department || emp?.dept || 'Unknown';
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
      totalEmployees: empList.length,
      totalLateDeductions,
      totalLateDays,
      paidCount,
      pendingCount
    });
  };

  // ====== UPDATE PAYROLL STATUS ======
  const updatePayrollStatus = async (payrollId, newStatus) => {
    if (!window.confirm(`Mark this payroll as "${newStatus}"?`)) return;
    
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'payroll', payrollId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...(newStatus === 'Paid' ? { paidAt: new Date().toISOString() } : {})
      });

      // Get the payroll record for notification
      const payrollRecord = payrollRecords.find(r => r.id === payrollId);
      
      // Notify employee
      if (payrollRecord) {
        await addDoc(collection(db, 'notifications'), {
          employeeId: payrollRecord.employeeId,
          employeeName: payrollRecord.employeeName,
          type: 'payroll_status_update',
          message: `Your payroll for ${payrollRecord.periodMonth} ${payrollRecord.periodYear} has been marked as ${newStatus}`,
          read: false,
          forEmployee: true,
          forAdmin: false,
          createdAt: new Date().toISOString()
        });
      }

      setProcessMessage(`✅ Payroll status updated to ${newStatus}`);
      setProcessSuccess(true);
      
      setTimeout(() => {
        setProcessMessage('');
        setProcessSuccess(false);
      }, 5000);
      
      await fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      setProcessMessage('❌ Error updating status: ' + error.message);
      setProcessSuccess(false);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ====== UPDATE ALL PENDING TO PAID ======
  const markAllAsPaid = async () => {
    const pendingRecords = payrollRecords.filter(r => r.status === 'Pending' || !r.status);
    if (pendingRecords.length === 0) {
      alert('No pending payroll records to mark as paid.');
      return;
    }
    
    if (!window.confirm(`Mark ${pendingRecords.length} payroll records as "Paid"?`)) return;
    
    setUpdatingStatus(true);
    try {
      let updatedCount = 0;
      for (const record of pendingRecords) {
        await updateDoc(doc(db, 'payroll', record.id), {
          status: 'Paid',
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Notify each employee
        await addDoc(collection(db, 'notifications'), {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          type: 'payroll_status_update',
          message: `Your payroll for ${record.periodMonth} ${record.periodYear} has been marked as Paid`,
          read: false,
          forEmployee: true,
          forAdmin: false,
          createdAt: new Date().toISOString()
        });
        
        updatedCount++;
      }
      
      setProcessMessage(`✅ Successfully marked ${updatedCount} payroll records as Paid`);
      setProcessSuccess(true);
      
      setTimeout(() => {
        setProcessMessage('');
        setProcessSuccess(false);
      }, 5000);
      
      await fetchData();
    } catch (error) {
      console.error('Error marking all as paid:', error);
      setProcessMessage('❌ Error: ' + error.message);
      setProcessSuccess(false);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ====== PROCESS PAYROLL FUNCTION ======
  const processPayrollWithLateDeductions = async () => {
    setProcessingPayroll(true);
    setProcessMessage('⏳ Processing payroll...');
    setProcessSuccess(false);
    
    try {
      console.log('🔄 Starting payroll processing...');
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const empSnapshot = await getDocs(collection(db, 'employees'));
      const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (empList.length === 0) {
        setProcessMessage('⚠️ No employees found. Please add employees first.');
        setProcessingPayroll(false);
        return;
      }

      const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
      const allAttendance = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const monthAttendance = allAttendance.filter(record => {
        return record.date >= startDate && record.date <= endDate;
      });

      const lateDaysMap = {};
      monthAttendance.forEach(record => {
        if (record.status === 'Late' || record.status === 'late') {
          lateDaysMap[record.employeeId] = (lateDaysMap[record.employeeId] || 0) + 1;
        }
      });

      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (const emp of empList) {
        try {
          const lateDays = lateDaysMap[emp.id] || 0;
          const lateDeduction = lateDays * LATE_DEDUCTION_RATE;
          const basicSalary = parseFloat(emp.salary || emp.basicSalary || emp.baseSalary || 0) || 0;
          const totalDeductions = lateDeduction;
          const netPay = basicSalary - totalDeductions;
          const employeeName = emp.fullName || emp.name || emp.employeeName || 'Unknown';

          const payrollData = {
            employeeId: emp.id,
            employeeName: employeeName,
            department: emp.department || emp.dept || 'Unknown',
            periodStart: startDate,
            periodEnd: endDate,
            periodMonth: monthName,
            periodYear: currentYear,
            basicSalary: basicSalary,
            deductions: totalDeductions,
            lateDays: lateDays,
            lateDeduction: lateDeduction,
            originalDeductions: 0,
            totalDeductions: totalDeductions,
            netPay: netPay,
            status: 'Pending', // Default status
            hasLate: lateDays > 0,
            processedAt: new Date().toISOString()
          };

          const existingQuery = query(
            collection(db, 'payroll'),
            where('employeeId', '==', emp.id),
            where('periodStart', '==', startDate),
            where('periodEnd', '==', endDate)
          );
          const existingSnapshot = await getDocs(existingQuery);

          if (!existingSnapshot.empty) {
            const docId = existingSnapshot.docs[0].id;
            await updateDoc(doc(db, 'payroll', docId), payrollData);
            updatedCount++;
          } else {
            await addDoc(collection(db, 'payroll'), payrollData);
            createdCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing payroll for employee ${emp.id}:`, error);
          errorCount++;
        }
      }

      const totalLateDays = Object.values(lateDaysMap).reduce((sum, val) => sum + val, 0);
      const totalLateDeductions = totalLateDays * LATE_DEDUCTION_RATE;
      
      const successMessage = 
        `✅ Payroll processed successfully!\n` +
        `📝 Created: ${createdCount}, Updated: ${updatedCount}\n` +
        `📊 Total late days: ${totalLateDays}\n` +
        `💰 Total late deductions: ₱${totalLateDeductions.toLocaleString()}\n` +
        `📌 Status set to: Pending (Ready for review)`;
      
      setProcessMessage(successMessage);
      setProcessSuccess(true);
      
      await fetchData();
      
      if (onPayrollProcessed) {
        onPayrollProcessed();
      }
      
      setTimeout(() => {
        setProcessMessage('');
        setProcessSuccess(false);
      }, 10000);

    } catch (error) {
      console.error('❌ Error processing payroll:', error);
      setProcessMessage('❌ Error processing payroll: ' + error.message);
      setProcessSuccess(false);
    } finally {
      setProcessingPayroll(false);
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? (emp.fullName || emp.name || emp.employeeName || 'Unknown') : 'Unknown';
  };

  const getEmployeeDepartment = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? (emp.department || emp.dept || 'Unknown') : 'Unknown';
  };

  const getStatusBadge = (record) => {
    const status = record.status || 'Pending';
    
    if (status === 'Paid') {
      return (
        <span className="status-badge success">
          <CheckCircleIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
          Paid
        </span>
      );
    }
    if (status === 'Processing') {
      return (
        <span className="status-badge info">
          <HourglassEmptyIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
          Processing
        </span>
      );
    }
    if (status === 'Cancelled') {
      return (
        <span className="status-badge danger">
          <CancelIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
          Cancelled
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

  const filteredRecords = payrollRecords.filter(record => {
    const deptMatch = filterDepartment === 'all' || getEmployeeDepartment(record.employeeId) === filterDepartment;
    const statusMatch = filterStatus === 'all' || (record.status || 'Pending') === filterStatus;
    return deptMatch && statusMatch;
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
          <p className="header-subtitle">Track and manage employee salary records with late deductions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="stats-badge">
            <CalendarTodayIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          
          {/* Mark All as Paid Button */}
          {summary.pendingCount > 0 && (
            <button 
              onClick={markAllAsPaid}
              disabled={updatingStatus}
              className="btn-mark-all-paid"
              style={{
                padding: '8px 16px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: updatingStatus ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: updatingStatus ? 0.7 : 1
              }}
            >
              <PaidIcon style={{ fontSize: 18 }} />
              {updatingStatus ? 'Updating...' : `Mark All (${summary.pendingCount}) as Paid`}
            </button>
          )}
          
          <button 
            onClick={processPayrollWithLateDeductions}
            disabled={processingPayroll}
            className="btn-process-payroll"
            style={{
              padding: '8px 16px',
              background: processingPayroll ? '#95a5a6' : '#4a6fa5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: processingPayroll ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: processingPayroll ? 0.7 : 1
            }}
          >
            <AccessTimeIcon style={{ fontSize: 18 }} />
            {processingPayroll ? 'Processing...' : 'Process Payroll'}
          </button>
        </div>
      </div>

      {/* Process Message */}
      {processMessage && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: processSuccess ? '#e4f5e9' : 
                     processMessage.includes('⚠️') ? '#fef0e0' : '#fde8e8',
          color: processSuccess ? '#27ae60' : 
                 processMessage.includes('⚠️') ? '#e67e22' : '#e74c3c',
          border: `1px solid ${processSuccess ? '#b8e6c9' : 
                   processMessage.includes('⚠️') ? '#fce8b3' : '#fcc'}`,
          fontWeight: '500',
          whiteSpace: 'pre-line'
        }}>
          {processMessage}
        </div>
      )}

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
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Paid</h3>
            <p>{summary.paidCount}</p>
            <small>employees</small>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <HourglassEmptyIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Pending</h3>
            <p>{summary.pendingCount}</p>
            <small>employees</small>
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
        <div className="filter-group">
          <ReceiptIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Processing">Processing</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="stats-badge">
          <span>{filteredRecords.length} payroll records</span>
        </div>
      </div>

      {/* Department Breakdown */}
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
              <th>Late Days</th>
              <th>Late Deduction</th>
              <th>Total Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map(record => (
                <tr key={record.id} className={record.hasLate ? 'has-late' : ''}>
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
                  <td className="amount-cell">
                    {record.lateDays > 0 ? (
                      <span style={{ color: '#e67e22', fontWeight: '600' }}>{record.lateDays} days</span>
                    ) : (
                      <span style={{ color: '#27ae60' }}>0</span>
                    )}
                  </td>
                  <td className="deduction-cell">
                    {record.lateDeduction > 0 ? (
                      <span style={{ color: '#e74c3c' }}>₱{record.lateDeduction?.toLocaleString() || '0'}</span>
                    ) : (
                      '₱0'
                    )}
                  </td>
                  <td className="deduction-cell">
                    {record.totalDeductions > 0 ? (
                      <span style={{ color: '#e74c3c', fontWeight: '600' }}>₱{record.totalDeductions?.toLocaleString() || '0'}</span>
                    ) : (
                      '₱0'
                    )}
                  </td>
                  <td className="net-pay-cell">
                    {record.hasLate ? (
                      <span style={{ color: '#e67e22', fontWeight: '700' }}>₱{record.netPay?.toLocaleString() || '0'}</span>
                    ) : (
                      <span style={{ color: '#27ae60', fontWeight: '700' }}>₱{record.netPay?.toLocaleString() || '0'}</span>
                    )}
                  </td>
                  <td>{getStatusBadge(record)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {/* Status Update Buttons */}
                      {(record.status === 'Pending' || !record.status) && (
                        <button
                          onClick={() => updatePayrollStatus(record.id, 'Paid')}
                          disabled={updatingStatus}
                          style={{
                            padding: '4px 10px',
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: updatingStatus ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <PaidIcon style={{ fontSize: 14 }} />
                          Mark Paid
                        </button>
                      )}
                      {record.status === 'Paid' && (
                        <button
                          onClick={() => updatePayrollStatus(record.id, 'Pending')}
                          disabled={updatingStatus}
                          style={{
                            padding: '4px 10px',
                            background: '#e67e22',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: updatingStatus ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <PendingIcon style={{ fontSize: 14 }} />
                          Revert
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="empty-state">
                  <InboxIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No payroll records found</p>
                  <span>Click "Process Payroll" to generate records with late deductions</span>
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