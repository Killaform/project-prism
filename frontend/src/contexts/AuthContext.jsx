import React, { createContext, useState, useEffect } from 'react';
import { parseJwt, isTokenExpired } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
  
  const login = (newToken, userData) => {
    setToken(newToken);
    setCurrentUser(userData);
    localStorage.setItem('perspectiveEngineToken', newToken);
    localStorage.setItem('perspectiveEngineUser', JSON.stringify(userData));
  };
  
  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('perspectiveEngineToken');
    localStorage.removeItem('perspectiveEngineUser');
  };
  
  return (
    <AuthContext.Provider value={{ 
      token, 
      currentUser, 
      login, 
      logout, 
      isAuthenticated: !!token,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};