// src/components/PendingApprovals.js
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, onSnapshot, doc, updateDoc, addDoc,
} from 'firebase/firestore';
import { sendEmployeeApprovalEmail } from './contexts/emailService';

// Icons
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';

function PendingApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('status', '==', 'Pending Approval')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setPending(list);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleApprove = async (user) => {
    if (!window.confirm(`Approve ${user.name}?`)) return;
    setProcessing(user.id);

    try {
      // 1. Update user document
      await updateDoc(doc(db, 'users', user.id), {
        status: 'Active',
        approvedAt: new Date().toISOString(),
      });

      // 2. Update employee document (by email — since IDs may differ)
      const empQuery = query(
        collection(db, 'employees'),
        where('email', '==', user.email)
      );
      const empSnap = await new Promise((resolve) => {
        const unsub = onSnapshot(empQuery, (s) => {
          unsub();
          resolve(s);
        });
      });
      for (const empDoc of empSnap.docs) {
        await updateDoc(doc(db, 'employees', empDoc.id), {
          status: 'Active',
          employmentStatus: 'Active',
          approvedAt: new Date().toISOString(),
        });
      }

      // 3. In-app notification (for the employee)
      await addDoc(collection(db, 'notifications'), {
        type: 'account_approved',
        employeeId: user.id,
        employeeName: user.name,
        message: `🎉 Your account has been approved! You can now log in to the employee portal.`,
        read: false,
        forEmployee: true,
        forAdmin: false,
        createdAt: new Date().toISOString(),
        priority: 'high',
        category: 'registration_approval',
      });

      // 4. In-app notification (for admins — for audit trail)
      await addDoc(collection(db, 'notifications'), {
        type: 'account_approved_admin_log',
        employeeId: user.id,
        employeeName: user.name,
        message: `${user.name} has been approved by HR.`,
        read: false,
        forAdmin: true,
        forEmployee: false,
        createdAt: new Date().toISOString(),
      });

      // 5. REAL EMAIL to the employee
      const emailResult = await sendEmployeeApprovalEmail({
        employeeName: user.name,
        employeeEmail: user.email,
      });

      if (emailResult.success) {
        alert(`✅ ${user.name} approved. Email sent to ${user.email}.`);
      } else {
        alert(`✅ ${user.name} approved. But email failed: ${emailResult.error || emailResult.reason}`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      alert('❌ Failed to approve user: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (user) => {
    if (!window.confirm(`Reject ${user.name}? They will NOT be able to log in.`)) return;
    setProcessing(user.id);

    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: 'Inactive',
        rejectedAt: new Date().toISOString(),
      });

      await addDoc(collection(db, 'notifications'), {
        type: 'account_rejected',
        employeeId: user.id,
        employeeName: user.name,
        message: `❌ Your registration was rejected. Please contact HR for details.`,
        read: false,
        forEmployee: true,
        forAdmin: false,
        createdAt: new Date().toISOString(),
      });

      alert(`❌ ${user.name} rejected.`);
    } catch (error) {
      console.error('Reject error:', error);
      alert('❌ Failed to reject: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading pending approvals…</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <HourglassEmptyIcon style={{ fontSize: 32, color: '#e67e22' }} />
          Pending Account Approvals
        </h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          {pending.length === 0
            ? 'No pending registrations.'
            : `${pending.length} employee${pending.length > 1 ? 's' : ''} waiting for approval.`}
        </p>
      </div>

      {pending.length === 0 ? (
        <div
          style={{
            padding: 60, textAlign: 'center', background: 'white',
            borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <CheckCircleIcon style={{ fontSize: 64, color: '#27ae60', marginBottom: 16 }} />
          <h3 style={{ margin: 0, color: '#27ae60' }}>All caught up!</h3>
          <p style={{ color: '#666' }}>No new registrations to review.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {pending.map((user) => (
            <div
              key={user.id}
              style={{
                background: 'white', padding: 20, borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 16,
                borderLeft: '4px solid #e67e22',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 280 }}>
                <div
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#4a6fa5', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 'bold',
                  }}
                >
                  {user.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    <PersonIcon style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />
                    {user.name}
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>
                    <EmailIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                    {user.email}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>
                    <BusinessIcon style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} />
                    {user.department || 'N/A'}
                    <WorkIcon style={{ fontSize: 14, margin: '0 4px 0 12px', verticalAlign: 'middle' }} />
                    {user.position || 'N/A'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 12, color: '#999' }}>
                    Registered: {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleApprove(user)}
                  disabled={processing === user.id}
                  style={{
                    padding: '10px 24px',
                    background: processing === user.id ? '#ccc' : '#27ae60',
                    color: 'white', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 600,
                    cursor: processing === user.id ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <CheckCircleIcon style={{ fontSize: 18 }} />
                  {processing === user.id ? 'Processing…' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(user)}
                  disabled={processing === user.id}
                  style={{
                    padding: '10px 24px',
                    background: processing === user.id ? '#ccc' : '#e74c3c',
                    color: 'white', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 600,
                    cursor: processing === user.id ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <CancelIcon style={{ fontSize: 18 }} />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingApprovals;