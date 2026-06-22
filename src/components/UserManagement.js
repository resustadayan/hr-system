import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Employee', password: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(userList);
  };

  const addUser = async () => {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Add user to Firestore
      await addDoc(collection(db, 'users'), {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        uid: userCredential.user.uid,
        createdAt: new Date().toISOString()
      });
      
      fetchUsers();
      setFormData({ name: '', email: '', role: 'Employee', password: '' });
      alert('User added successfully');
    } catch (error) {
      console.error('Error adding user:', error);
      alert(error.message);
    }
  };

  const updateUser = async (id, newRole) => {
    await updateDoc(doc(db, 'users', id), { role: newRole });
    fetchUsers();
  };

  const deleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteDoc(doc(db, 'users', id));
      fetchUsers();
    }
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'HR Admin': return <span className="badge hr">HR Admin</span>;
      case 'MGDH': return <span className="badge mgdh">MGDH</span>;
      default: return <span className="badge employee">Employee</span>;
    }
  };

  return (
    <div className="user-management">
      <h2>User Management</h2>
      
      {/* Add User Form */}
      <div className="form-card">
        <h3>{editingId ? 'Edit User' : 'Add New User'}</h3>
        <div className="form-group">
          <input 
            type="text" 
            placeholder="Full Name" 
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <input 
            type="email" 
            placeholder="Email" 
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <select 
            value={formData.role} 
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="Employee">Employee</option>
            <option value="MGDH">MGDH (Department Head)</option>
            <option value="HR Admin">HR Admin</option>
          </select>
          <input 
            type="password" 
            placeholder="Password" 
            value={formData.password} 
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <button onClick={addUser}>Add User</button>
        </div>
      </div>

      {/* Users Table */}
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{getRoleBadge(user.role)}</td>
              <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
              <td>
                <select 
                  value={user.role} 
                  onChange={(e) => updateUser(user.id, e.target.value)}
                  className="role-select"
                >
                  <option value="Employee">Employee</option>
                  <option value="MGDH">MGDH</option>
                  <option value="HR Admin">HR Admin</option>
                </select>
                <button onClick={() => deleteUser(user.id)} className="delete-btn">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserManagement;