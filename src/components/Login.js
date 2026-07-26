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
import coverImage from '../assets/pagbi_bg.jpg';

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
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'employees', user.uid), {
        fullName: fullName,
        email: email,
        department: department,
        position: position,
        contact: contact,
        employmentStatus: 'Active',
        dateHired: new Date().toISOString().split('T')[0],
        salary: 0,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'leaveBalances', user.uid), {
        employeeId: user.uid,
        vacationLeave: 15,
        sickLeave: 15
      });

      setSuccess('Account created successfully! Redirecting...');

      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'Employee');
      localStorage.setItem('userName', fullName);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userId', user.uid);

      setTimeout(() => {
        navigate('/employee-portal');
      }, 1500);

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
            <h1>HR System</h1>
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
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            {!isLogin && (
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
                  placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'}
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

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

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
              }}
              className="toggle-btn"
            >
              {isLogin ? "Don't have an account? Register here" : "Already have an account? Login here"}
            </button>
          </div>

          {isLogin && (
            <div className="demo-credentials">
              <p><strong>Demo Credentials:</strong></p>
              <p>👑 HR Admin: admin@pagbilao.gov.ph / admin123</p>
              <p>📋 MGDH: mgdh@pagbilao.gov.ph / mgdh123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;