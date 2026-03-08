/**
 * AuthContext — Simple authentication state management
 * Communicates with the auth endpoints on the same backend (port 8000).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_API_BASE_URL } from '../src/config';

const TOKEN_KEY = 'smartagri_token';
const USER_KEY = 'smartagri_user';

export interface User {
    id: string;
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    role: 'client' | 'admin' | 'helper' | 'farmer' | 'interviewer';
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<string>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

interface RegisterData {
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    password: string;
    role: 'client' | 'admin' | 'helper' | 'farmer' | 'interviewer';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialise from AsyncStorage on mount
    useEffect(() => {
        const init = async () => {
            try {
                const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
                const storedUser = await AsyncStorage.getItem(USER_KEY);

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));

                    // Verify token in background
                    try {
                        const res = await fetch(`${AUTH_API_BASE_URL}/auth/me`, {
                            headers: { 'Authorization': `Bearer ${storedToken}` },
                        });
                        if (res.ok) {
                            const freshUser = await res.json();
                            setUser(freshUser);
                            await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
                        } else if (res.status === 401 || res.status === 403) {
                            // Token explicitly expired or invalid
                            await AsyncStorage.removeItem(TOKEN_KEY);
                            await AsyncStorage.removeItem(USER_KEY);
                            setToken(null);
                            setUser(null);
                        } else {
                            // Server error (e.g. 500, 503) — keep the cached user
                            console.warn(`Could not verify token (Status ${res.status}), using cached user info`);
                        }
                    } catch {
                        // Network error — keep cached user
                        console.warn('Network error while verifying token, using cached user');
                    }
                }
            } catch {
                console.error('Auth init error');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const res = await fetch(`${AUTH_API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, rememberMe: true }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }, []);

    const register = useCallback(async (regData: RegisterData): Promise<string> => {
        const res = await fetch(`${AUTH_API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regData),
        });

        const data = await res.json();

        if (!res.ok) {
            if (Array.isArray(data.detail)) {
                const first = data.detail[0];
                const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : 'field';
                const msg = first?.msg || 'Invalid value';
                throw new Error(`${field}: ${msg}`);
            }
            throw new Error(data.detail || 'Registration failed');
        }

        return data.message;
    }, []);

    const logout = useCallback(async () => {
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
    }, []);

    const refreshUser = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${AUTH_API_BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const freshUser = await res.json();
                setUser(freshUser);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            }
        } catch {
            // ignore
        }
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
