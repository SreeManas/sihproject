// src/components/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const AuthCtx = createContext(null);

export function useAuth() {
  return useContext(AuthCtx);
}

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState('citizen');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const db = getFirestore();
          const ref = doc(db, 'users', user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setRole(snap.data()?.role || 'citizen');
          } else {
            await setDoc(ref, { role: 'citizen', email: user.email || null });
            setRole('citizen');
          }
        } catch {
          setRole('citizen');
        }
      } else {
        setRole('citizen');
      }
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password, demoRole) => {
    const auth = getAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const db = getFirestore();
    await setDoc(doc(db, 'users', cred.user.uid), { role: demoRole || 'citizen', email });
  };

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  const value = { currentUser, role, login, register, logout, loading };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
