import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImage from '../assets/Menu & Fab.png';

export default function Sidebar() {
  const location = useLocation();

  const getNavStyle = (path) => {
    const isActive = location.pathname === path;
    return {
      backgroundColor: isActive ? '#98B910' : 'transparent',
      color: isActive ? '#143910' : '#FFFFFF',
      padding: '8px 40px',
      borderRadius: '20px',
      fontSize: '24px',
      cursor: 'pointer',
      letterSpacing: '1px',
      textDecoration: 'none',
      textAlign: 'center',
      width: '100%',
      boxSizing: 'border-box'
    };
  };

  return (
    <aside style={{ 
      width: '220px', 
      backgroundColor: '#7A7A7A', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '32px 0', 
      flexShrink: 0 
    }}>
      <img 
        src={logoImage} 
        alt="Cartridge Logo" 
        style={{ width: '80px', height: 'auto', marginBottom: '64px' }} 
      />

      <nav style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        alignItems: 'center',
        padding: '0 16px',
        boxSizing: 'border-box'
      }}>
        <Link to="/dashboard" className="font-vt323" style={getNavStyle('/dashboard')}>
          Home
        </Link>
        <Link to="/collection" className="font-vt323" style={getNavStyle('/collection')}>
          Collection
        </Link>
        <Link to="/lists" className="font-vt323" style={getNavStyle('/lists')}>
          Lists
        </Link>
      </nav>
    </aside>
  );
}