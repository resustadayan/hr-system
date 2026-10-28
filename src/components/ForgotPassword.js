// src/components/ForgotPassword.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import logoLeft from '../assets/pagbilogo.jpg';
import logoRight from '../assets/hrmo logo.jpg';
import coverImage from '../assets/pagbi_bg.jpg';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // ✅ FIXED: Removed handleCodeInApp. This is for web apps, not mobile.
      // The 'url' tells Firebase where to redirect the user after they click the email link.
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/reset-password',
      });

      setSuccess('Password reset link sent! Please check your email.');
      setEmail('');
      
    } catch (err) {
      console.error('Password reset error:', err);
      
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address. Please register first.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/too-many-requests':
          setError('Too many requests. Please try again later.');
          break;
        case 'auth/unauthorized-continue-uri':
          setError('Error: Domain not authorized in Firebase settings.');
          break;
        default:
          // ✅ Added err.code here so you can see exactly what is failing if it happens again
          setError(`Failed to send reset email. (${err.code})`);
      }
    } finally {
      setLoading(false);
    }
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
      backgroundSize: '100% 100%',
      backgroundPosition: 'center center',
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
            We'll send you a link to reset your password
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

        {/* Email Form */}
        <form onSubmit={handleSendResetEmail}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '14px'
            }}>
              Email Address *
            </label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
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

          {/* Send Reset Link Button */}
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
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Navigation Links */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center'
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
            Enter your registered email to receive a password reset link
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;