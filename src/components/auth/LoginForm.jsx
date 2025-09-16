// src/components/auth/LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { useLocation } from 'react-router-dom';

export default function LoginForm() {
  const { login, register, currentUser, role, logout } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoRole, setDemoRole] = useState('citizen');
  const [msg, setMsg] = useState('');

  if (currentUser) {
    return (
      <div className="p-4 border rounded">
        <div className="mb-2 text-sm">Logged in as {currentUser.email} ({role})</div>
        <button className="px-3 py-1 bg-gray-200 rounded" onClick={logout}>Logout</button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, demoRole);
      }
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 p-4 border rounded">
      {location.state?.requireLogin && (
        <div className="p-2 text-sm rounded bg-yellow-100 text-yellow-900">Please log in to access Alerts.</div>
      )}
      <div className="font-semibold">Demo Auth</div>
      <div className="flex gap-2 text-sm">
        <button type="button" className={`px-2 py-1 rounded ${mode==='login'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setMode('login')}>Login</button>
        <button type="button" className={`px-2 py-1 rounded ${mode==='register'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={()=>setMode('register')}>Register</button>
      </div>
      <input className="border rounded px-2 py-1 w-full" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="border rounded px-2 py-1 w-full" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {mode === 'register' && (
        <select className="border rounded px-2 py-1 w-full" value={demoRole} onChange={(e)=>setDemoRole(e.target.value)}>
          <option value="citizen">Citizen</option>
          <option value="analyst">Analyst</option>
          <option value="official">Official</option>
        </select>
      )}
      <button className="px-3 py-1 bg-blue-600 text-white rounded">{mode==='login'?'Login':'Register'}</button>
      {msg && <div className="text-sm text-red-600">{msg}</div>}
    </form>
  );
}
