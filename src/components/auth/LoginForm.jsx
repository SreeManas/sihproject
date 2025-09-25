// src/components/auth/LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { useLocation } from 'react-router-dom';

export default function LoginForm() {
  const { login, register, currentUser, role, logout, signInWithGoogle } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoRole, setDemoRole] = useState('citizen');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-200 p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-green-900 mb-2">Welcome Back!</div>
        </div>
        <div className="space-y-2 text-sm text-gray-700 mb-6">
          <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
            <span className="font-medium text-gray-600">Email:</span>
            <span className="font-semibold text-gray-900">{currentUser.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
            <span className="font-medium text-gray-600">Role:</span>
            <span className="font-semibold text-green-600 capitalize">{role}</span>
          </div>
          {currentUser.displayName && (
            <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
              <span className="font-medium text-gray-600">Name:</span>
              <span className="font-semibold text-gray-900">{currentUser.displayName}</span>
            </div>
          )}
        </div>
        <button 
          className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
          onClick={logout}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, demoRole);
      }
    } catch (e) {
      setMsg(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setMsg(error.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
      {location.state?.requireLogin && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">Please log in to access Alerts.</span>
        </div>
      )}
      
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-2">Demo Auth</div>
        <div className="text-gray-600">Access your INCOIS SAMACHAR account</div>
      </div>
      
      {/* Mode Toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button 
          type="button" 
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            mode === 'login' 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-gray-600 hover:text-gray-900'
          }`} 
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button 
          type="button" 
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            mode === 'register' 
              ? 'bg-white text-blue-600 shadow-md' 
              : 'text-gray-600 hover:text-gray-900'
          }`} 
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      {/* Google Sign-In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl px-6 py-3 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md font-medium"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path 
            fill="#4285F4" 
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path 
            fill="#34A853" 
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path 
            fill="#FBBC05" 
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path 
            fill="#EA4335" 
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </div>
        ) : 'Sign in with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-sm font-medium text-gray-500 px-2">or continue with</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md" 
            placeholder="Enter your email" 
            type="email"
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md" 
            placeholder="Enter your password" 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>
        
        {mode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <select 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md" 
              value={demoRole} 
              onChange={(e) => setDemoRole(e.target.value)}
              disabled={loading}
            >
              <option value="citizen">👤 Citizen</option>
              <option value="analyst">📊 Analyst</option>
              <option value="official">🏛️ Official</option>
            </select>
          </div>
        )}
        
        <button 
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </div>
          ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      {/* Error Message */}
      {msg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{msg}</span>
        </div>
      )}
    </div>
  );
}