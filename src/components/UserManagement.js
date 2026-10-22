// src/components/UserManagement.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Material-UI Icons
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import FolderIcon from '@mui/icons-material/Folder';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import EditIcon from '@mui/icons-material/Edit';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

function UserManagement({ refreshTrigger }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    department: '',
    position: '',
    role: 'Employee',
    phone: '',
    dateHired: ''
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const tableRef = useRef(null);

  // Fetch departments from employees first
  const fetchDepartments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const deptList = [...new Set(empList.map(emp => emp.department).filter(Boolean))];
      setDepartments(deptList);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  // Refresh when trigger changes
  const prevRefreshRef = useRef();
  useEffect(() => {
    if (prevRefreshRef.current !== refreshTrigger) {
      fetchDepartments();
      fetchUsers();
      prevRefreshRef.current = refreshTrigger;
    }
  }, [refreshTrigger]);

  // Function to calculate deductions
  const calculateDeductions = (salary) => {
    const sss = salary * 0.045;
    const philhealth = salary * 0.025;
    const pagibig = Math.min(salary * 0.01, 100);
    const totalDeductions = sss + philhealth + pagibig;
    const netPay = salary - totalDeductions;
    
    return {
      sss: Math.round(sss * 100) / 100,
      philhealth: Math.round(philhealth * 100) / 100,
      pagibig: Math.round(pagibig * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100
    };
  };

  // Function to create payroll record
  const createPayrollRecord = async (userId, userName, department, salary) => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      
      const deductions = calculateDeductions(parseFloat(salary));
      
      const periodStart = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
      const periodEnd = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(new Date(year, currentDate.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

      const payrollQuery = query(
        collection(db, 'payroll'), 
        where('employeeId', '==', userId),
        where('periodStart', '==', periodStart)
      );
      const existingPayroll = await getDocs(payrollQuery);
      
      if (!existingPayroll.empty) {
        const payrollDoc = existingPayroll.docs[0];
        await updateDoc(doc(db, 'payroll', payrollDoc.id), {
          basicSalary: parseFloat(salary),
          sss: deductions.sss,
          philhealth: deductions.philhealth,
          pagibig: deductions.pagibig,
          deductions: deductions.totalDeductions,
          netPay: deductions.netPay,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Payroll record updated for: ' + userName);
      } else {
        await addDoc(collection(db, 'payroll'), {
          employeeId: userId,
          employeeName: userName,
          department: department,
          periodStart: periodStart,
          periodEnd: periodEnd,
          basicSalary: parseFloat(salary),
          sss: deductions.sss,
          philhealth: deductions.philhealth,
          pagibig: deductions.pagibig,
          deductions: deductions.totalDeductions,
          netPay: deductions.netPay,
          status: 'Pending',
          createdAt: new Date().toISOString()
        });
        console.log('Payroll record created for: ' + userName);
      }
      
      return true;
    } catch (error) {
      console.error('Error creating/updating payroll record:', error);
      return false;
    }
  };

  // ====== Sync employee collection ======
  const syncEmployeeCollection = async (userId, userData) => {
    try {
      // First, try to find existing employee by email
      const employeeQuery = query(collection(db, 'employees'), where('email', '==', userData.email));
      const employeeSnapshot = await getDocs(employeeQuery);
      
      const employeeData = {
        fullName: userData.name,
        email: userData.email,
        department: userData.department,
        position: userData.position || '',
        phone: userData.phone || '',
        dateHired: userData.dateHired || '',
        status: 'Active',
        updatedAt: new Date().toISOString()
      };

      if (!employeeSnapshot.empty) {
        // Update existing employee document
        const employeeDoc = employeeSnapshot.docs[0];
        await updateDoc(doc(db, 'employees', employeeDoc.id), employeeData);
        console.log('Employee collection updated for: ' + userData.name);
        return employeeDoc.id;
      } else {
        // Create new employee document
        const newEmployeeData = {
          ...employeeData,
          createdAt: new Date().toISOString(),
          employeeId: userId
        };
        const docRef = await addDoc(collection(db, 'employees'), newEmployeeData);
        console.log('Employee collection created for: ' + userData.name);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error syncing employee collection:', error);
      return null;
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      department: user.department || '',
      position: user.position || '',
      role: user.role || 'Employee',
      phone: user.phone || '',
      dateHired: user.dateHired || ''
    });
    setShowForm(true);
  };

  // ====== addUser with employee sync ======
  const addUser = async () => {
    if (!formData.name || !formData.email || !formData.department || !formData.role) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const defaultPassword = 'Password123!';
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, defaultPassword);
      
      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        position: formData.position || '',
        phone: formData.phone || '',
        dateHired: formData.dateHired || '',
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'users'), userData);
      
      // ====== SYNC TO EMPLOYEES COLLECTION ======
      await syncEmployeeCollection(docRef.id, userData);
      
      await fetchUsers();
      resetForm();
      setShowForm(false);
      alert('User added successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ====== updateUser with employee sync ======
  const updateUser = async () => {
    if (!formData.name || !formData.email || !formData.department || !formData.role) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', editingId);
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        position: formData.position || '',
        phone: formData.phone || '',
        dateHired: formData.dateHired || ''
      };
      
      await updateDoc(userRef, updateData);
      
      // ====== SYNC TO EMPLOYEES COLLECTION ======
      await syncEmployeeCollection(editingId, updateData);
      
      await fetchUsers();
      resetForm();
      setShowForm(false);
      setEditingId(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ====== deleteUser with employee sync ======
  const deleteUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete user "${name}"? This will also remove their payroll records.`)) {
      try {
        // Delete payroll records
        const payrollQuery = query(collection(db, 'payroll'), where('employeeId', '==', id));
        const payrollSnapshot = await getDocs(payrollQuery);
        payrollSnapshot.docs.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        
        // Delete from employees collection
        const employeeQuery = query(collection(db, 'employees'), where('employeeId', '==', id));
        const employeeSnapshot = await getDocs(employeeQuery);
        employeeSnapshot.docs.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        
        // Delete from users collection
        await deleteDoc(doc(db, 'users', id));
        await fetchUsers();
        alert('User and associated records deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      email: '', 
      department: '', 
      position: '', 
      role: 'Employee',
      phone: '',
      dateHired: ''
    });
    setEditingId(null);
  };

  const getRoleBadge = (role) => {
    if (!role) return <span className="role-badge secondary">No Role</span>;
    
    switch(role) {
      case 'HR Admin':
        return (
          <span className="role-badge admin">
            <AdminPanelSettingsIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
            HR Admin
          </span>
        );
      case 'MGDH':
        return (
          <span className="role-badge mgdh">
            <SupervisorAccountIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
            MGDH
          </span>
        );
      case 'Employee':
      default:
        return (
          <span className="role-badge employee">
            <PersonOutlineOutlinedIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
            Employee
          </span>
        );
    }
  };

  const getDepartmentCount = (department) => {
    return users.filter(user => user.department === department).length;
  };

  const getRoleCount = (role) => {
    return users.filter(user => user.role === role).length;
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const totalUsers = users.length;
  const totalAdmin = getRoleCount('HR Admin');
  const totalMGDH = getRoleCount('MGDH');
  const totalEmployees = getRoleCount('Employee');

  return (
    <div className="user-management">
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <PeopleIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            User Management
          </h2>
          <p className="header-subtitle">Manage system users and their roles</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }} className="btn-add-modern">
          <AddIcon style={{ fontSize: 20, marginRight: 6, verticalAlign: 'middle' }} />
          Add New User
        </button>
      </div>

      {/* Summary Cards - Role based */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon">
            <PeopleIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Total Users</h3>
            <p>{totalUsers}</p>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">
            <AdminPanelSettingsIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>HR Admins</h3>
            <p>{totalAdmin}</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <SupervisorAccountIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>MGDH</h3>
            <p>{totalMGDH}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <PersonOutlineOutlinedIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Employees</h3>
            <p>{totalEmployees}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="search-filter-bar">
        <div className="search-group">
          <SearchIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <FilterListIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
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
        <div className="filter-group">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="HR Admin">HR Admin</option>
            <option value="MGDH">MGDH</option>
            <option value="Employee">Employee</option>
          </select>
        </div>
        <div className="stats-badge">
          <span>{filteredUsers.length} users</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container" ref={tableRef}>
        <table className="users-table-modern" id="user-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Email</th>
              <th>Department</th>
              <th>Position</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>
                  <div className="employee-info">
                    <div className="employee-avatar small">
                      {user.name?.charAt(0) || '?'}
                    </div>
                    <span className="employee-name">{user.name || 'Unknown'}</span>
                  </div>
                </td>
                <td className="email-cell">
                  <EmailIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle', color: '#4a6fa5' }} />
                  {user.email || '—'}
                </td>
                <td>{user.department || '—'}</td>
                <td>{user.position || '—'}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <button 
                    onClick={() => handleEdit(user)} 
                    className="btn-action edit"
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginRight: '6px'
                    }}
                  >
                    <EditIcon style={{ fontSize: 14 }} />
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteUser(user.id, user.name)} 
                    className="btn-action delete"
                    style={{
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <DeleteIcon style={{ fontSize: 14 }} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="8" className="empty-state">
                  <FolderIcon style={{ fontSize: 48, color: '#b0c4de', display: 'block', margin: '0 auto 10px' }} />
                  <p>No users found</p>
                  <span>Try adjusting your search or filters</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingId ? (
                  <EditIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
                ) : (
                  <AddIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
                )}
                {editingId ? 'Edit User' : 'Add New User'}
              </h3>
              <button className="modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <CloseIcon />
              </button>
            </div>
            <div className="employee-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <PersonIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Full Name *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter full name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <BusinessIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Department *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter department" 
                    value={formData.department} 
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <WorkIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Position
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter position" 
                    value={formData.position} 
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <EmailIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Email *
                  </label>
                  <input 
                    type="email" 
                    placeholder="Enter email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <PhoneIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Phone
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter phone number" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <CalendarTodayIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                    Date Hired
                  </label>
                  <input 
                    type="date" 
                    value={formData.dateHired} 
                    onChange={(e) => setFormData({...formData, dateHired: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  onClick={editingId ? updateUser : addUser} 
                  className="btn-save" 
                  disabled={loading}
                >
                  <SaveIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  {loading ? 'Saving...' : (editingId ? 'Update User' : 'Save User')}
                </button>
                <button 
                  onClick={() => { setShowForm(false); resetForm(); }} 
                  className="btn-cancel"
                >
                  <CancelIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;