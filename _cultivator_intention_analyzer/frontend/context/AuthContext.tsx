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
          // Use cached user instantly, then verify token in background.
          setUser(storedUser);
          setLoading(false);

          api.getCurrentUser()
            .then((currentUser) => {
              setUser(currentUser);
            })
            .catch(async (err: any) => {
              const message = String(err?.message || '').toLowerCase();

              // Clear session only for auth/token failures, not temporary network slowness.
              if (
                message.includes('401') ||
                message.includes('invalid') ||
                message.includes('expired') ||
                message.includes('not found')
              ) {
                await api.logout();
                setUser(null);
                return;
              }

              console.warn('Auth refresh failed, continuing with cached user:', err?.message || err);
            });
          return;
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
