import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function AnalyticsDashboard() {
  const [employeeData, setEmployeeData] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch employees for department chart
    const employees = await getDocs(collection(db, 'employees'));
    const deptCount = {};
    employees.docs.forEach(doc => {
      const dept = doc.data().department;
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    setEmployeeData(Object.entries(deptCount).map(([name, value]) => ({ name, value })));

    // Compliance data
    const documents = await getDocs(collection(db, 'documents'));
    const total = documents.size;
    const complete = documents.docs.filter(d => d.data().status === 'Complete').length;
    setComplianceData([
      { name: 'Complete', value: complete },
      { name: 'Missing', value: total - complete }
    ]);
  };

  return (
    <div>
      <h2>Analytics Dashboard</h2>
      
      <div className="chart-container">
        <h3>Employees by Department</h3>
        <BarChart width={400} height={300} data={employeeData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </div>
      
      <div className="chart-container">
        <h3>Compliance Rate</h3>
        <PieChart width={400} height={300}>
          <Pie data={complianceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
            <Cell fill="#4CAF50" />
            <Cell fill="#F44336" />
          </Pie>
          <Tooltip />
        </PieChart>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;