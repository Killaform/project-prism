import React, { createContext, useState, useEffect, useCallback } from 'react';
import { parseJwt, isTokenExpired, verifyToken } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('perspectiveEngineToken'));

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('perspectiveEngineToken');
      const storedUser = localStorage.getItem('perspectiveEngineUser');
      
      if (storedToken && !isTokenExpired(storedToken)) {
        setToken(storedToken);
        
        // Verify token with backend
        const verifiedUser = await verifyToken(storedToken);
        
        if (verifiedUser) {
          setCurrentUser(verifiedUser);
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('perspectiveEngineToken');
          localStorage.removeItem('perspectiveEngineUser');
          setCurrentUser(null);
          setToken(null);
        }
      } else if (storedToken) {
        // Token exists but is expired
        localStorage.removeItem('perspectiveEngineToken');
        localStorage.removeItem('perspectiveEngineUser');
        setCurrentUser(null);
        setToken(null);
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);
  
  const login = useCallback((userData, authToken) => {
    console.log("AuthContext: Logging in user:", userData, "Token:", authToken ? authToken.substring(0,10) + "..." : "No Token");
    setCurrentUser(userData);
    setToken(authToken);
    localStorage.setItem('perspectiveEngineToken', authToken);
    localStorage.setItem('perspectiveEngineUser', JSON.stringify(userData)); 
  }, []);

  const logout = useCallback(async () => {
    console.log("AuthContext: Logging out user");
    
    // Call logout endpoint if we have a token
    if (token) {
      try {
        const { logoutUser } = await import('../services/auth');
        await logoutUser(token);
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }
    
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('perspectiveEngineToken');
    localStorage.removeItem('perspectiveEngineUser');
  }, [token]);
  
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