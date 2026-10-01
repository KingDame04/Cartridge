import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FeatureCard from '../components/FeatureCard';
import Button from '../components/Button';
import AuthModal from '../components/AuthModal';

export default function LandingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login'); 

  // 🟢 Automatically open modal if ?openModal=login is in the URL
  useEffect(() => {
    const modalParam = searchParams.get('openModal');
    if (modalParam === 'login') {
      setModalMode('login');
      setIsModalOpen(true);
      // Clean up the URL parameter so refreshing doesn't keep reopening it
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const openLogin = () => {
    setModalMode('login');
    setIsModalOpen(true);
  };

  const openRegister = () => {
    setModalMode('register');
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenLogin={openLogin} onOpenRegister={openRegister} />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <section style={{ 
          backgroundColor: '#98B910', 
          padding: '100px 24px', 
          textAlign: 'center',
          borderBottom: '4px solid #000'
        }}>
          <h1 className="font-pixel" style={{ fontSize: '36px', color: '#143910', marginBottom: '32px', lineHeight: '1.5', maxWidth: '900px', margin: '0 auto 32px' }}>
            Your gaming library,<br/>all in one place.
          </h1>
          <p style={{ fontSize: '20px', color: '#143910', marginBottom: '48px', maxWidth: '700px', margin: '0 auto 48px', fontWeight: '600' }}>
            Build your personal game library, organize custom lists, and write reviews.
          </p>
          <Button 
            variant="primary" 
            style={{ padding: '16px 48px', fontSize: '18px', borderRadius: '6px' }}
            onClick={openRegister} 
          >
            Get Started
          </Button>
        </section>

        <section style={{ backgroundColor: '#143910', padding: '80px 48px', display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', flex: 1 }}>
          <FeatureCard title="Track Your Library">
            Organize your games into custom lists like <i>Played</i>, <i>Backlog</i>, or <i>Favorites</i>.
          </FeatureCard>
          <FeatureCard title="Review Games">
            Rate games, write reviews, and keep track of your gaming experiences.
          </FeatureCard>
          <FeatureCard title="Discover New Games">
            Search a vast game database and find your next favorite title.
          </FeatureCard>
        </section>
      </main>

      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialMode={modalMode}
      />
    </div>
  );
}