import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { Settings, LogOut, LogIn, User, Menu, X } from 'lucide-react';
import logoSrc from '../../assets/logo.png'; // Import the logo image

const Header = ({ 
  onApiSettingsClick, 
  onLoginClick, 
  onRegisterClick,
  onProfileClick,
  showMobileMenu,
  setShowMobileMenu
}) => {
  const { currentUser, logout } = useContext(AuthContext);
  
  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
      <div className="container mx-auto px-4 sm:px-6 py-3"> {/* Reduced padding slightly */}
        <div className="flex justify-between items-center">
          {/* Logo section with optimal size */}
          <div className="flex items-center">
            <img 
              src={logoSrc} 
              alt="Perspective Engine Logo" 
              className="h-20 w-auto" // Balanced size between h-16 and h-32
            />
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
              {showMobileMenu ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <button 
              onClick={onApiSettingsClick}
              className="flex items-center text-sm text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
            >
              <Settings size={18} className="mr-1.5" />
              <span>API Settings</span>
            </button>
            
            {currentUser ? (
              <>
                <button 
                  onClick={onProfileClick}
                  className="flex items-center text-sm text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
                >
                  <User size={18} className="mr-1.5" />
                  <span>{currentUser?.name || 'Profile'}</span>
                </button>
                
                <button 
                  onClick={logout}
                  className="flex items-center text-sm text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
                >
                  <LogOut size={18} className="mr-1.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={onLoginClick}
                  className="flex items-center text-sm text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
                >
                  <LogIn size={18} className="mr-1.5" />
                  <span>Sign In</span>
                </button>
                
                <button 
                  onClick={onRegisterClick}
                  className="flex items-center text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-md"
                >
                  <span>Register</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
      
      {/* Mobile navigation menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-2">
          <nav className="flex flex-col space-y-2">
            <button 
              onClick={onApiSettingsClick}
              className="flex items-center text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
            >
              <Settings size={18} className="mr-2" />
              <span>API Settings</span>
            </button>
            
            {currentUser ? (
              <>
                <button 
                  onClick={onProfileClick}
                  className="flex items-center text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
                >
                  <User size={18} className="mr-2" />
                  <span>{currentUser?.name || 'Profile'}</span>
                </button>
                
                <button 
                  onClick={logout}
                  className="flex items-center text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
                >
                  <LogOut size={18} className="mr-2" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={onLoginClick}
                  className="flex items-center text-gray-700 hover:text-purple-600 py-2 px-3 rounded-md hover:bg-gray-50"
                >
                  <LogIn size={18} className="mr-2" />
                  <span>Sign In</span>
                </button>
                
                <button 
                  onClick={onRegisterClick}
                  className="flex w-full items-center justify-center text-white bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-md"
                >
                  <span>Register</span>
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
