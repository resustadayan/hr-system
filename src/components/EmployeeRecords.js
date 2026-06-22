// src/components/EmployeeRecords.js
import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../firebase';

function EmployeeRecords() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    dateHired: '',
    salary: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const data = await getEmployees();
    setEmployees(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateEmployee(editingId, formData);
      } else {
        await addEmployee(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        fullName: '', department: '', position: '', email: '', phone: '', dateHired: '', salary: ''
      });
      await loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Failed to save employee');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      await deleteEmployee(id);
      await loadEmployees();
    }
  };

  const handleEdit = (employee) => {
    setEditingId(employee.id);
    setFormData({
      fullName: employee.fullName || '',
      department: employee.department || '',
      position: employee.position || '',
      email: employee.email || '',
      phone: employee.phone || '',
      dateHired: employee.dateHired || '',
      salary: employee.salary || ''
    });
    setShowForm(true);
  };

  return (
    <div className="employee-records">
      <div className="page-header">
        <h2>Employee Records</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({}); }} className="btn-add">
          + Add Employee
        </button>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
              <input type="text" placeholder="Department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required />
              <input type="text" placeholder="Position" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} required />
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              <input type="text" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <input type="date" placeholder="Date Hired" value={formData.dateHired} onChange={(e) => setFormData({...formData, dateHired: e.target.value})} />
              <input type="number" placeholder="Salary" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} />
              <div className="modal-buttons">
                <button type="submit">{editingId ? 'Update' : 'Save'}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Position</th>
            <th>Email</th>
            <th>Date Hired</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id}>
              <td>{emp.fullName}</td>
              <td>{emp.department}</td>
              <td>{emp.position}</td>
              <td>{emp.email}</td>
              <td>{emp.dateHired}</td>
              <td>
                <button onClick={() => handleEdit(emp)} className="btn-edit">Edit</button>
                <button onClick={() => handleDelete(emp.id)} className="btn-delete">Delete</button>
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr><td colSpan="6" style={{textAlign: 'center'}}>No employees found. Click "Add Employee" to get started.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeRecords;