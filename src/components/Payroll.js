// src/components/Payroll.js - Fixed Table Display
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';

// Material-UI Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InboxIcon from '@mui/icons-material/Inbox';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaidIcon from '@mui/icons-material/Paid';
import PendingIcon from '@mui/icons-material/Pending';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CancelIcon from '@mui/icons-material/Cancel';
import WorkIcon from '@mui/icons-material/Work';
import StarsIcon from '@mui/icons-material/Stars';

// ====== CONFIGURATION ======
const MONETARY_DEDUCTION_RATE = 1.50;
const LEAVE_DEDUCTION_RATE = 0.5;
const LEAVE_CREDIT_POSITIONS = ['Casual', 'Regular', 'Permanent', 'Probationary'];
const MONETARY_DEDUCTION_POSITIONS = ['Job Order', 'JO', 'Contractual'];
const OFFICE_START_TIME = '07:00';

function Payroll({ refreshTrigger, onPayrollProcessed }) {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPosition, setFilterPosition] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState({ 
    totalPayroll: 0, 
    avgSalary: 0, 
    departmentBreakdown: [],
    totalDeductions: 0,
    totalEmployees: 0,
    totalLateDeductions: 0,
    totalLateDays: 0,
    paidCount: 0,
    pendingCount: 0,
    totalLeaveCreditsUsed: 0,
    totalMonetaryDeductions: 0,
    fullyCompliantCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [processMessage, setProcessMessage] = useState('');
  const [processSuccess, setProcessSuccess] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [complianceData, setComplianceData] = useState({});

  // ====== HELPER FUNCTIONS ======
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const isLate = (timeInStr) => {
    if (!timeInStr) return false;
    const timeInMinutes = timeToMinutes(timeInStr);
    const thresholdMinutes = timeToMinutes(OFFICE_START_TIME);
    return timeInMinutes > thresholdMinutes;
  };

  // ====== FETCH COMPLIANCE DATA ======
  const fetchComplianceData = async () => {
    try {
      const docSnapshot = await getDocs(collection(db, 'documents'));
      const allDocs = docSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const complianceMap = {};
      allDocs.forEach(doc => {
        if (!complianceMap[doc.employeeId]) {
          complianceMap[doc.employeeId] = { total: 0, complete: 0, pending: 0 };
        }
        complianceMap[doc.employeeId].total++;
        if (doc.status === 'Complete') {
          complianceMap[doc.employeeId].complete++;
        } else if (doc.status === 'Pending Review') {
          complianceMap[doc.employeeId].pending++;
        }
      });
      
      Object.keys(complianceMap).forEach(empId => {
        const data = complianceMap[empId];
        data.percentage = data.total > 0 ? Math.round((data.complete / data.total) * 100) : 0;
        data.isFullyCompliant = data.percentage === 100 && data.total > 0;
      });
      
      setComplianceData(complianceMap);
      
      const fullyCompliant = Object.values(complianceMap).filter(d => d.isFullyCompliant).length;
      setSummary(prev => ({ ...prev, fullyCompliantCount: fullyCompliant }));
      
      return complianceMap;
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      return {};
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'documents'), async () => {
      await fetchComplianceData();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'payroll'), () => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empSnapshot = await getDocs(collection(db, 'employees'));
      const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empList);

      const deptList = [...new Set(empList.map(emp => emp.department || emp.dept).filter(Boolean))];
      setDepartments(deptList);

      const posList = [...new Set(empList.map(emp => emp.position || emp.employmentType || 'Unknown').filter(Boolean))];
      setPositions(posList);

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
        if (isLate(record.timeIn)) {
          lateDaysMap[record.employeeId] = (lateDaysMap[record.employeeId] || 0) + 1;
        }
      });

      const leaveBalancesSnapshot = await getDocs(collection(db, 'leaveBalances'));
      const leaveBalancesMap = {};
      leaveBalancesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.employeeId) {
          leaveBalancesMap[data.employeeId] = {
            id: doc.id,
            ...data
          };
        }
      });

      await fetchComplianceData();

      const updatedPayroll = payrollList.map(record => {
        const emp = empList.find(e => e.id === record.employeeId);
        const position = emp?.position || emp?.employmentType || 'Unknown';
        const lateDays = lateDaysMap[record.employeeId] || 0;
        const compliance = complianceData[record.employeeId] || { isFullyCompliant: false, percentage: 0 };
        
        const usesLeaveCredits = LEAVE_CREDIT_POSITIONS.includes(position);
        const usesMonetaryDeduction = MONETARY_DEDUCTION_POSITIONS.includes(position);
        
        let lateDeduction = 0;
        let leaveCreditsUsed = 0;
        let monetaryDeduction = 0;
        let deductionType = 'none';
        
        if (usesLeaveCredits && lateDays > 0) {
          leaveCreditsUsed = lateDays * LEAVE_DEDUCTION_RATE;
          deductionType = 'leave';
          const monthlySalary = record.basicSalary || 0;
          const dailyRate = monthlySalary / 30;
          const monetaryEquivalent = leaveCreditsUsed * dailyRate;
          lateDeduction = monetaryEquivalent;
        } else if (usesMonetaryDeduction && lateDays > 0) {
          monetaryDeduction = lateDays * MONETARY_DEDUCTION_RATE;
          lateDeduction = monetaryDeduction;
          deductionType = 'monetary';
        }
        
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
          hasLate: lateDays > 0,
          position: position,
          deductionType: deductionType,
          leaveCreditsUsed: leaveCreditsUsed,
          monetaryDeduction: monetaryDeduction,
          deductionRate: usesLeaveCredits ? LEAVE_DEDUCTION_RATE : MONETARY_DEDUCTION_RATE,
          isFullyCompliant: compliance.isFullyCompliant || false,
          compliancePercentage: compliance.percentage || 0
        };
      });

      setPayrollRecords(updatedPayroll);
      calculateSummary(updatedPayroll, empList, lateDaysMap, leaveBalancesMap);

    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (records, empList, lateDaysMap, leaveBalancesMap) => {
    const totalPayroll = records.reduce((sum, record) => sum + (record.netPay || 0), 0);
    const totalDeductions = records.reduce((sum, record) => sum + (record.totalDeductions || 0), 0);
    const totalMonetaryDeductions = records.reduce((sum, record) => sum + (record.monetaryDeduction || 0), 0);
    const totalLeaveCreditsUsed = records.reduce((sum, record) => sum + (record.leaveCreditsUsed || 0), 0);
    const totalLateDays = Object.values(lateDaysMap || {}).reduce((sum, val) => sum + val, 0);
    const avgSalary = records.length > 0 ? totalPayroll / records.length : 0;
    const paidCount = records.filter(r => r.status === 'Paid').length;
    const pendingCount = records.filter(r => r.status === 'Pending' || !r.status).length;
    
    const fullyCompliantCount = Object.values(complianceData).filter(d => d.isFullyCompliant).length;
    
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
      totalLateDeductions: totalMonetaryDeductions + (totalLeaveCreditsUsed * (records[0]?.basicSalary / 30 || 0)),
      totalLateDays,
      paidCount,
      pendingCount,
      totalLeaveCreditsUsed,
      totalMonetaryDeductions,
      fullyCompliantCount
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

      const payrollRecord = payrollRecords.find(r => r.id === payrollId);
      
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

      setProcessMessage(`Payroll status updated to ${newStatus}`);
      setProcessSuccess(true);
      
      setTimeout(() => {
        setProcessMessage('');
        setProcessSuccess(false);
      }, 5000);
      
      await fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      setProcessMessage('Error updating status: ' + error.message);
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
      
      setProcessMessage(`Successfully marked ${updatedCount} payroll records as Paid`);
      setProcessSuccess(true);
      
      setTimeout(() => {
        setProcessMessage('');
        setProcessSuccess(false);
      }, 5000);
      
      await fetchData();
    } catch (error) {
      console.error('Error marking all as paid:', error);
      setProcessMessage('Error: ' + error.message);
      setProcessSuccess(false);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ====== PROCESS PAYROLL FUNCTION ======
  const processPayrollWithLateDeductions = async () => {
    setProcessingPayroll(true);
    setProcessMessage('Processing payroll...');
    setProcessSuccess(false);
    
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const empSnapshot = await getDocs(collection(db, 'employees'));
      const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (empList.length === 0) {
        setProcessMessage('No employees found. Please add employees first.');
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
        if (isLate(record.timeIn)) {
          lateDaysMap[record.employeeId] = (lateDaysMap[record.employeeId] || 0) + 1;
        }
      });

      const leaveBalancesSnapshot = await getDocs(collection(db, 'leaveBalances'));
      const leaveBalancesMap = {};
      leaveBalancesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.employeeId) {
          leaveBalancesMap[data.employeeId] = {
            id: doc.id,
            ...data
          };
        }
      });

      const complianceMap = await fetchComplianceData();

      let createdCount = 0;
      let updatedCount = 0;
      let totalLeaveCreditsUsed = 0;
      let totalMonetaryDeductions = 0;
      let newlyCompliantEmployees = [];

      for (const emp of empList) {
        try {
          const lateDays = lateDaysMap[emp.id] || 0;
          const position = emp.position || emp.employmentType || 'Unknown';
          const basicSalary = parseFloat(emp.salary || emp.basicSalary || emp.baseSalary || 0) || 0;
          const dailyRate = basicSalary / 30;
          const compliance = complianceMap[emp.id] || { isFullyCompliant: false, percentage: 0 };
          
          let lateDeduction = 0;
          let leaveCreditsUsed = 0;
          let monetaryDeduction = 0;
          let deductionType = 'none';
          
          const usesLeaveCredits = LEAVE_CREDIT_POSITIONS.includes(position);
          const usesMonetaryDeduction = MONETARY_DEDUCTION_POSITIONS.includes(position);
          
          if (usesLeaveCredits && lateDays > 0) {
            leaveCreditsUsed = lateDays * LEAVE_DEDUCTION_RATE;
            deductionType = 'leave';
            const monetaryEquivalent = leaveCreditsUsed * dailyRate;
            lateDeduction = monetaryEquivalent;
            
            const balance = leaveBalancesMap[emp.id];
            if (balance) {
              let remainingDeduction = leaveCreditsUsed;
              let vacationDeduction = Math.min(remainingDeduction, balance.vacationLeave || 0);
              remainingDeduction -= vacationDeduction;
              let sickDeduction = Math.min(remainingDeduction, balance.sickLeave || 0);
              remainingDeduction -= sickDeduction;
              
              const actualDeduction = vacationDeduction + sickDeduction;
              
              const updates = {};
              if (vacationDeduction > 0) {
                updates.vacationLeave = (balance.vacationLeave || 0) - vacationDeduction;
              }
              if (sickDeduction > 0) {
                updates.sickLeave = (balance.sickLeave || 0) - sickDeduction;
              }
              
              if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'leaveBalances', balance.id), {
                  ...updates,
                  updatedAt: new Date().toISOString()
                });
                totalLeaveCreditsUsed += actualDeduction;
              }
            }
          } else if (usesMonetaryDeduction && lateDays > 0) {
            monetaryDeduction = lateDays * MONETARY_DEDUCTION_RATE;
            lateDeduction = monetaryDeduction;
            deductionType = 'monetary';
            totalMonetaryDeductions += monetaryDeduction;
          }
          
          const totalDeductions = lateDeduction;
          const netPay = basicSalary - totalDeductions;
          const employeeName = emp.fullName || emp.name || emp.employeeName || 'Unknown';

          const payrollData = {
            employeeId: emp.id,
            employeeName: employeeName,
            department: emp.department || emp.dept || 'Unknown',
            position: position,
            employmentType: position,
            periodStart: startDate,
            periodEnd: endDate,
            periodMonth: monthName,
            periodYear: currentYear,
            basicSalary: basicSalary,
            deductions: lateDeduction,
            lateDays: lateDays,
            lateDeduction: lateDeduction,
            monetaryDeduction: monetaryDeduction,
            leaveCreditsUsed: leaveCreditsUsed,
            deductionType: deductionType,
            deductionRate: usesLeaveCredits ? LEAVE_DEDUCTION_RATE : MONETARY_DEDUCTION_RATE,
            originalDeductions: 0,
            totalDeductions: totalDeductions,
            netPay: netPay,
            status: 'Pending',
            hasLate: lateDays > 0,
            processedAt: new Date().toISOString(),
            dailyRate: dailyRate,
            monthDays: 30,
            isFullyCompliant: compliance.isFullyCompliant || false,
            compliancePercentage: compliance.percentage || 0
          };

          if (compliance.isFullyCompliant && !newlyCompliantEmployees.some(e => e.id === emp.id)) {
            newlyCompliantEmployees.push(emp);
          }

          const existingQuery = query(
            collection(db, 'payroll'),
            where('employeeId', '==', emp.id),
            where('periodStart', '==', startDate),
            where('periodEnd', '==', endDate)
          );
          const existingSnapshot = await getDocs(existingQuery);

          const fallbackQuery = query(
            collection(db, 'payroll'),
            where('employeeId', '==', emp.id),
            where('periodMonth', '==', monthName),
            where('periodYear', '==', currentYear)
          );
          const fallbackSnapshot = await getDocs(fallbackQuery);

          let existingDocId = null;
          
          if (!existingSnapshot.empty) {
            existingDocId = existingSnapshot.docs[0].id;
          } else if (!fallbackSnapshot.empty) {
            existingDocId = fallbackSnapshot.docs[0].id;
          }

          if (existingDocId) {
            await updateDoc(doc(db, 'payroll', existingDocId), payrollData);
            updatedCount++;
          } else {
            await addDoc(collection(db, 'payroll'), payrollData);
            createdCount++;
          }
        } catch (error) {
          console.error(`Error processing payroll for employee ${emp.id}:`, error);
        }
      }

      if (newlyCompliantEmployees.length > 0) {
        for (const emp of newlyCompliantEmployees) {
          await addDoc(collection(db, 'notifications'), {
            type: 'payroll_compliance_alert',
            employeeId: emp.id,
            employeeName: emp.fullName,
            department: emp.department || 'N/A',
            message: `✅ ${emp.fullName} is 100% compliant! This is reflected in their payroll record.`,
            read: false,
            forAdmin: true,
            forEmployee: false,
            createdAt: new Date().toISOString(),
            priority: 'high',
            category: 'payroll_compliance'
          });
        }
      }

      const totalLateDays = Object.values(lateDaysMap).reduce((sum, val) => sum + val, 0);
      
      const successMessage = 
        `✅ Payroll processed successfully!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 Created: ${createdCount}, Updated: ${updatedCount}\n` +
        `📅 Total late days: ${totalLateDays}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 DEDUCTION BREAKDOWN:\n` +
        `   • Casual/Regular/Probationary: Leave Credits (${LEAVE_DEDUCTION_RATE} day per late)\n` +
        `   • Job Order/Contractual: Monetary (₱${MONETARY_DEDUCTION_RATE} per late)\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 Total leave credits used: ${totalLeaveCreditsUsed.toFixed(1)} days\n` +
        `💰 Total monetary deductions: ₱${totalMonetaryDeductions.toFixed(2)}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 Status set to: Pending (Ready for review)\n` +
        `${newlyCompliantEmployees.length > 0 ? `🎉 ${newlyCompliantEmployees.length} employee(s) are now 100% compliant!` : ''}`;
      
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
      console.error('Error processing payroll:', error);
      setProcessMessage('Error processing payroll: ' + error.message);
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

  const getEmployeePosition = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? (emp.position || emp.employmentType || 'Unknown') : 'Unknown';
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

  const getComplianceBadge = (record) => {
    if (record.isFullyCompliant) {
      return (
        <span style={{
          background: '#d4edda',
          color: '#155724',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <StarsIcon style={{ fontSize: 14 }} />
          100% Compliant
        </span>
      );
    }
    if (record.compliancePercentage > 0) {
      return (
        <span style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {record.compliancePercentage}% Complete
        </span>
      );
    }
    return (
      <span style={{
        background: '#f8f9fa',
        color: '#6c757d',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '11px'
      }}>
        No Docs
      </span>
    );
  };

  const filteredRecords = payrollRecords.filter(record => {
    const deptMatch = filterDepartment === 'all' || getEmployeeDepartment(record.employeeId) === filterDepartment;
    const statusMatch = filterStatus === 'all' || (record.status || 'Pending') === filterStatus;
    const positionMatch = filterPosition === 'all' || (record.position || 'Unknown') === filterPosition;
    return deptMatch && statusMatch && positionMatch;
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
          <p className="header-subtitle">Track and manage employee salary records with position-based deductions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="stats-badge">
            <CalendarTodayIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          
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
          background: processSuccess ? '#e4f5e9' : '#fde8e8',
          color: processSuccess ? '#27ae60' : '#e74c3c',
          border: `1px solid ${processSuccess ? '#b8e6c9' : '#fcc'}`,
          fontWeight: '500',
          whiteSpace: 'pre-line'
        }}>
          {processMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon"><AttachMoneyIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info">
            <h3>Total Payroll</h3>
            <p>₱{summary.totalPayroll.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon"><BarChartIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info">
            <h3>Average Salary</h3>
            <p>₱{summary.avgSalary.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircleIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info">
            <h3>Paid</h3>
            <p>{summary.paidCount}</p>
            <small>Employees</small>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><HourglassEmptyIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info">
            <h3>Pending</h3>
            <p>{summary.pendingCount}</p>
            <small>Employees</small>
          </div>
        </div>
        {/* <div className="stat-card teal">
          <div className="stat-icon"><PeopleIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info">
            <h3>Leave Credits Used</h3>
            <p>{summary.totalLeaveCreditsUsed?.toFixed(1) || 0} days</p>
            <small>Casual & Regular</small>
          </div>
        </div> */}
        <div className="stat-card red">
          <div className="stat-icon"><TrendingDownIcon style={{ fontSize: 30 }} /></div>
          <div className="stat-info">
            <h3>Late Deductions</h3>
            <p>₱{summary.totalMonetaryDeductions?.toFixed(2) || 0}</p>
            <small>Monetary</small>
          </div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon"><StarsIcon style={{ fontSize: 30, color: '#ffd700' }} /></div>
          <div className="stat-info">
            <h3>Fully Compliant</h3>
            <p>{summary.fullyCompliantCount || 0}</p>
            <small>Employees</small>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="search-filter-bar">
        <div className="filter-group">
          <WorkIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Positions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
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

      {/* Payroll Records Table - IMPROVED LAYOUT */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="payroll-table-modern" style={{ 
          width: '100%', 
          minWidth: '1200px',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{ background: '#4a6fa5', color: 'white' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: '160px' }}>Employee</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: '100px' }}>Position</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: '100px' }}>Department</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '100px' }}>Compliance</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: '120px' }}>Period</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '100px' }}>Basic Salary</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '70px' }}>Late Days</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: '140px' }}>Deduction Details</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '100px' }}>Total Deductions</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '110px' }}>Net Pay</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '90px' }}>Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '110px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map(record => {
                const position = record.position || getEmployeePosition(record.employeeId);
                const usesLeaveCredits = LEAVE_CREDIT_POSITIONS.includes(position);
                const isLeave = record.deductionType === 'leave';
                const isMonetary = record.deductionType === 'monetary';
                const dailyRate = record.basicSalary / 30;
                const monetaryEquivalent = isLeave ? record.leaveCreditsUsed * dailyRate : 0;
                const isCompliant = record.isFullyCompliant || false;
                const employeeName = getEmployeeName(record.employeeId);
                const department = getEmployeeDepartment(record.employeeId);
                
                return (
                  <tr key={record.id} style={{ 
                    borderBottom: '1px solid #f0f2f7',
                    background: isCompliant ? '#f0faf4' : 'white',
                    transition: 'background 0.2s ease'
                  }}>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4a6fa5, #3559c7)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          {employeeName.charAt(0)}
                        </div>
                        <span style={{ fontWeight: '600', color: '#1a2a4a' }}>{employeeName}</span>
                        {isCompliant && (
                          <span style={{
                            background: '#27ae60',
                            color: 'white',
                            fontSize: '9px',
                            padding: '1px 8px',
                            borderRadius: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}>
                            <StarsIcon style={{ fontSize: 10 }} />
                            100%
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <span style={{
                        background: usesLeaveCredits ? '#d4edda' : '#fff3cd',
                        color: usesLeaveCredits ? '#155724' : '#856404',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {position}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <span style={{
                        background: '#eef2f7',
                        color: '#2c3e50',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {department}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {getComplianceBadge(record)}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{record.periodStart}</span>
                        <span style={{ color: '#b0c4de' }}>→</span>
                        <span>{record.periodEnd}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'right', fontWeight: '500' }}>
                      ₱{record.basicSalary?.toLocaleString() || '0'}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {record.lateDays > 0 ? (
                        <span style={{ color: '#e67e22', fontWeight: '600' }}>{record.lateDays}</span>
                      ) : (
                        <span style={{ color: '#27ae60' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontSize: '12px' }}>
                      {isLeave && record.lateDays > 0 ? (
                        <div style={{ color: '#27ae60' }}>
                          <div>Leave: {record.leaveCreditsUsed?.toFixed(1) || 0} days</div>
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            Rate: {LEAVE_DEDUCTION_RATE} day/late
                          </div>
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            ₱{monetaryEquivalent.toFixed(2)}
                          </div>
                        </div>
                      ) : isMonetary && record.lateDays > 0 ? (
                        <div style={{ color: '#e74c3c' }}>
                          <div>Monetary: ₱{record.monetaryDeduction?.toFixed(2) || '0'}</div>
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            Rate: ₱{MONETARY_DEDUCTION_RATE}/late
                          </div>
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            {record.lateDays} × ₱{MONETARY_DEDUCTION_RATE}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#27ae60' }}>No deduction</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                      {record.totalDeductions > 0 ? (
                        <div style={{ color: '#e74c3c', fontWeight: '600' }}>
                          ₱{record.totalDeductions?.toLocaleString() || '0'}
                          {isLeave && record.leaveCreditsUsed > 0 && (
                            <div style={{ fontSize: '11px', color: '#27ae60', fontWeight: '400' }}>
                              ({record.leaveCreditsUsed.toFixed(1)} days)
                            </div>
                          )}
                        </div>
                      ) : (
                        '₱0'
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <span style={{ 
                        fontWeight: '700',
                        color: record.hasLate ? '#e67e22' : '#27ae60',
                        fontSize: '15px'
                      }}>
                        ₱{record.netPay?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {getStatusBadge(record)}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {(record.status === 'Pending' || !record.status) && (
                          <button
                            onClick={() => updatePayrollStatus(record.id, 'Paid')}
                            disabled={updatingStatus}
                            style={{
                              padding: '4px 12px',
                              background: '#27ae60',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: updatingStatus ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!updatingStatus) {
                                e.target.style.background = '#1e9e55';
                                e.target.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#27ae60';
                              e.target.style.transform = 'translateY(0)';
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
                              padding: '4px 12px',
                              background: '#e67e22',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: updatingStatus ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!updatingStatus) {
                                e.target.style.background = '#d35400';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#e67e22';
                            }}
                          >
                            <PendingIcon style={{ fontSize: 14 }} />
                            Revert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="12" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ color: '#b0c4de' }}>
                    <InboxIcon style={{ fontSize: 48, display: 'block', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#1a2a4a', margin: 0 }}>No payroll records found</p>
                    <span style={{ fontSize: '14px', color: '#8a9bb5' }}>Click "Process Payroll" to generate records</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .stat-card.gold {
          background: linear-gradient(135deg, #ffd700, #f39c12);
        }
        .stat-card.gold .stat-info h3 {
          color: #fff;
        }
        .stat-card.gold .stat-info p {
          color: #fff;
        }
        .stat-card.gold .stat-info small {
          color: rgba(255,255,255,0.8);
        }
        .stat-card.gold .stat-icon svg {
          color: #fff;
        }
        .payroll-table-modern tbody tr:hover {
          background: #f8fafd !important;
        }
        .payroll-table-modern tbody tr.compliant-row:hover {
          background: #e8f5ed !important;
        }
      `}</style>
    </div>
  );
}

export default Payroll;