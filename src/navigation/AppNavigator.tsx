import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import FarmerNavigator from './FarmerNavigator';

export default function AppNavigator() {
    const { isLoading, userToken, user } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    // Define role routing condition
    const isFarmer = user?.role === 'farmer' || user?.role === 'admin';

    return (
        <NavigationContainer>
            {userToken == null ? (
                <AuthNavigator />
            ) : isFarmer ? (
                <FarmerNavigator />
            ) : (
                <CustomerNavigator />
            )}
        </NavigationContainer>
    );
}
