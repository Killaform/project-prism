const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Fix 4: Update parseJwt function
export const parseJwt = (token) => {
  try {
    if (!token || token.split('.').length !== 3) {
      console.error("Invalid JWT format");
      return null;
    }
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error parsing JWT", e);
    return null;
  }
};

// Fix 5: Update isTokenExpired function
export const isTokenExpired = (token) => {
  const decoded = parseJwt(token);
  if (!decoded) return true;
  
  // Check if token has expiration claim
  if (!decoded.exp) return false;
  
  // Compare expiration timestamp with current time
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

export const registerUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  
  return data;
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  
  return data;
};

// Fix 7: Add Google login API function
export const googleLoginAPI = async (credential) => {
  const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Google authentication failed');
  }
  
  return data;
};

export const verifyToken = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.valid ? data.user : null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const logoutUser = async (token) => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};