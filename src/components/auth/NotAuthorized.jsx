// src/components/auth/NotAuthorized.jsx
import React from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotAuthorized() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto mt-12 text-center bg-white border rounded p-8">
      <div className="flex justify-center mb-3"><Lock className="h-8 w-8 text-red-600" /></div>
      <h1 className="text-xl font-semibold mb-1">Access Denied</h1>
      <p className="text-sm text-gray-600 mb-4">You are not authorized to view this page.</p>
      <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go Home</button>
    </div>
  );
}
