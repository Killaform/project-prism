import React from "react";
import { LogIn, UserPlus, X } from "lucide-react";
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-purple-700 flex items-center">
                        {authMode === 'login' ? 
                            <LogIn size={28} className="mr-3" /> : 
                            <UserPlus size={28} className="mr-3" />}
                        {authMode === 'login' ? 'Login to Your Account' : 'Create New Account'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {authError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm" role="alert" aria-live="assertive">
                        <p>{authError}</p>
                    </div>
                )}
                
                <div className="mb-4">
                    <GoogleLoginButton onSuccess={handleGoogleLoginSuccess} />
                </div>
                
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                    </div>
                </div>

                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-6">
                    <div>
                        <label htmlFor="authEmail" className={labelStyles}>Email address</label>
                        <input
                            type="email"
                            id="authEmail"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            required
                            className={inputStyles}
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label htmlFor="authPassword" className={labelStyles}>Password</label>
                        <input
                            type="password"
                            id="authPassword"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            required
                            minLength={authMode === 'register' ? 8 : undefined}
                            className={inputStyles}
                            placeholder="••••••••"
                            autoComplete={authMode === 'login' ? "current-password" : "new-password"}
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                            {authLoading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                authMode === 'login' ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </div>
                </form>
                
                <p className="mt-6 text-center text-sm text-gray-600">
                    {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                        className="font-medium text-purple-600 hover:text-purple-500 hover:underline"
                    >
                        {authMode === 'login' ? 'Sign up here' : 'Log in here'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthModal;