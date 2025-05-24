import React, { useEffect } from 'react';
import googleIcon from '../assets/google-icon.svg';

const GoogleLoginButton = ({ onSuccess }) => {
  // Listen for messages from popup window
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { token, userId, email, name, profilePic } = event.data.payload;
        
        if (!token || !userId || !email) {
          console.error('Invalid authentication data received:', event.data.payload);
          return;
        }
        
        console.log('Google authentication successful:', { 
          userId, email, name, token: token.substring(0, 10) + '...'
        });
        
        // Store authentication data in localStorage
        localStorage.setItem('perspectiveEngineToken', token);
        localStorage.setItem('perspectiveEngineUser', JSON.stringify({ 
          id: userId, 
          email, 
          name: name || email,
          profile_pic_url: profilePic 
        }));
        
        // Call the onSuccess callback with auth data
        onSuccess({ 
          token, 
          userId, 
          email, 
          name: name || email,
          profilePic 
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const handleGoogleLogin = () => {
    // Calculate popup position (centered)
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Open Google login in popup window
    const popupWindow = window.open(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/auth/google`,
      'googleLogin',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1`
    );
    
    // Check if popup was blocked
    if (!popupWindow || popupWindow.closed) {
      console.error('Popup was blocked or could not be opened');
      alert('Please allow popups for this site to use Google login');
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      type="button"
      className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
    >
      <img src={googleIcon} className="w-5 h-5 mr-2" alt="Google" />
      Continue with Google
    </button>
  );
};

export default GoogleLoginButton;