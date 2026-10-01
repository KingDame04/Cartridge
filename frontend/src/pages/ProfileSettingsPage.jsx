import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import defaultAvatar from '../assets/Generic avatar.svg';

const ProfileSettingsPage = () => {
  const { token } = useContext(AuthContext);
  const currentToken = token || localStorage.getItem('token');
  const navigate = useNavigate();

  // User profile state
  const [initialUsername, setInitialUsername] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [newProfilePicture, setNewProfilePicture] = useState('');

  // Edit toggles for Username & Email
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  
  // Security fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Statuses
  const [pendingEmail, setPendingEmail] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [statusBanner, setStatusBanner] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Delete Account Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const debounceTimer = useRef(null);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me', currentToken);
      if (response.ok) {
        const data = await response.json();
        setUsername(data.username || '');
        setInitialUsername(data.username || '');
        setEmail(data.email || '');
        setBio(data.bio || '');
        setProfilePicture(data.profilePicture || '');
        setNewProfilePicture(data.profilePicture || '');
        
        if (data.pendingEmail) {
          setPendingEmail(data.pendingEmail);
          localStorage.setItem('pendingEmail', data.pendingEmail);
        } else {
          setPendingEmail(null);
          localStorage.removeItem('pendingEmail');
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  useEffect(() => {
    if (currentToken) {
      fetchProfile();
    }
  }, [currentToken]);

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!value.trim()) {
      setUsernameStatus('');
      return;
    }

    if (value.trim().toLowerCase() === initialUsername.toLowerCase()) {
      setUsernameStatus('');
      return;
    }

    setUsernameStatus('Checking availability...');

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await api.get(`/auth/checkUsername?username=${encodeURIComponent(value)}`, currentToken);
        const data = await response.json();
        
        if (data.available) {
          setUsernameStatus('✓ Username is available');
        } else {
          setUsernameStatus('❌ Username is already taken');
        }
      } catch (err) {
        setUsernameStatus('');
      }
    }, 350);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    if (!value.trim()) {
      setEmailStatus('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value.trim())) {
      setEmailStatus('✓ Valid email format');
    } else {
      setEmailStatus('❌ Invalid email format');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatusBanner({ type: '', text: '' });

    if (isEditingUsername && usernameStatus.includes('❌')) {
      setStatusBanner({ type: 'error', text: 'Please choose an available username before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isEditingEmail && emailStatus.includes('❌')) {
      setStatusBanner({ type: 'error', text: 'Please enter a valid email address before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const accountPayload = {};
    if (isEditingUsername && username !== initialUsername) {
      accountPayload.newUsername = username;
    }
    if (isEditingEmail) {
      accountPayload.newEmail = email;
    }
    if (newPassword) {
      if (!currentPassword) {
        setStatusBanner({ type: 'error', text: 'Current password is required to change your password.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setStatusBanner({ type: 'error', text: 'New password and confirmation do not match.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}[\]:;"'<>,.?/\\|`~]).{8,14}$/;
      if (!passwordRegex.test(newPassword)) {
        setStatusBanner({ type: 'error', text: 'New password must be 8-14 characters, with 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      accountPayload.currentPassword = currentPassword;
      accountPayload.newPassword = newPassword;
      accountPayload.confirmNewPassword = confirmNewPassword;
    }

    const profilePayload = {
      newBio: bio,
      newProfilePicture: newProfilePicture
    };

    try {
      setIsSaving(true);

      let accountSuccess = true;
      let accountData = {};

      if (Object.keys(accountPayload).length > 0) {
        const accResponse = await api.put('/auth/account', accountPayload, currentToken);
        accountData = await accResponse.json();
        if (!accResponse.ok) {
          accountSuccess = false;
          setStatusBanner({ type: 'error', text: accountData.message || 'Failed to update account settings.' });
        }
      }

      const profResponse = await api.put('/auth/profile', profilePayload, currentToken);
      const profData = await profResponse.json();

      if (!profResponse.ok) {
        accountSuccess = false;
        setStatusBanner({ type: 'error', text: profData.message || 'Failed to update profile.' });
      }

      if (accountSuccess) {
        if (accountData.pendingEmail) {
          localStorage.setItem('pendingEmail', accountData.pendingEmail);
        }

        window.location.reload();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setStatusBanner({ type: 'error', text: 'Network error. Please try again.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {}, currentToken);
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      localStorage.clear();
      navigate('/');
    }
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('Password is required to delete your account.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');

      const response = await api.delete('/auth/account', currentToken, { currentPassword: deletePassword });
      const data = await response.json();

      if (response.ok) {
        localStorage.clear();
        navigate('/');
      } else {
        setDeleteError(data.message || 'Could not process deletion request at this time.');
      }
    } catch (err) {
      setDeleteError('Network error trying to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto', paddingBottom: '50px', boxSizing: 'border-box' }}>
        
        <h1 className="font-vt323" style={{ fontSize: '48px', color: '#143910', margin: '0 0 30px 0', fontWeight: '700' }}>Account Settings</h1>
        
        {statusBanner.text && (
          <div style={{ padding: '14px 18px', borderRadius: '8px', marginBottom: '30px', fontWeight: '500', backgroundColor: statusBanner.type === 'success' ? '#d1fae5' : '#fee2e2', color: statusBanner.type === 'success' ? '#065f46' : '#991b1b' }}>
            {statusBanner.type === 'success' ? '✓ ' : '❌ '}{statusBanner.text}
          </div>
        )}
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Profile Picture Header Display Only */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '30px' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#98B910', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              <img 
                src={profilePicture || newProfilePicture || defaultAvatar} 
                alt="Profile Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.src = defaultAvatar; }}
              />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '20px' }}>
                {username || 'User Profile'}
              </h3>
            </div>
          </div>

          {/* Username Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Username</label>
              <button 
                type="button" 
                onClick={() => setIsEditingUsername(!isEditingUsername)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                {isEditingUsername ? 'Cancel' : 'Change'}
              </button>
            </div>
            <input 
              type="text" 
              value={username} 
              onChange={handleUsernameChange}
              disabled={!isEditingUsername}
              required
              style={{ 
                width: '100%', padding: '10px 14px', borderRadius: '8px', 
                border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                backgroundColor: isEditingUsername ? '#ffffff' : '#f1f5f9',
                color: isEditingUsername ? '#0f172a' : '#64748b',
                cursor: isEditingUsername ? 'text' : 'not-allowed'
              }}
            />
            {isEditingUsername && usernameStatus && (
              <span style={{ fontSize: '13px', fontWeight: '500', color: usernameStatus.includes('❌') ? '#ef4444' : usernameStatus.includes('✓') ? '#10b981' : '#64748b' }}>
                {usernameStatus}
              </span>
            )}
          </div>

          {/* Email Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Email Address</label>
              <button 
                type="button" 
                onClick={() => setIsEditingEmail(!isEditingEmail)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                {isEditingEmail ? 'Cancel' : 'Change'}
              </button>
            </div>
            <input 
              type="email" 
              value={isEditingEmail ? email : (pendingEmail || email)} 
              onChange={handleEmailChange}
              disabled={!isEditingEmail}
              required
              style={{ 
                width: '100%', padding: '10px 14px', borderRadius: '8px', 
                border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                backgroundColor: isEditingEmail ? '#ffffff' : '#f1f5f9',
                color: isEditingEmail ? '#0f172a' : '#64748b',
                cursor: isEditingEmail ? 'text' : 'not-allowed'
              }}
            />
            {isEditingEmail && emailStatus && (
              <span style={{ fontSize: '13px', fontWeight: '500', color: emailStatus.includes('❌') ? '#ef4444' : '#10b981' }}>
                {emailStatus}
              </span>
            )}
            <span style={{ fontSize: '12px', color: pendingEmail ? '#d97706' : '#64748b', fontStyle: 'italic', fontWeight: pendingEmail ? '600' : 'normal' }}>
              {pendingEmail 
                ? `⚠️ Unconfirmed email: ${pendingEmail}. Please check your inbox to confirm your new email address.` 
                : 'Note: If you change your email address, you will be required to re-confirm your new inbox via a verification link before it fully updates.'
              }
            </span>
          </div>

          {/* Bio Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Bio</label>
            <textarea 
              rows="3"
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a little bit about yourself or your gaming preferences..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {/* Profile Picture URL Field (Placed after Bio) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Profile Picture URL</label>
            <input 
              type="url" 
              placeholder="https://example.com/avatar.jpg"
              value={newProfilePicture}
              onChange={(e) => setNewProfilePicture(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '12px', color: '#64748b' }}>Provide a direct image URL to update your profile avatar across the site.</span>
          </div>

          {/* Password Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Change Password</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Current Password</label>
              <input 
                type="password" 
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>8-14 chars, 1 lower/uppercase, 1 number, 1 special</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
              {/* Only judge a match once both sides have something to compare —
                  otherwise every fresh keystroke in an empty confirm field
                  would flash a false "doesn't match" before it can catch up. */}
              {newPassword && confirmNewPassword && (
                <span style={{ fontSize: '13px', fontWeight: '500', color: newPassword === confirmNewPassword ? '#10b981' : '#ef4444' }}>
                  {newPassword === confirmNewPassword ? '✓ Passwords match' : '❌ Passwords do not match'}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '30px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button 
              type="submit" 
              disabled={isSaving}
              style={{ padding: '12px 28px', backgroundColor: '#143910', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>

            <button 
              type="button" 
              onClick={handleLogout} 
              style={{ padding: '12px 24px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}
            >
              Logout
            </button>

            <button 
              type="button" 
              onClick={() => { setIsDeleteModalOpen(true); setDeletePassword(''); setDeleteError(''); }} 
              style={{ padding: '12px 24px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', marginLeft: 'auto' }}
            >
              Delete Account
            </button>
          </div>

        </form>
      </div>

      {/* Custom Delete Account Modal Popup */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', maxWidth: '420px', width: '100%', border: '2px solid #ef4444', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#991b1b', fontSize: '22px' }}>Delete Account</h2>
            <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
              Warning: This action is permanent and cannot be undone. Please enter your current password to confirm account deletion.
            </p>

            {deleteError && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                {deleteError}
              </div>
            )}

            <form onSubmit={handleConfirmDelete} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Current Password</label>
                <input 
                  type="password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  style={{ padding: '10px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  style={{ padding: '10px 16px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.7 : 1 }}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProfileSettingsPage;