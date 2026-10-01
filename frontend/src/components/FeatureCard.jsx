import React from 'react';

export default function FeatureCard({ title, children }) {
  return (
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      padding: '40px 32px', 
      borderRadius: '8px', 
      width: '100%', 
      maxWidth: '350px', 
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <h3 style={{ 
        fontSize: '22px', 
        fontWeight: '700', 
        color: '#111827' 
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: '16px', 
        color: '#4B5563', 
        lineHeight: '1.5' 
      }}>
        {children}
      </p>
    </div>
  );
}