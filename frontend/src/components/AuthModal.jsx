import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useContext(AuthContext); 
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setIsLoginMode(initialMode === 'login');
      setIsForgotPasswordMode(false);
      setError('');
      setSuccess('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleClose = () => {
    setError('');
    setSuccess('');
    setUsername('');
    setEmail('');
    setConfirmEmail('');
    setPassword('');
    setConfirmPassword('');
    setRememberMe(false);
    setShowPassword(false);
    setIsForgotPasswordMode(false);
    onClose();
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setIsForgotPasswordMode(false);
    setError('');
    setSuccess('');
  };

  // Forgot-password mode is only ever entered from login mode, so returning
  // from it should land back on Sign In — not flip isLoginMode like
  // toggleMode does (that flip is what caused "Back to Sign In" to show the
  // registration form instead).
  const backToSignIn = () => {
    setIsLoginMode(true);
    setIsForgotPasswordMode(false);
    setError('');
    setSuccess('');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (isForgotPasswordMode) {
        if (!email) {
          throw new Error("Please enter your email address.");
        }

        const response = await api.post('/auth/forgotPassword', { email });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to send password reset link.');
        }

        setSuccess(data.message || 'Password reset email sent! Check your inbox.');
        setIsSubmitting(false);
        return;
      }

      if (isLoginMode) {
        if (!email || !password) {
          throw new Error("Please fill out both email and password.");
        }
        
        const response = await api.post('/auth/login', { email, password });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed from backend.');
        }
        
        login(data.token, data.user.id, email);
        
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        handleClose();
        navigate('/dashboard');

      } else {
        if (!username || !email || !confirmEmail || !password || !confirmPassword) {
          throw new Error("Please fill out all 5 fields.");
        }
        if (email !== confirmEmail) {
          throw new Error("Emails do not match.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}[\]:;"'<>,.?/\\|`~]).{8,14}$/;
        if (!passwordRegex.test(password)) {
          throw new Error("Password must be 8-14 characters, with 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character.");
        }
        
        const response = await api.post('/auth/register', { username, email, password, confirmPassword });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Backend rejected the registration.');
        }

        setSuccess('Please check your email to confirm your account.');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setConfirmEmail('');
        setIsLoginMode(true);
      }
    } catch (err) {
      console.error("Auth Error:", err); 
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { padding: '12px', borderRadius: '8px', border: '2px solid #98B910', backgroundColor: '#E8F5E9', color: '#0F380F', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' };
  const labelStyle = { color: '#FFFFFF', fontSize: '14px', marginBottom: '4px', display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
      <div style={{ backgroundColor: '#1b3b1a', padding: '32px', borderRadius: '12px', width: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <h2 className="font-vt323" style={{ color: '#98B910', fontSize: '40px', marginBottom: '20px', textAlign: 'center', textShadow: '3px 3px 0px #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000'  }}>
          {isForgotPasswordMode ? 'Reset Password' : (isLoginMode ? 'Sign In' : 'Create Account')}
        </h2>

        {error && <div style={{ backgroundColor: '#ff4d4d', color: 'white', padding: '8px', borderRadius: '4px', marginBottom: '16px', textAlign: 'center', fontSize: '13px' }}>{error}</div>}
        {success && <div style={{ backgroundColor: '#98B910', color: '#143910', padding: '8px', borderRadius: '4px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>{success}</div>}

        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {!isLoginMode && !isForgotPasswordMode && (
            <div>
              <label style={labelStyle}>Username</label>
              <input type="text" placeholder='Enter your username' value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} required />
            </div>
          )}

          <div>
            <label style={labelStyle}>Email Address</label>
            <input type="email" placeholder='Enter your email' value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
          </div>

          {!isLoginMode && !isForgotPasswordMode && (
            <div>
              <label style={labelStyle}>Confirm Your Email</label>
              <input type="email" placeholder='Confirm your email' value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} style={inputStyle} required />
            </div>
          )}

          {!isForgotPasswordMode && (
            <>
              <div>
                <label style={labelStyle}>Password</label>
                <input type={showPassword ? "text" : "password"} placeholder='Enter your password' value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
                {!isLoginMode && <span style={{color: '#aaa', fontSize: '11px', display: 'block', marginTop: '4px'}}>8-14 chars, 1 lower/uppercase, 1 number, 1 special</span>}
              </div>

              {!isLoginMode && (
                 <div>
                   <label style={labelStyle}>Confirm Password</label>
                   <input type={showPassword ? "text" : "password"} placeholder='Confirm your password' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} required />
                 </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'white' }}>
                {isLoginMode && (
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                    Remember Me
                  </label>
                )}
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                  Show Password
                </label>
              </div>
            </>
          )}
          
          <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#e2e8f0', color: '#143910', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '8px', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Processing...' : (isForgotPasswordMode ? 'Send Reset Link' : (isLoginMode ? 'Sign In' : 'Register'))}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          {isLoginMode && !isForgotPasswordMode && (
            <button 
              type="button"
              onClick={() => { setIsForgotPasswordMode(true); setError(''); setSuccess(''); }} 
              style={{ background: 'none', border: 'none', color: '#98B910', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Forgot your password?
            </button>
          )}

          <button type="button" onClick={isForgotPasswordMode ? backToSignIn : toggleMode} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', width: '100%' }}>
            {isForgotPasswordMode ? 'Back to Sign In →' : (isLoginMode ? 'Need an account? Register here →' : 'Already have an account? Sign in here →')}
          </button>

          <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', color: '#8da825', width: '100%', marginTop: '8px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}