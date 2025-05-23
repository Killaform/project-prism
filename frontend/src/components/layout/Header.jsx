import React from 'react';
import { LogIn, LogOut, Settings } from 'lucide-react';
import logoSrc from '../../assets/logo.png';

const Header = ({ currentUser, onLogout, onLoginClick, onSettingsClick }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <img src={logoSrc} alt="Perspective Engine Logo" className="h-[75px] w-auto" />
        </div>
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <>
              <span className="text-sm text-gray-700 hidden sm:inline">
                Welcome, <span className="font-semibold text-purple-700">{currentUser.email}</span>
              </span>
              <button
                onClick={onLogout}
                className="text-gray-600 hover:text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors flex items-center text-sm"
                title="Logout"
              >
                <LogOut size={20} className="mr-1 sm:mr-0" />
                <span className="sm:hidden ml-1">Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="text-gray-600 hover:text-purple-700 p-2 rounded-full hover:bg-purple-100 transition-colors flex items-center text-sm"
              title="Login or Register"
            >
              <LogIn size={20} className="mr-1" /> Login / Register
            </button>
          )}
          <button
            onClick={onSettingsClick}
            className="text-gray-600 hover:text-purple-700 p-2 rounded-full hover:bg-purple-100 transition-colors"
            title="API Settings"
          >
            <Settings size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;