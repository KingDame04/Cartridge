import React from 'react';
import { Navigate } from 'react-router-dom';

// Guards routes that require a logged-in user. Checks localStorage directly
// (rather than AuthContext's token state) so there's no race against
// AuthContext's own startup effect — that state starts null for a moment
// on every load, even for an already-logged-in user, while it reads
// localStorage for the first time.
export default function ProtectedRoute({ children }) {
  const hasToken = !!localStorage.getItem('token');

  if (!hasToken) {
    return <Navigate to="/" replace />;
  }

  return children;
}
