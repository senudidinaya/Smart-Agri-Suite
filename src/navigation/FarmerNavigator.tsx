import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

import FarmerDashboard from '../screens/farmer/FarmerDashboard';
import FarmerOrders from '../screens/farmer/FarmerOrders';
import StockPredictionScreen from '../screens/farmer/StockPredictionScreen';

const Tab = createBottomTabNavigator();

export default function FarmerNavigator() {
    return (
        <Tab.Navigator
            id="FarmerTabs"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#FF9800',
                tabBarInactiveTintColor: '#9e9e9e',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any = 'home';
                    if (route.name === 'Inventory') iconName = focused ? 'cube' : 'cube-outline';
                    else if (route.name === 'Orders') iconName = focused ? 'receipt' : 'receipt-outline';
                    else if (route.name === 'Prediction') iconName = focused ? 'analytics' : 'analytics-outline';

                    return (
                        <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                            <Ionicons name={iconName} size={focused ? 24 : 22} color={color} />
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen name="Inventory" component={FarmerDashboard} options={{ title: 'Inventory' }} />
            <Tab.Screen name="Orders" component={FarmerOrders} options={{ title: 'Orders' }} />
            <Tab.Screen name="Prediction" component={StockPredictionScreen} options={{ title: 'Stock AI' }} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 16,
        right: 16,
        elevation: 8,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        height: 64,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        borderTopWidth: 0,
        paddingBottom: Platform.OS === 'ios' ? 20 : 6,
        paddingTop: 6,
    },
    tabBarLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    iconContainer: {
        padding: 4,
        borderRadius: 16,
    },
    iconContainerFocused: {
        backgroundColor: '#FFF3E0',
    },
});
