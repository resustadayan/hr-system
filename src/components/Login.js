// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../firebase';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import logoLeft from '../assets/pagbilogo.jpg';
import logoRight from '../assets/hrmo logo.jpg';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid Username or Password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logos">
            <img src={logoLeft} alt="LGU Logo" className="login-logo" />
            <div className="login-title">
              <h1>HR System</h1>
              <p>Pagbilao, Quezon LGU</p>
            </div>
            <img src={logoRight} alt="Pagbilao Logo" className="login-logo" />
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group password-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
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

          {error && <div className="error-message">❌ {error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="demo-credentials">
          <p>📋 Demo Credentials:</p>
          <p>Email: admin@pagbilao.gov.ph</p>
          <p>Password: admin123</p>
        </div>
      </div>
    </div>
  );
}

export default Login;