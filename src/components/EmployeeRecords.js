// src/components/EmployeeRecords.js
import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../firebase';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';

// Material-UI Icons
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WorkIcon from '@mui/icons-material/Work';

function EmployeeRecords() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
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
    const deptList = [...new Set(data.map(emp => emp.department).filter(Boolean))];
    setDepartments(deptList);
  };

  // Function to auto-create user account
  const createUserAccount = async (email, name, role = 'Employee') => {
    try {
      const defaultPassword = 'Password123!';
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, defaultPassword);
      
      await addDoc(collection(db, 'users'), {
        name: name,
        email: email,
        role: role,
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString()
      });
      
      console.log('✅ User account created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating user account:', error);
      if (error.code === 'auth/email-already-in-use') {
        console.log('⚠️ Email already has an account');
        return true;
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateEmployee(editingId, formData);
        alert('✅ Employee updated successfully!');
      } else {
        await addEmployee(formData);
        
        const role = 'Employee';
        await createUserAccount(
          formData.email,
          formData.fullName,
          role
        );
        
        alert('✅ Employee added with user account!');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      await loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('❌ Failed to save employee. Please check all fields.');
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '', department: '', position: '', email: '', phone: '', 
      dateHired: '', salary: ''
    });
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteEmployee(id);
        await loadEmployees();
        alert('✅ Employee deleted successfully');
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('❌ Failed to delete employee');
      }
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

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="employee-records">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <PeopleIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            Employee Records
          </h2>
          <p className="header-subtitle">Manage employee information - Auto-creates user accounts</p>
        </div>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }} 
          className="btn-add-modern"
        >
          <AddIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
          Add Employee
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-group">
          <SearchIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ paddingLeft: 8 }}
          />
        </div>
        <div className="filter-group">
          <BusinessIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="stats-badge">
          <span>{filteredEmployees.length} employees</span>
        </div>
      </div>

      {/* Employee Table */}
      <div className="table-container">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Position</th>
              <th>Email</th>
              <th>Date Hired</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div className="employee-info">
                    <div className="employee-avatar">
                      {emp.fullName?.charAt(0) || '?'}
                    </div>
                    <div className="employee-details">
                      <span className="employee-name">{emp.fullName}</span>
                      <span className="employee-id">#{emp.id?.slice(0, 8) || 'N/A'}</span>
                    </div>
                  </div>
                </td>
                <td><span className="dept-tag">{emp.department || '—'}</span></td>
                <td>{emp.position || '—'}</td>
                <td className="email-cell">{emp.email || '—'}</td>
                <td>{emp.dateHired || '—'}</td>
                <td>
                  <span className={`status-dot ${emp.status === 'Inactive' ? 'inactive' : 'active'}`}>
                    {emp.status || 'Active'}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleEdit(emp)} className="btn-action edit">
                    <EditIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(emp.id, emp.fullName)} className="btn-action delete">
                    <DeleteIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-state">
                  <FolderIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No employees found</p>
                  <span>Click "Add Employee" to get started</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingId(null); }}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingId ? (
                  <EditIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
                ) : (
                  <AddIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
                )}
                {editingId ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button 
                className="modal-close" 
                onClick={() => { setShowForm(false); setEditingId(null); }}
              >
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="employee-form">
              <div className="form-grid">
                <div className="form-group">
                  <label><PersonIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="Enter full name" 
                    value={formData.fullName} 
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label><BusinessIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Department *</label>
                  <input 
                    type="text" 
                    placeholder="Enter department" 
                    value={formData.department} 
                    onChange={(e) => setFormData({...formData, department: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label><WorkIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Position *</label>
                  <input 
                    type="text" 
                    placeholder="Enter position" 
                    value={formData.position} 
                    onChange={(e) => setFormData({...formData, position: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label><EmailIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Email *</label>
                  <input 
                    type="email" 
                    placeholder="Enter email address" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label><PhoneIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Phone</label>
                  <input 
                    type="text" 
                    placeholder="Enter phone number" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label><CalendarTodayIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Date Hired</label>
                  <input 
                    type="date" 
                    value={formData.dateHired} 
                    onChange={(e) => setFormData({...formData, dateHired: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label><AttachMoneyIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Salary</label>
                  <input 
                    type="number" 
                    placeholder="Enter salary" 
                    value={formData.salary} 
                    onChange={(e) => setFormData({...formData, salary: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save">
                  <SaveIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  {editingId ? 'Update Employee' : 'Save Employee'}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                >
                  <CancelIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeRecords;