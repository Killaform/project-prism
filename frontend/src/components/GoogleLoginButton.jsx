import React, { useEffect } from 'react';
import GoogleIcon from '../assets/google-icon.svg';

const GoogleLoginButton = ({ onSuccess }) => {
  // Listen for messages from popup window
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { token, userId, email } = event.data.payload;
        
        if (!token || !userId || !email) {
          console.error('Invalid authentication data received:', event.data.payload);
          return;
        }
        
        console.log('Google authentication successful, storing data:', { 
          userId, email, token: token.substring(0, 10) + '...'
        });
        
        // Store authentication data in localStorage
        localStorage.setItem('perspectiveEngineToken', token);
        localStorage.setItem('perspectiveEngineUser', JSON.stringify({ id: userId, email }));
        
        // Call the onSuccess callback with auth data
        onSuccess({ token, userId, email });
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
      '/login/google',
      'googleLogin',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0`
    );
    
    // Check if popup was blocked
    if (!popupWindow || popupWindow.closed) {
      console.error('Popup was blocked or could not be opened');
      alert('Please allow popups for this site to use Google login');
      // Fallback to redirect method
      window.location.href = '/login/google';
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
    >
      <img src={GoogleIcon} alt="Google" className="h-5 w-5 mr-2" />
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton;