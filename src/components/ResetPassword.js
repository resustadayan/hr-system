// src/components/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import logoLeft from '../assets/pagbilogo.jpg';
import logoRight from '../assets/hrmo logo.jpg';
import coverImage from '../assets/pagbi_bg.jpg';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState('');
  const [validCode, setValidCode] = useState(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('oobCode');
    
    if (code) {
      setOobCode(code);
      verifyPasswordResetCode(auth, code)
        .then((email) => {
          setEmail(email);
          setValidCode(true);
        })
        .catch((err) => {
          console.error('Invalid reset code:', err);
          setError('Invalid or expired reset link. Please request a new one.');
        });
    } else {
      setError('No reset code found. Please request a new password reset.');
    }
  }, [location]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess('Password reset successfully! You can now login.');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Failed to reset password. Please try again or request a new link.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundImage: `url(${coverImage})`,
      backgroundSize: '800px 800px',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Dark Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1
      }} />
      
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '480px',
        padding: '40px',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Logos */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <img src={logoLeft} alt="LGU Logo" style={{ height: '60px', width: 'auto' }} />
          <img src={logoRight} alt="Pagbilao Logo" style={{ height: '60px', width: 'auto' }} />
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#2d3748',
            marginBottom: '8px'
          }}>
            Reset Password
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#718096',
            margin: 0
          }}>
            {email ? `Resetting for: ${email}` : 'Create new password'}
          </p>
        </div>

        {/* Error & Success Messages */}
        {error && (
          <div style={{
            background: '#fed7d7',
            color: '#9b2c2c',
            border: '1px solid #feb2b2',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{
            background: '#c6f6d5',
            color: '#22543d',
            border: '1px solid #9ae6b4',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {validCode ? (
          // Password Reset Form
          <form onSubmit={handleResetPassword}>
            {/* New Password Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '14px'
              }}>
                New Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{
                    padding: '12px 16px',
                    paddingRight: '45px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4a6fa5'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                <button 
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#a0aec0',
                    fontSize: '18px',
                    padding: '5px'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <small style={{
                display: 'block',
                marginTop: '5px',
                color: '#718096',
                fontSize: '12px'
              }}>
                Password must be at least 6 characters
              </small>
            </div>

            {/* Confirm Password Field */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '14px'
              }}>
                Confirm New Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4a6fa5'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Reset Button */}
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#a0aec0' : 'linear-gradient(135deg, #4a6fa5 0%, #6b8cae 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                marginBottom: '20px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 20px rgba(74, 111, 165, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          // Invalid/Expired Link Message
          <div style={{
            textAlign: 'center',
            padding: '30px 20px'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              🔗
            </div>
            <h3 style={{
              color: '#2d3748',
              marginBottom: '10px'
            }}>
              Invalid or Expired Link
            </h3>
            <p style={{
              color: '#718096',
              marginBottom: '25px',
              fontSize: '14px'
            }}>
              {error || 'The password reset link is invalid or has expired.'}
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              style={{
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #4a6fa5 0%, #6b8cae 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                width: 'auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(74, 111, 165, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Request New Link
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          marginTop: '20px'
        }}>
          <button
            onClick={handleBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a6fa5',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline',
              padding: '5px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.target.style.color = '#2a4f85'}
            onMouseLeave={(e) => e.target.style.color = '#4a6fa5'}
          >
            ← Back to Login
          </button>

          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'none',
              border: 'none',
              color: '#718096',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '5px'
            }}
            onMouseEnter={(e) => e.target.style.color = '#2d3748'}
            onMouseLeave={(e) => e.target.style.color = '#718096'}
          >
            Don't have an account? Register here
          </button>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <p style={{
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '14px',
            color: '#2d3748',
            marginBottom: '5px'
          }}>
            ©2026 – HRMO Pagbilao, Quezon, Philippines
          </p>
          <p style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#a0aec0',
            margin: 0
          }}>
            Enter your new password to reset your account
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;