import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    const storedEmail = localStorage.getItem('email');

    if (storedToken && storedUserId && storedEmail) {
      setToken(storedToken);
      setUserId(storedUserId);
      setEmail(storedEmail);
    }
    setIsLoading(false);
  }, []);

  const login = (newToken, newUserId, newEmail) => {
    setToken(newToken);
    setUserId(newUserId);
    setEmail(newEmail);

    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', newUserId);
    localStorage.setItem('email', newEmail);
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    setEmail(null);

    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
  };

  return (
    <AuthContext.Provider value={{
      token,
      userId,
      email,
      isLoggedIn: !!token,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};