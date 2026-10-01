import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api'; // Adjust this path if your api.js is located elsewhere

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    const verifyToken = async () => {
      try {
        // Calls the backend endpoint to validate the token
        const response = await api.get(`/auth/verifyEmail?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully! Welcome to CARTRIDGE.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('A network error occurred while verifying your email.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#143910', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
      <div style={{ backgroundColor: '#1b3b1a', padding: '40px', borderRadius: '12px', border: '2px solid #98B910', textAlign: 'center', maxWidth: '800px', width: '100%' }}>
        <div  className="font-pixel" style={{ 
        color: '#98B910', 
        fontSize: '32px', 
        textShadow: '3px 3px 0px #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' 
      }}>
          EMAIL VERIFIED: WELCOME GAMER

        </div>
        

        {status !== 'loading' && (
          <Link to="/?openModal=login" style={{ backgroundColor: '#98B910', color: '#143910', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}