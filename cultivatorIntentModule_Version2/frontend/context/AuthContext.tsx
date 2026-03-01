/**
 * Auth Context - Simple authentication state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    const init = async () => {
      try {
        const storedUser = await api.init();
        if (storedUser) {
          // Verify token is still valid
          try {
            const currentUser = await api.getCurrentUser();
            setUser(currentUser);
          } catch {
            // Token expired, clear it
            await api.logout();
            setUser(null);
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe: boolean) => {
    setLoading(true);
    try {
      const loggedInUser = await api.login(username, password, rememberMe);
      setUser(loggedInUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch {
      // Ignore errors
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
