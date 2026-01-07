/**
 * Main App Component - Navigation and routing
 */

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClientProfileScreen from './src/screens/ClientProfileScreen';
import ClientJobsScreen from './src/screens/ClientJobsScreen';
import ClientNotificationsScreen from './src/screens/ClientNotificationsScreen';
import AdminApplicationsScreen from './src/screens/AdminApplicationsScreen';
import AdminCallScreen from './src/screens/AdminCallScreen';
import ClientCallScreen from './src/screens/ClientCallScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import InPersonInterviewScreen from './src/screens/InPersonInterviewScreen';
import { api } from './src/services/api';

// Navigation types
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type ClientTabParamList = {
  Profile: undefined;
  Jobs: undefined;
  Notifications: undefined;
};

type AdminTabParamList = {
  Applications: undefined;
};

type ClientStackParamList = {
  ClientTabs: undefined;
  IncomingCall: {
    callId: string;
    roomName: string;
    adminUsername: string;
    jobTitle: string;
  };
  ClientCall: {
    callId: string;
    roomName: string;
    livekitUrl: string;
    token: string;
    jobTitle?: string;
  };
};

type AdminStackParamList = {
  AdminTabs: undefined;
  AdminCall: {
    callId: string;
    roomName: string;
    livekitUrl: string;
    token: string;
    clientUsername: string;
    jobTitle: string;
  };
  InPersonInterview: {
    jobId: string;
    clientId: string;
    clientName: string;
    jobTitle: string;
  };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ClientTab = createBottomTabNavigator<ClientTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

// Auth Navigator (Login & Register)
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onNavigateToRegister={() => props.navigation.navigate('Register')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {(props) => (
          <RegisterScreen
            {...props}
            onNavigateToLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

// Client Tab Navigator (Profile & Jobs)
function ClientTabNavigator() {
  const { logout } = useAuth();

  return (
    <ClientTab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#5C9A9A' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#5C9A9A',
        tabBarInactiveTintColor: '#999',
        headerRight: () => (
          <Text style={styles.logoutButton} onPress={logout}>
            Logout
          </Text>
        ),
      }}
    >
      <ClientTab.Screen
        name="Profile"
        component={ClientProfileScreen}
        options={{
          title: 'My Job Posting',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📝</Text>,
        }}
      />
      <ClientTab.Screen
        name="Jobs"
        component={ClientJobsScreen}
        options={{
          headerShown: false,
          title: 'Jobs',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌾</Text>,
        }}
      />
      <ClientTab.Screen
        name="Notifications"
        component={ClientNotificationsScreen}
        options={{
          headerShown: false,
          title: 'Notifications',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
        }}
      />
    </ClientTab.Navigator>
  );
}

// Client Stack Navigator (includes call screens)
function ClientNavigator({ navigationRef }: { navigationRef: any }) {
  const { user } = useAuth();
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Poll for incoming calls every 3 seconds
  useEffect(() => {
    if (!user) return;

    const checkForCalls = async () => {
      try {
        const response = await api.checkIncomingCall();
        if (response.hasIncomingCall && response.callId && navigationRef.current) {
          // Navigate to incoming call screen
          navigationRef.current.navigate('IncomingCall', {
            callId: response.callId,
            roomName: response.roomName,
            adminUsername: response.adminUsername || 'Admin',
            jobTitle: response.jobTitle || 'Job Application',
          });
        }
      } catch (error) {
        // Silently ignore polling errors
        console.debug('Call polling error:', error);
      }
    };

    // Start polling
    pollingInterval.current = setInterval(checkForCalls, 3000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [user, navigationRef]);

  return (
    <ClientStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientStack.Screen name="ClientTabs" component={ClientTabNavigator} />
      <ClientStack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <ClientStack.Screen
        name="ClientCall"
        component={ClientCallScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
    </ClientStack.Navigator>
  );
}

// Admin Tab Navigator (Applications management)
function AdminTabNavigator() {
  const { logout } = useAuth();

  return (
    <AdminTab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#5C9A9A' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#5C9A9A',
        tabBarInactiveTintColor: '#999',
        headerRight: () => (
          <Text style={styles.logoutButton} onPress={logout}>
            Logout
          </Text>
        ),
      }}
    >
      <AdminTab.Screen
        name="Applications"
        component={AdminApplicationsScreen}
        options={{
          headerShown: true,
          title: 'Job Posts',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
    </AdminTab.Navigator>
  );
}

// Admin Stack Navigator (includes call screens)
function AdminNavigator() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <AdminStack.Screen
        name="AdminCall"
        component={AdminCallScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <AdminStack.Screen
        name="InPersonInterview"
        component={InPersonInterviewScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
    </AdminStack.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#5C9A9A" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

// Main App Content - handles auth state routing
function AppContent({ navigationRef }: { navigationRef: any }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Not logged in - show auth screens
  if (!user) {
    return <AuthNavigator />;
  }

  // Logged in - route based on role
  if (user.role === 'admin') {
    return <AdminNavigator />;
  }

  // Default to client
  return <ClientNavigator navigationRef={navigationRef} />;
}

// Root App Component
export default function App() {
  const navigationRef = useRef<any>(null);

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <AppContent navigationRef={navigationRef} />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  logoutButton: {
    color: '#fff',
    marginRight: 15,
    fontSize: 14,
    fontWeight: '500',
  },
});
