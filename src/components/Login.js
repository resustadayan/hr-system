// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import logoLeft from '../assets/pagbilogo.jpg';
import logoRight from '../assets/hrmo logo.jpg';
import coverImage from '../assets/pagbi_bg (1).jpg';

import { sendAdminRegistrationEmail } from './contexts/emailService';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const navigate = useNavigate();

  // ============================================
  // LOGIN
  // ============================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await login(email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || 'Employee';
        const name = userData.name || 'User';
        const status = userData.status || 'Active';

        // 🚫 BLOCK PENDING / INACTIVE USERS
        if (status === 'Pending Approval') {
          await signOut(auth);
          setError('⏳ Your account is still pending approval by HR. Please wait for the approval email.');
          setLoading(false);
          return;
        }
        if (status === 'Inactive') {
          await signOut(auth);
          setError('❌ Your account has been deactivated. Please contact HR.');
          setLoading(false);
          return;
        }

        // ✅ Active user — let them in
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);

        switch (role) {
          case 'HR Admin':
            navigate('/dashboard');
            break;
          case 'MGDH':
            navigate('/mgdh-dashboard');
            break;
          case 'Employee':
          default:
            navigate('/employee-portal');
            break;
        }
      } else {
        // No Firestore user doc — create one
        await setDoc(doc(db, 'users', user.uid), {
          name: user.email?.split('@')[0] || 'User',
          email: user.email,
          role: 'Employee',
          uid: user.uid,
          status: 'Active',
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, 'employees', user.uid), {
          fullName: user.email?.split('@')[0] || 'User',
          email: user.email,
          department: 'Unassigned',
          position: 'Unassigned',
          employmentStatus: 'Active',
          dateHired: new Date().toISOString().split('T')[0],
          salary: 0,
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, 'leaveBalances', user.uid), {
          employeeId: user.uid,
          vacationLeave: 15,
          sickLeave: 15,
        });

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', 'Employee');
        localStorage.setItem('userName', user.email?.split('@')[0] || 'User');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);

        navigate('/employee-portal');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Invalid Email or Password');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // REGISTER
  // ============================================
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // ---- Validation ----
    if (!fullName || !email || !password || !confirmPassword || !contact || !department || !position) {
      setError('Please fill all required fields');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const capturedEmail = email;

    // 🛑 CRITICAL: tell AuthContext to IGNORE any onAuthStateChanged fires
    // until we're done writing Firestore docs. Without this, AuthContext
    // signs the user out mid-write and the UI hangs forever.
    if (window.__setHrRegistering) {
      window.__setHrRegistering(true);
    }

    try {
      // ---- 1. Create Firebase Auth account ----
      const userCredential = await register(email, password);
      const user = userCredential.user;

      const now = new Date().toISOString();
      const today = now.split('T')[0];

      // ---- 2. Fire ALL Firestore writes IN PARALLEL (fast!) ----
      await Promise.all([
        setDoc(doc(db, 'users', user.uid), {
          name: fullName,
          email: email,
          role: 'Employee',
          contact: contact,
          department: department,
          position: position,
          uid: user.uid,
          status: 'Pending Approval',
          createdAt: now,
        }),

        setDoc(doc(db, 'employees', user.uid), {
          fullName: fullName,
          email: email,
          department: department,
          position: position,
          contact: contact,
          employmentStatus: 'Pending Approval',
          status: 'Pending Approval',
          dateHired: today,
          salary: 0,
          createdAt: now,
        }),

        setDoc(doc(db, 'leaveBalances', user.uid), {
          employeeId: user.uid,
          vacationLeave: 15,
          sickLeave: 15,
          createdAt: now,
        }),

        addDoc(collection(db, 'notifications'), {
          type: 'new_registration',
          employeeId: user.uid,
          employeeName: fullName,
          employeeEmail: email,
          department: department,
          position: position,
          message: `${fullName} (${department}) registered and is awaiting approval.`,
          read: false,
          forAdmin: true,
          forEmployee: false,
          createdAt: now,
          priority: 'high',
          category: 'registration_approval',
        }),
      ]);

      console.log('✅ All Firestore writes complete');

      // ---- 3. Fire-and-forget email (never blocks UI) ----
      sendAdminRegistrationEmail({
        employeeName: fullName,
        employeeEmail: email,
        employeeDepartment: department,
        employeePosition: position,
      }).then((res) => {
        if (res.success) {
          console.log('✅ Admin notified by email');
        } else {
          console.warn('⚠️ Admin email not sent:', res.error || res.reason);
        }
      });

      // ---- 4. Show success UI IMMEDIATELY (before signOut) ----
      setIsRegistered(true);
      setSuccess(
        'Registration successful! Your account is pending approval by HR. You will receive an email once approved.'
      );

      // Clear form
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setContact('');
      setDepartment('');
      setPosition('');

      // Auto-return to login after 6 seconds
      setTimeout(() => {
        setIsRegistered(false);
        setIsLogin(true);
        setSuccess('');
        setEmail(capturedEmail); // convenience prefill
      }, 6000);

      // ---- 5. Unlock the form (user sees success screen NOW) ----
      setLoading(false);

      // ---- 6. Background: sign out + clear local state ----
      signOut(auth)
        .then(() => {
          console.log('✅ Signed out (post-registration)');
        })
        .catch((err) => console.warn('Sign out warning:', err))
        .finally(() => {
          // ✅ Now it's safe to un-flag AuthContext
          if (window.__setHrRegistering) {
            window.__setHrRegistering(false);
          }
        });

      // Clear localStorage immediately
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');

    } catch (err) {
      console.error('Registration error:', err);

      // ✅ ALWAYS un-flag on error, or the app stays frozen
      if (window.__setHrRegistering) {
        window.__setHrRegistering(false);
      }

      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Please login.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError('Registration failed: ' + (err.message || 'Unknown error'));
      }
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="login-container-split">
      {/* Left Side - Cover Image */}
      <div className="login-cover">
        <div className="cover-content">
          <img src={coverImage} alt="Cover" className="cover-image" />
          <div className="cover-overlay">
            <h1>Human Resource Management Office</h1>
            <p>Pagbilao, Quezon LGU</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login/Register Form */}
      <div className="login-form-container">
        <div className="login-card-split">
          <div className="login-header">
            <div className="login-logos">
              <img src={logoLeft} alt="LGU Logo" className="login-logo" />
              <img src={logoRight} alt="Pagbilao Logo" className="login-logo" />
            </div>
            <div className="login-title">
              <h1>{isLogin ? 'Welcome Back!' : 'Create Employee Account'}</h1>
              <p>{isLogin ? 'Sign in to your HR account' : 'Register as a new employee'}</p>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {success && (
            <div
              className="success-message"
              style={{
                background: isRegistered ? '#d4edda' : '#e4f5e9',
                color: isRegistered ? '#155724' : '#27ae60',
                border: isRegistered ? '1px solid #c3e6cb' : '1px solid #b8e6c9',
                padding: '15px 20px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              {success}
            </div>
          )}

          {isRegistered && (
            <div
              style={{
                background: '#fff3cd',
                color: '#856404',
                padding: '15px 20px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'center',
                border: '1px solid #ffeaa7',
              }}
            >
              <p style={{ margin: 0, fontWeight: 'bold' }}>⏳ Account Pending Approval</p>
              <p style={{ margin: '5px 0 0', fontSize: '14px' }}>
                Your account has been created but is awaiting HR approval.
                You will receive an email once approved.
              </p>
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            {!isLogin && !isRegistered && (
              <>
                <div className="input-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Contact Number *</label>
                  <input
                    type="text"
                    placeholder="Enter your contact number"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Department *</label>
                  <input
                    type="text"
                    placeholder="Enter your department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Position *</label>
                  <input
                    type="text"
                    placeholder="Enter your position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {!isRegistered && (
              <>
                <div className="input-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group password-group">
                  <label>Password *</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={
                        isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <VisibilityOffIcon sx={{ color: '#888', fontSize: 24 }} />
                      ) : (
                        <VisibilityIcon sx={{ color: '#888', fontSize: 24 }} />
                      )}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="input-group">
                    <label>Confirm Password *</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button type="submit" disabled={loading || isRegistered} className="login-btn">
                  {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </>
            )}

            {isLogin && !isRegistered && (
              <div
                style={{
                  textAlign: 'right',
                  marginBottom: '15px',
                  marginTop: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4a6fa5',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'underline',
                    padding: '0',
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {isRegistered && (
              <button
                type="button"
                className="login-btn"
                onClick={() => {
                  setIsRegistered(false);
                  setIsLogin(true);
                  setSuccess('');
                  setError('');
                }}
                style={{ background: '#4a6fa5' }}
              >
                Go to Login
              </button>
            )}
          </form>

          {!isRegistered && (
            <div className="toggle-auth">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                  setFullName('');
                  setContact('');
                  setDepartment('');
                  setPosition('');
                  setConfirmPassword('');
                  setIsRegistered(false);
                }}
                className="toggle-btn"
              >
                {isLogin
                  ? "Don't have an account? Register here"
                  : 'Already have an account? Login here'}
              </button>
            </div>
          )}

          {isLogin && !isRegistered && (
            <div className="demo-credentials">
              <p>
                <strong>©2026 – HRMO Pagbilao, Quezon, Philippines</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;