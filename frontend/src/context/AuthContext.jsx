import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';
import { API_BASE } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const token = await firebaseUser.getIdToken();
          const res = await axios.get(`${API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserProfile(res.data);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          if (error.response?.status === 404) {
            signOut(auth);
            setUser(null);
          }
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (user) {
      try {
        const token = await user.getIdToken();
        const res = await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserProfile(res.data);
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  const logout = () => {
    setUserProfile(null);
    signOut(auth);
  };

  const value = {
    user,
    userProfile,
    loading,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Initializing Workspace...</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
