// src/components/auth/PermissionGuard.jsx
import React from 'react';
import { useAuth } from './AuthProvider.jsx';
import { Navigate } from 'react-router-dom';
import NotAuthorized from './NotAuthorized.jsx';

export default function PermissionGuard({ roles = ['analyst','official'], children }) {
  const { role, loading, currentUser } = useAuth();
  if (loading) return <div className="p-4">Loading auth...</div>;
  // If not authenticated, redirect to /login with banner message state
  if (!currentUser) return <Navigate to="/login" replace state={{ requireLogin: true }} />;
  // If authenticated but role not permitted, show NotAuthorized page
  if (!roles.includes(role)) return <NotAuthorized />;
  return <>{children}</>;
}
