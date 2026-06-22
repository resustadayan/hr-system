import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';

function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [formData, setFormData] = useState({ employeeId: '', type: 'Vacation', startDate: '', endDate: '' });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    const q = query(collection(db, 'leaveRequests'));
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLeaveRequests(requests);
  };

  const submitLeave = async () => {
    const days = calculateDays(formData.startDate, formData.endDate);
    await addDoc(collection(db, 'leaveRequests'), {
      ...formData,
      days: days,
      status: 'Pending',
      dateSubmitted: new Date().toISOString()
    });
    fetchLeaveRequests();
  };

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'leaveRequests', id), { status });
    if (status === 'Approved') {
      // Deduct from balance logic here
    }
    fetchLeaveRequests();
  };

  return (
    <div>
      <h2>Leave Management</h2>
      <select onChange={(e) => setFormData({...formData, employeeId: e.target.value})}>
        <option>Select Employee</option>
        {/* Employee options */}
      </select>
      <input type="date" onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
      <input type="date" onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
      <button onClick={submitLeave}>Submit Leave Request</button>
      
      <table>
        <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {leaveRequests.map(req => (
            <tr key={req.id}>
              <td>{req.employeeId}</td>
              <td>{req.type}</td>
              <td>{req.startDate} to {req.endDate}</td>
              <td>{req.days}</td>
              <td>{req.status}</td>
              <td>
                {req.status === 'Pending' && (
                  <>
                    <button onClick={() => updateStatus(req.id, 'Approved')}>Approve</button>
                    <button onClick={() => updateStatus(req.id, 'Rejected')}>Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function calculateDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export default LeaveManagement;