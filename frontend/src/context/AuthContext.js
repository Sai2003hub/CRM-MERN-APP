import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const isAuthenticated = !!token;


  const isSuperAdmin = user?.role === 'superadmin';


  const hasOrg = !!user?.organizationId;

  const loginUser = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logoutUser = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAuthenticated,
      isSuperAdmin,
      hasOrg,
      loginUser,
      logoutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};