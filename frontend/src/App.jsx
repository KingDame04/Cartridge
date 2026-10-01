import React from 'react';
import { AuthProvider } from './context/AuthContext';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ListView from './pages/ListViewPage';
import GameSearchPage from './pages/GameSearchPage';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmail from './pages/VerifyEmail';
import CollectionPage from './pages/CollectionPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

          <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
          <Route path="/lists" element={<ProtectedRoute><ListView /></ProtectedRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/profile" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}