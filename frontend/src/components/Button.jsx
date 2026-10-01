import React from 'react';

export default function Button({ children, variant = 'primary', style, onClick, disabled }) {
  const baseStyle = {
    padding: '10px 24px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'Inter',
    border: 'none',
    opacity: disabled ? 0.6 : 1,
  };

  const variants = {
    primary: { backgroundColor: '#143910', color: '#FFFFFF' },
    secondary: { backgroundColor: '#98B910', color: '#143910' },
    tertiary: { backgroundColor: '#E5E7EB', color: '#111827' },
    danger: { backgroundColor: '#DC2626', color: '#FFFFFF' }, 
  };

  return (
    <button style={{ ...baseStyle, ...variants[variant], ...style }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}