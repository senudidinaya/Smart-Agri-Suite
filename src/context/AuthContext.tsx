import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
    id: string;
    username: string;
    role: 'client' | 'admin' | 'farmer' | 'customer';
    fullName: string;
}

interface AuthContextType {
    isLoading: boolean;
    userToken: string | null;
    user: User | null;
    login: (token: string, userData: User) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    isLoading: true,
    userToken: null,
    user: null,
    login: async () => { },
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);

    const login = async (token: string, userData: User) => {
        setIsLoading(true);
        setUserToken(token);
        setUser(userData);
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setIsLoading(false);
    };

    const logout = async () => {
        setIsLoading(true);
        setUserToken(null);
        setUser(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setIsLoading(false);
    };

    const checkToken = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const userData = await AsyncStorage.getItem('userData');
            if (token && userData) {
                setUserToken(token);
                setUser(JSON.parse(userData));

                // Optional: verify token validity with /auth/me
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                    await AsyncStorage.setItem('userData', JSON.stringify(res.data));
                } catch (e) {
                    console.log('Token invalid or expired', e);
                    await logout();
                }
            }
        } catch (e) {
            console.log('Error checking token', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkToken();
    }, []);

    return (
        <AuthContext.Provider value={{ isLoading, userToken, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
