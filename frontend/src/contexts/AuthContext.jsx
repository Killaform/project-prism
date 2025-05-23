import React, { createContext, useState, useEffect, useCallback } from 'react';
import { parseJwt, isTokenExpired } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('perspectiveEngineToken')); // Standardize key

  useEffect(() => {
    const storedToken = localStorage.getItem('perspectiveEngineToken'); // Standardize key
    const storedUser = localStorage.getItem('perspectiveEngineUser');
    
    if (storedToken && !isTokenExpired(storedToken)) {
      setToken(storedToken);
      try {
        // If storedUser exists, use it, otherwise parse JWT (if it contains user info)
        // For Google login, we store user info separately. For email/pass, JWT might have it.
        const userData = storedUser ? JSON.parse(storedUser) : parseJwt(storedToken)?.user || parseJwt(storedToken);
        setCurrentUser(userData);
      } catch (e) {
        console.error("Error parsing user data from localStorage or JWT", e);
        localStorage.removeItem('perspectiveEngineToken'); // Standardize key
        localStorage.removeItem('perspectiveEngineUser');
        setCurrentUser(null);
        setToken(null);
      }
    } else if (storedToken) {
      // Token exists but is expired
      localStorage.removeItem('perspectiveEngineToken'); // Standardize key
      localStorage.removeItem('perspectiveEngineUser');
      setCurrentUser(null);
      setToken(null);
    }
    
    setLoading(false);
  }, []);
  
  const login = useCallback((userData, authToken) => {
    console.log("AuthContext: Logging in user:", userData, "Token:", authToken ? authToken.substring(0,10) + "..." : "No Token");
    setCurrentUser(userData);
    setToken(authToken);
    localStorage.setItem('perspectiveEngineToken', authToken); // Standardize key
    // Storing user data separately is good practice, especially if JWT is opaque or doesn't have all details
    localStorage.setItem('perspectiveEngineUser', JSON.stringify(userData)); 
  }, []);

  const logout = useCallback(() => {
    console.log("AuthContext: Logging out user");
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('perspectiveEngineToken'); // Standardize key
    localStorage.removeItem('perspectiveEngineUser');
    // Potentially call a backend logout endpoint if necessary
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