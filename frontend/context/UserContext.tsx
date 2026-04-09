import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserProfile = {
    name: string;
    email: string;
    phoneNumber?: string;
    preferredSpice?: string; // New field for Farmers
    location: {
        latitude: number;
        longitude: number;
        address: string;
    } | null;
};

type UserContextType = {
    profile: UserProfile;
    updateProfile: (profile: Partial<UserProfile>) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [profile, setProfile] = useState<UserProfile>({
        name: "Agri Hub Partner",
        email: "farmer@example.com",
        phoneNumber: "",
        preferredSpice: "Cinnamon",
        location: null
    });

    const updateProfile = (newFields: Partial<UserProfile>) => {
        setProfile(prev => ({ ...prev, ...newFields }));
    };

    return (
        <UserContext.Provider value={{ profile, updateProfile }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within UserProvider");
    return context;
};
