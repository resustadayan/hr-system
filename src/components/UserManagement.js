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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BadgeIcon from '@mui/icons-material/Badge';
import FolderIcon from '@mui/icons-material/Folder';
import LockIcon from '@mui/icons-material/Lock';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Employee', password: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const tableRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const addUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
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
      await updateDoc(doc(db, 'users', id), { role: newRole });
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
    setFormData({ name: '', email: '', role: 'Employee', password: '' });
    setEditingId(null);
  };

  const getRoleBadge = (role) => {
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
      default: 
        return (
          <span className="role-badge employee">
            <BadgeIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
            Employee
          </span>
        );
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Created At'];
    const rows = filteredUsers.map(user => [
      user.name || 'N/A',
      user.email || 'N/A',
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

  // Export to PDF (using print)
  const exportToPDF = () => {
    window.print();
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'HR Admin').length;
  const mgdhCount = users.filter(u => u.role === 'MGDH').length;
  const employeeCount = users.filter(u => u.role === 'Employee').length;

  return (
    <div className="user-management">

      {/* Page Header - Add User Button REMOVED */}
      <div className="page-header-modern">
        <div className="header-left">
          <h2>
            <PeopleIcon style={{ fontSize: 28, marginRight: 10, verticalAlign: 'middle' }} />
            User Management
          </h2>
          {/* UPDATED SUBTITLE - Shows it's connected to Employee Records */}
          <p className="header-subtitle">View all employee system accounts (Auto-synced with Employee Records)</p>
        </div>
      </div>

      {/* Summary Cards */}
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
            <p>{adminCount}</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">
            <SupervisorAccountIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>MGDH</h3>
            <p>{mgdhCount}</p>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">
            <BadgeIcon style={{ fontSize: 30 }} />
          </div>
          <div className="stat-info">
            <h3>Employees</h3>
            <p>{employeeCount}</p>
          </div>
        </div>
      </div>

      {/* Search, Filter & Export Bar */}
      <div className="search-filter-bar">
        <div className="search-group">
          <SearchIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ paddingLeft: 8 }}
          />
        </div>
        <div className="filter-group">
          <FilterListIcon style={{ fontSize: 18, marginRight: 8, verticalAlign: 'middle', color: '#8a9bb5' }} />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="HR Admin">
              <AdminPanelSettingsIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
              HR Admin
            </option>
            <option value="MGDH">
              <SupervisorAccountIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
              MGDH
            </option>
            <option value="Employee">
              <BadgeIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
              Employee
            </option>
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
                <td>{getRoleBadge(user.role)}</td>
                <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <select 
                    value={user.role} 
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className="role-select-modern"
                  >
                    <option value="Employee">
                      <BadgeIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                      Employee
                    </option>
                    <option value="MGDH">
                      <SupervisorAccountIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                      MGDH
                    </option>
                    <option value="HR Admin">
                      <AdminPanelSettingsIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                      HR Admin
                    </option>
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
                <td colSpan="6" className="empty-state">
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
                  <AdminPanelSettingsIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                  Role
                </label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="role-select-modern"
                >
                  <option value="Employee">
                    <BadgeIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                    Employee
                  </option>
                  <option value="MGDH">
                    <SupervisorAccountIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                    MGDH
                  </option>
                  <option value="HR Admin">
                    <AdminPanelSettingsIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                    HR Admin
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <LockIcon style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} />
                  Password *
                </label>
                <input 
                  type="password" 
                  placeholder="Enter password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
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