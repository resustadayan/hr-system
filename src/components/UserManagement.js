// src/components/UserManagement.js
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import FolderIcon from '@mui/icons-material/Folder';
import LockIcon from '@mui/icons-material/Lock';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'; // ✅ Fixed import

function UserManagement({ refreshTrigger }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    department: '',
    position: '',
    role: 'Employee',
    password: '' 
  });
  // ✅ Removed unused 'editingId' - can be re-added later if needed
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

  const addUser = async () => {
    if (!formData.name || !formData.email || !formData.department || !formData.password || !formData.role) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      await addDoc(collection(db, 'users'), {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        position: formData.position || '',
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString()
      });
      
      await fetchUsers();
      resetForm();
      setShowForm(false);
      alert('✅ User added successfully');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('❌ Failed to add user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (id, newRole) => {
    try {
      await updateDoc(doc(db, 'users', id), { 
        role: newRole
      });
      await fetchUsers();
      alert('✅ User role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      alert('❌ Failed to update user role');
    }
  };

  const deleteUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'users', id));
        await fetchUsers();
        alert('✅ User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('❌ Failed to delete user');
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
      password: '' 
    });
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

  // ✅ Keep this function - it's used in the stats cards
  const getDepartmentCount = (department) => {
    return users.filter(user => user.department === department).length;
  };

  const getRoleCount = (role) => {
    return users.filter(user => user.role === role).length;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Department', 'Position', 'Role', 'Created At'];
    const rows = filteredUsers.map(user => [
      user.name || 'N/A',
      user.email || 'N/A',
      user.department || 'N/A',
      user.position || 'N/A',
      user.role || 'N/A',
      user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
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
          <p className="header-subtitle">Manage system users and their roles (HR Admin, MGDH, Employee)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-add-modern">
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

      {/* Search, Filter & Export */}
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
        <div className="export-group">
          <button onClick={exportToCSV} className="btn-export csv">
            <DownloadIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
            CSV
          </button>
          <button onClick={exportToPDF} className="btn-export pdf">
            <PictureAsPdfIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
            PDF
          </button>
          <button onClick={handlePrint} className="btn-export print">
            <PrintIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
            Print
          </button>
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
                  <select 
                    value={user.role || 'Employee'} 
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className="role-select-modern"
                  >
                    <option value="Employee">👤 Employee</option>
                    <option value="MGDH">👔 MGDH</option>
                    <option value="HR Admin">👑 HR Admin</option>
                  </select>
                  <button 
                    onClick={() => deleteUser(user.id, user.name)} 
                    className="btn-action delete"
                  >
                    <DeleteIcon style={{ fontSize: 16 }} />
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

      {/* Add User Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <AddIcon style={{ fontSize: 22, marginRight: 10, verticalAlign: 'middle' }} />
                Add New User
              </h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <CloseIcon />
              </button>
            </div>
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
                  <LockIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                  Password *
                </label>
                <input 
                  type="password" 
                  placeholder="Enter password (min 6 characters)" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <AdminPanelSettingsIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="role-select-modern"
                  required
                >
                  <option value="Employee">Employee</option>
                  <option value="MGDH">MGDH (Department Head)</option>
                  <option value="HR Admin">HR Admin</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={addUser} className="btn-save" disabled={loading}>
                <SaveIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                {loading ? 'Adding...' : 'Add User'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-cancel">
                <CancelIcon style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;