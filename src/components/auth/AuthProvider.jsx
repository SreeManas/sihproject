// src/components/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
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
            await setDoc(ref, {
              role: 'citizen',
              email: user.email || null,
              displayName: user.displayName || null,
              createdAt: new Date().toISOString()
            });
            setRole('citizen');
          }
        } catch (error) {
          console.error('Error setting up user:', error);
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
    await setDoc(doc(db, 'users', cred.user.uid), { 
      role: demoRole || 'citizen', 
      email,
      createdAt: new Date().toISOString()
    });
  };

  const signInWithGoogle = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    // Configure provider settings
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user document exists, create if not
      const db = getFirestore();
      const userDoc = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDoc);
      
      if (!userSnap.exists()) {
        await setDoc(userDoc, { 
          role: 'citizen', 
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: 'google',
          createdAt: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups for this site and try again.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized. Please contact support.');
      } else {
        throw new Error(error.message || 'Google sign-in failed');
      }
    }
  };

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  const value = { 
    currentUser, 
    role, 
    login, 
    register, 
    logout, 
    loading, 
    signInWithGoogle 
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}