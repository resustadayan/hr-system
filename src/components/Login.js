// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import logoLeft from '../assets/pagbilogo.jpg';
import logoRight from '../assets/hrmo logo.jpg';
import coverImage from '../assets/pagbi_bg (1).jpg';

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

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);

        switch(role) {
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
        // User exists in Auth but not in Firestore
        // Create a basic user document
        await setDoc(doc(db, 'users', user.uid), {
          name: user.email?.split('@')[0] || 'User',
          email: user.email,
          role: 'Employee',
          uid: user.uid,
          createdAt: new Date().toISOString()
        });

        // Create employee document
        await setDoc(doc(db, 'employees', user.uid), {
          fullName: user.email?.split('@')[0] || 'User',
          email: user.email,
          department: 'Unassigned',
          position: 'Unassigned',
          employmentStatus: 'Active',
          dateHired: new Date().toISOString().split('T')[0],
          salary: 0,
          createdAt: new Date().toISOString()
        });

        // Create leave balance
        await setDoc(doc(db, 'leaveBalances', user.uid), {
          employeeId: user.uid,
          vacationLeave: 15,
          sickLeave: 15
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
      } else if (err.code === 'auth/wrong-password') {
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
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

    try {
      const userCredential = await register(email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name: fullName,
        email: email,
        role: 'Employee',
        contact: contact,
        department: department,
        position: position,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        status: 'Pending Approval' // Add status for HR to approve
      });

      await setDoc(doc(db, 'employees', user.uid), {
        fullName: fullName,
        email: email,
        department: department,
        position: position,
        contact: contact,
        employmentStatus: 'Pending Approval',
        dateHired: new Date().toISOString().split('T')[0],
        salary: 0,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'leaveBalances', user.uid), {
        employeeId: user.uid,
        vacationLeave: 15,
        sickLeave: 15
      });

      // DON'T set localStorage - user should NOT be logged in yet
      // DON'T navigate - stay on login page

      setIsRegistered(true);
      setSuccess('Registration successful! Your account is pending approval by HR. You will be notified once approved.');

      // Clear form fields
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setContact('');
      setDepartment('');
      setPosition('');

      // Switch back to login after 5 seconds
      setTimeout(() => {
        setIsRegistered(false);
        setIsLogin(true);
        setSuccess('');
        // Pre-fill email for convenience
        setEmail(email);
      }, 5000);

    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Please login.');
      } else {
        setError('Registration failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
          {success && <div className="success-message" style={{ 
            background: isRegistered ? '#d4edda' : '#e4f5e9',
            color: isRegistered ? '#155724' : '#27ae60',
            border: isRegistered ? '1px solid #c3e6cb' : '1px solid #b8e6c9',
            padding: '15px 20px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {success}
          </div>}

          {/* Show a message if account is pending approval */}
          {isRegistered && (
            <div style={{
              background: '#fff3cd',
              color: '#856404',
              padding: '15px 20px',
              borderRadius: '10px',
              marginBottom: '20px',
              textAlign: 'center',
              border: '1px solid #ffeaa7'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Account Pending Approval</p>
              <p style={{ margin: '5px 0 0', fontSize: '14px' }}>
                Your account has been created but is awaiting HR approval.
                You will be able to login once approved.
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
                    disabled={isRegistered}
                  />
                </div>

                <div className="input-group password-group">
                  <label>Password *</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isRegistered}
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      aria-label="Toggle password visibility"
                      disabled={isRegistered}
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
                      disabled={isRegistered}
                    />
                  </div>
                )}

                <button type="submit" disabled={loading || isRegistered} className="login-btn">
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </>
            )}

           {/* Forgot Password button &*/}
            {isLogin && !isRegistered && (
              <div style={{
                textAlign: 'right',
                marginBottom: '15px',
                marginTop: '20px'
              }}>
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
                  padding: '0'
                }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Show a "Go to Login" button after registration */}
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
                {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
              </button>
            </div>
          )}

          {isLogin && !isRegistered && (
            <div className="demo-credentials">
              <p><strong>©2026 – HRMO Pagbilao, Quezon, Philippines</strong></p>
              {/* <p>HR Admin: admin@pagbilao.gov.ph / admin123</p>
              <p>MGDH: mgdh@pagbilao.gov.ph / mgdh123</p> */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;