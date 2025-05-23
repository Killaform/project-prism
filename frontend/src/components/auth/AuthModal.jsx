import React from "react";
import { LogIn, UserPlus, X, Terminal } from "lucide-react";
import GoogleLoginButton from "../GoogleLoginButton"; // Changed from "./GoogleLoginButton"

const AuthModal = ({
    visible,
    onClose,
    authMode,
    setAuthMode,
    authError,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    handleLogin,
    handleRegister,
    authLoading,
    handleGoogleLoginSuccess,
    labelStyles,
    inputStyles
}) => {
    if (!visible) return null;
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 sm:p-8 shadow-xl rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center uppercase tracking-wide">
                        <span className="mr-2 text-gray-900">></span>
                        {authMode === 'login' ? 'SYSTEM ACCESS' : 'NEW USER CREATION'}
                    </h2>
                    <button onClick={onClose} className="text-gray-900 hover:text-purple-700">
                        <X size={24} />
                    </button>
                </div>
                
                {authError && (
                    <div className="bg-purple-100 border-l-2 border-purple-600 text-gray-900 p-3 mb-4 text-sm" role="alert" aria-live="assertive">
                        <p className="font-mono">[ERROR] {authError}</p>
                    </div>
                )}
                
                <div className="mb-4">
                    <GoogleLoginButton onSuccess={handleGoogleLoginSuccess} />
                </div>
                
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-purple-600 font-mono">// OR USE EMAIL</span>
                    </div>
                </div>

                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-6">
                    <div>
                        <label htmlFor="authEmail" className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
                          Email
                        </label>
                        <input
                          type="email"
                          id="authEmail"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          required
                          className="block w-full bg-white border border-gray-300 rounded-md text-gray-900 shadow-sm focus:border-purple-500 focus:ring-0 text-sm font-mono"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                    </div>
                    <div>
                        <label htmlFor="authPassword" className="block text-sm font-medium text-gray-900 mb-1 uppercase tracking-wide">
                          Password
                        </label>
                        <input
                          type="password"
                          id="authPassword"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          required
                          minLength={authMode === 'register' ? 8 : undefined}
                          className="block w-full bg-white border border-gray-300 rounded-md text-gray-900 shadow-sm focus:border-purple-500 focus:ring-0 text-sm font-mono"
                          placeholder="••••••••"
                          autoComplete={authMode === 'login' ? "current-password" : "new-password"}
                        />
                    </div>
                    <div>
                        <button
                          type="submit"
                          disabled={authLoading}
                          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:bg-gray-400 uppercase tracking-wide"
                        >
                          {authLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            authMode === 'login' ? 'AUTHENTICATE' : 'CREATE ACCOUNT'
                          )}
                        </button>
                    </div>
                </form>
                
                <p className="mt-6 text-center text-sm text-gray-500 font-mono">
                  {authMode === 'login' ? "// NO ACCOUNT?" : "// EXISTING USER?"} 
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="font-medium text-gray-900 hover:text-purple-700 hover:underline ml-1"
                  >
                    {authMode === 'login' ? 'REGISTER HERE' : 'LOGIN HERE'}
                  </button>
                </p>
            </div>
        </div>
    );
};

export default AuthModal;

