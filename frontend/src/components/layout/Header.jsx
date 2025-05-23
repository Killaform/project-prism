import React from 'react';
import { LogOut, Settings, LogIn } from 'lucide-react';
import logoSrc from '../../assets/logo.png';

const Header = ({ currentUser, onLogout, onLoginClick, onSettingsClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm py-3 px-6">
      <div className="container mx-auto flex flex-col items-center md:flex-row md:justify-between">
        <div className="flex items-center justify-center w-full md:w-auto mb-4 md:mb-0">
          <img 
            src={logoSrc} 
            alt="PERSPECTIVE ENGINE" 
            className="h-14" 
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onSettingsClick}
            className="text-purple-600 hover:text-purple-800 transition-colors p-2"
            title="API Settings"
          >
            <Settings size={20} />
          </button>
          
          {currentUser ? (
            <div className="flex items-center space-x-3">
              <span className="text-gray-900 hidden sm:inline font-mono">
                {currentUser.email || currentUser.name}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md transition-colors"
                title="Log out"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center space-x-1 text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 transition-colors uppercase font-sans font-medium tracking-wide"
              title="Log in"
            >
              <LogIn size={16} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
