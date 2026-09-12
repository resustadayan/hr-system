// src/components/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔒 Flag that Login.js sets to true while registering
  const registeringRef = useRef(false);

  // 🌐 Expose a global setter so Login.js can toggle the flag
  useEffect(() => {
    window.__setHrRegistering = (value) => {
      registeringRef.current = value;
      console.log('🔧 registeringRef =', value);
    };
    return () => {
      delete window.__setHrRegistering;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 🛑 CRITICAL FIX:
          // If Login.js is currently registering, DO NOT touch the session.
          // Just bail out and let Login.js finish its writes + signOut.
          if (registeringRef.current) {
            console.log('⏸️ AuthContext paused (registration in progress)');
            setLoading(false);
            return;
          }

          // Retry reading the user doc (handles slow Firestore writes)
          let userDoc = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) break;
            await new Promise((r) => setTimeout(r, 500));
          }

          if (!userDoc || !userDoc.exists()) {
            console.warn('No user doc after retries — signing out.');
            await signOut(auth);
            setUser(null);
            setUserRole(null);
            setUserStatus(null);
            setLoading(false);
            return;
          }

          const userData = userDoc.data();
          const status = userData.status || 'Active';
          const role = userData.role || 'Employee';

          if (status === 'Pending Approval' || status === 'Inactive') {
            console.warn(`Status "${status}" — signing out.`);
            await signOut(auth);
            setUser(null);
            setUserRole(null);
            setUserStatus(status);
            setLoading(false);
            return;
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData.name || firebaseUser.email?.split('@')[0] || 'User',
            role,
            status,
            department: userData.department || null,
            position: userData.position || null,
          });
          setUserRole(role);
          setUserStatus(status);
        } catch (error) {
          console.error('AuthContext error:', error);
          setUser(null);
          setUserRole(null);
          setUserStatus(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setUserStatus(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = { user, userRole, userStatus, loading, setUser, setUserRole };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}