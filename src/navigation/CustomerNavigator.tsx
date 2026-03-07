import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';

// We'll create these screens next
import CustomerDashboard from '../screens/customer/CustomerDashboard';
import SpiceDetailsScreen from '../screens/customer/SpiceDetailsScreen';
import CustomerOrders from '../screens/customer/CustomerOrders';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ShopStack() {
    return (
        <Stack.Navigator id="ShopStack" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ShopList" component={CustomerDashboard} />
            <Stack.Screen name="SpiceDetails" component={SpiceDetailsScreen} />
        </Stack.Navigator>
    );
}

export default function CustomerNavigator() {
    return (
        <Tab.Navigator
            id="CustomerTabs"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: '#4CAF50',
                tabBarInactiveTintColor: '#9e9e9e',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any = 'home';
                    if (route.name === 'Shop') iconName = focused ? 'storefront' : 'storefront-outline';
                    else if (route.name === 'MyOrders') iconName = focused ? 'bag-handle' : 'bag-handle-outline';

                    return (
                        <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                            <Ionicons name={iconName} size={focused ? 24 : 22} color={color} />
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen name="Shop" component={ShopStack} />
            <Tab.Screen name="MyOrders" component={CustomerOrders} options={{ title: 'Orders' }} />
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
        backgroundColor: '#E8F5E9',
    },
});
