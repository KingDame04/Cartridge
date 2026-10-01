import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      setError('Please fill out all fields.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do NOT match!');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}[\]:;"'<>,.?/\\|`~]).{8,14}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be 8-14 characters, with 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post(`/auth/resetPassword?token=${token}`, {
        newPassword,
        confirmNewPassword
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password.');
      }

      setSuccess(data.message || 'Password updated successfully! You may now sign in.');
      setTimeout(() => {
        navigate('/?openModal=login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Server error during password update.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = { padding: '12px', borderRadius: '8px', border: '2px solid #98B910', backgroundColor: '#E8F5E9', color: '#0F380F', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' };
  const labelStyle = { color: '#143910', fontSize: '14px', marginBottom: '4px', display: 'block', fontWeight: '700' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px' }}>
      
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '16px', maxWidth: '440px', width: '100%', border: '2px solid #143910', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h1 className="font-vt323" style={{ fontSize: '38px', color: '#143910', margin: '0 0 10px 0', textAlign: 'center' }}>Set New Password</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', margin: '0 0 24px 0' }}>
          Please enter your new password below.
        </p>

        {!token ? (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '14px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>
            ❌ Missing reset token. Please request a new password reset link.
          </div>
        ) : (
          <>
            {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>{error}</div>}
            {success && <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '13px', fontWeight: '700' }}>{success}</div>}

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Enter new password"
                  style={inputStyle} 
                  required 
                />
                <span style={{color: '#6b7280', fontSize: '11px', marginTop: '4px', display: 'block'}}>8-14 chars, 1 lower/uppercase, 1 number, 1 special</span>
              </div>

              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmNewPassword} 
                  onChange={(e) => setConfirmNewPassword(e.target.value)} 
                  placeholder="Confirm new password"
                  style={inputStyle} 
                  required 
                />
              </div>

              <div>
                <label style={{ color: '#334155', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                  Show Passwords
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                style={{ backgroundColor: '#143910', color: '#ffffff', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '10px', fontSize: '15px', opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}