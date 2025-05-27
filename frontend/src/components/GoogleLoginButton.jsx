import React, { useEffect } from 'react';

const GoogleLoginButton = ({ onSuccess }) => {
  useEffect(() => {
    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // Initialize Google Sign-In when script loads
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', width: '300', text: 'signin_with' }
        );
      }
    };

    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleCredentialResponse = (response) => {
    console.log("Google authentication response received:", response);
    
    // Send the token to your backend
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/auth/google/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ token: response.credential })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Google authentication successful:", data);
      if (data.token && data.user) {
        onSuccess({
          token: data.token,
          userId: data.user.id,
          email: data.user.email,
          name: data.user.name,
          profilePic: data.user.profile_pic_url
        });
      } else {
        console.error('Google login failed:', data);
      }
    })
    .catch(err => {
      console.error('Google login error:', err);
    });
  };

  return (
    <div id="google-signin-button" className="w-full"></div>
  );
};

export default GoogleLoginButton;