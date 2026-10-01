import React from 'react';
import Button from './Button';
import cartridgeLogo from '../assets/CARTRIDGE.svg';

export default function Navbar({ onOpenLogin, onOpenRegister }) {
  return (
    <nav style={{ 
      backgroundColor: '#143910', 
      padding: '24px 48px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
        <img 
          src={cartridgeLogo} 
          alt="CARTRIDGE" 
          style={{ height: '60px', width: 'auto', display: 'block' }} 
        />
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Button variant="tertiary" onClick={onOpenLogin}>Sign in</Button>
        <Button variant="secondary" onClick={onOpenRegister}>Register</Button>
      </div>
    </nav>
  );
}