// src/components/AnalyticsDashboard.js
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, 
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  CartesianGrid, Area, AreaChart, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';

// Material-UI Icons
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RefreshIcon from '@mui/icons-material/Refresh';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';

function AnalyticsDashboard() {
  const [employeeData, setEmployeeData] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    complianceRate: 0,
    totalLeaves: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const employees = await getDocs(collection(db, 'employees'));
      const deptCount = {};
      let totalEmployees = 0;
      employees.docs.forEach(doc => {
        const dept = doc.data().department || 'Unassigned';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
        totalEmployees++;
      });
      
      const deptData = Object.entries(deptCount).map(([name, value]) => ({ 
        name, 
        value,
        fill: getColor(name)
      }));
      setEmployeeData(deptData);
      setDepartmentStats(deptData);
      setSummary(prev => ({ ...prev, totalEmployees, totalDepartments: deptData.length }));

      const documents = await getDocs(collection(db, 'documents'));
      const total = documents.size;
      const complete = documents.docs.filter(d => d.data().status === 'Complete').length;
      const missing = total - complete;
      const complianceRate = total > 0 ? Math.round((complete / total) * 100) : 0;
      
      setComplianceData([
        { name: 'Complete', value: complete, fill: '#27ae60' },
        { name: 'Missing', value: missing, fill: '#e74c3c' }
      ]);
      setSummary(prev => ({ ...prev, complianceRate }));

      const attendance = await getDocs(collection(db, 'attendance'));
      const attendanceMap = {};
      attendance.docs.forEach(doc => {
        const date = doc.data().date;
        if (date) {
          attendanceMap[date] = (attendanceMap[date] || 0) + 1;
        }
      });
      
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
      }
      
      const attendanceArr = dates.map(date => ({
        date: date,
        present: attendanceMap[date] || 0,
        formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
      setAttendanceData(attendanceArr);

      const leaves = await getDocs(collection(db, 'leaveRequests'));
      const leaveCount = leaves.size;
      const pendingLeaves = leaves.docs.filter(d => d.data().status === 'Pending').length;
      setLeaveData([
        { name: 'Pending', value: pendingLeaves, fill: '#f39c12' },
        { name: 'Approved', value: leaves.docs.filter(d => d.data().status === 'Approved').length, fill: '#27ae60' },
        { name: 'Rejected', value: leaves.docs.filter(d => d.data().status === 'Rejected').length, fill: '#e74c3c' }
      ]);
      setSummary(prev => ({ ...prev, totalLeaves: leaveCount }));

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (name) => {
    const colors = ['#4a6fa5', '#27ae60', '#e67e22', '#7c3aed', '#e74c3c', '#1abc9c', '#f39c12', '#3498db'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const COLORS = ['#4a6fa5', '#27ae60', '#e67e22', '#7c3aed', '#e74c3c', '#1abc9c'];
  const CHART_COLORS = ['#4a6fa5', '#27ae60', '#e67e22', '#7c3aed', '#e74c3c', '#1abc9c', '#f39c12', '#3498db'];

  if (loading) {
    return <div className="loading">Loading analytics data...</div>;
  }

  return (
    <div className="analytics-container">

      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <BarChartIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Analytics Dashboard
          </h2>
          <p className="header-subtitle">Real-time HR metrics and workforce insights</p>
        </div>
        <button onClick={fetchData} className="btn-add-modern" style={{ background: '#4a6fa5' }}>
          <RefreshIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon">
            <PeopleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Employees</h3>
            <p>{summary.totalEmployees}</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">
            <BusinessIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Departments</h3>
            <p>{summary.totalDepartments}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <CheckCircleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Compliance Rate</h3>
            <p>{summary.complianceRate}%</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <CalendarTodayIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Leave Requests</h3>
            <p>{summary.totalLeaves}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">

        {/* Chart 1: Employees by Department - Modern Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <PeopleIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Employees by Department
            </h3>
            <span className="chart-badge">{employeeData.length} departments</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={employeeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} employees`, 'Count']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {employeeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Compliance Rate - Donut Chart (More Professional) */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <CheckCircleIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Compliance Rate
            </h3>
            <span className="chart-badge">{summary.complianceRate}%</span>
          </div>
          <div className="chart-body pie-chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={complianceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#eef2f7' }}
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center-label">
              <span className="label-value">{summary.complianceRate}%</span>
              <span className="label-text">Compliant</span>
            </div>
          </div>
        </div>

        {/* Chart 3: Attendance Trend - Area Chart with Gradient */}
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>
              <ShowChartIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Attendance Trend (Last 7 Days)
            </h3>
            <span className="chart-badge">Daily</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={attendanceData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a6fa5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4a6fa5" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7a8f' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} present`, 'Employees']}
                />
                <Area 
                  type="monotone" 
                  dataKey="present" 
                  stroke="#4a6fa5" 
                  strokeWidth={3}
                  fill="url(#colorPresent)"
                  dot={{ fill: '#4a6fa5', r: 6, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 8, fill: '#4a6fa5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Leave Requests - Donut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <CalendarTodayIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Leave Requests
            </h3>
            <span className="chart-badge">{summary.totalLeaves} total</span>
          </div>
          <div className="chart-body pie-chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={leaveData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#eef2f7' }}
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-center-label">
              <span className="label-value">{summary.totalLeaves}</span>
              <span className="label-text">Total Requests</span>
            </div>
          </div>
        </div>

        {/* Chart 5: Department Summary - Modern List with Progress Bars */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>
              <BusinessIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle' }} />
              Department Summary
            </h3>
            <span className="chart-badge">{departmentStats.length} depts</span>
          </div>
          <div className="chart-body department-list">
            {departmentStats.map((dept, index) => {
              const maxValue = Math.max(...departmentStats.map(d => d.value));
              const percentage = (dept.value / maxValue) * 100;
              return (
                <div key={index} className="dept-summary-item-modern">
                  <div className="dept-summary-left">
                    <span className="dept-dot" style={{ background: dept.fill || COLORS[index % COLORS.length] }}></span>
                    <span className="dept-summary-name">{dept.name}</span>
                  </div>
                  <div className="dept-summary-bar-wrapper">
                    <div 
                      className="dept-summary-bar" 
                      style={{ 
                        width: `${Math.max(percentage, 2)}%`,
                        background: dept.fill || COLORS[index % COLORS.length]
                      }}
                    >
                      <span className="dept-summary-count">{dept.value} employees</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {departmentStats.length === 0 && (
              <div className="empty-state">
                <p>No department data available</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default AnalyticsDashboard;