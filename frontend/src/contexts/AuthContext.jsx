import React, { createContext, useState, useEffect, useCallback } from 'react';
import { parseJwt, isTokenExpired } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Check for token in localStorage
    const storedToken = localStorage.getItem('perspectiveEngineToken');
    const storedUser = localStorage.getItem('perspectiveEngineUser');
    
    if (storedToken && !isTokenExpired(storedToken)) {
      setToken(storedToken);
      try {
        const userData = storedUser ? JSON.parse(storedUser) : parseJwt(storedToken);
        setCurrentUser(userData);
      } catch (e) {
        console.error("Error parsing user data", e);
        localStorage.removeItem('perspectiveEngineToken');
        localStorage.removeItem('perspectiveEngineUser');
      }
    } else if (storedToken) {
      // Token expired, remove it
      localStorage.removeItem('perspectiveEngineToken');
      localStorage.removeItem('perspectiveEngineUser');
    }
    
    setLoading(false);
  }, []);
  
  // Login handler
  const login = useCallback((userData, authToken) => {
    setCurrentUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }, []);
  
  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      token,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};