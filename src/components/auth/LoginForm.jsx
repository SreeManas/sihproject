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
      <div className="p-4 border rounded bg-green-50 border-green-200">
        <div className="mb-2 text-sm">
          <div className="font-semibold">Welcome!</div>
          <div>Email: {currentUser.email}</div>
          <div>Role: {role}</div>
          {currentUser.displayName && (
            <div>Name: {currentUser.displayName}</div>
          )}
        </div>
        <button 
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" 
          onClick={logout}
        >
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
    <div className="space-y-4 p-4 border rounded bg-white shadow-sm">
      {location.state?.requireLogin && (
        <div className="p-3 text-sm rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
          Please log in to access Alerts.
        </div>
      )}
      
      <div className="font-semibold text-lg">Demo Auth</div>
      
      {/* Mode Toggle */}
      <div className="flex gap-2 text-sm">
        <button 
          type="button" 
          className={`px-3 py-1 rounded transition-colors ${
            mode === 'login' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`} 
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button 
          type="button" 
          className={`px-3 py-1 rounded transition-colors ${
            mode === 'register' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
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
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-sm text-gray-500">or</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={submit} className="space-y-3">
        <input 
          className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="Email" 
          type="email"
          value={email} 
          onChange={e => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        
        <input 
          className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="Password" 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          disabled={loading}
        />
        
        {mode === 'register' && (
          <select 
            className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={demoRole} 
            onChange={(e) => setDemoRole(e.target.value)}
            disabled={loading}
          >
            <option value="citizen">Citizen</option>
            <option value="analyst">Analyst</option>
            <option value="official">Official</option>
          </select>
        )}
        
        <button 
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : (mode === 'login' ? 'Login' : 'Register')}
        </button>
      </form>

      {/* Error Message */}
      {msg && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {msg}
        </div>
      )}
    </div>
  );
}