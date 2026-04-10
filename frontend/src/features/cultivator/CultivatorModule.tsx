import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth as useMergedAuth } from "../../../context/AuthContext";
import { api } from "./services/api";
import ClientProfileScreen from "./screens/ClientProfileScreen";
import ClientJobsScreen from "./screens/ClientJobsScreen";
import ClientNotificationsScreen from "./screens/ClientNotificationsScreen";
import AdminApplicationsScreen from "./screens/AdminApplicationsScreen";
import AdminDashboardScreen from "./screens/AdminDashboardScreen";
import AdminCallScreen from "./screens/AdminCallScreen";
import ClientCallScreen from "./screens/ClientCallScreen";
import IncomingCallScreen from "./screens/IncomingCallScreen";
import InPersonInterviewScreen from "./screens/InPersonInterviewScreen";
import ViewAnalysisScreen from "./screens/ViewAnalysisScreen";

type ClientTabParamList = {
  Profile: undefined;
  Jobs: undefined;
  Notifications: undefined;
};

type AdminTabParamList = {
  Dashboard: undefined;
  Applications: undefined;
};

type ClientStackParamList = {
  ClientTabs: undefined;
  IncomingCall: {
    callId: string;
    roomName?: string;
    adminUsername: string;
    jobTitle: string;
    agora?: any;
  };
  ClientCall: {
    callId: string;
    roomName?: string;
    livekitUrl?: string;
    token?: string;
    jobTitle?: string;
    agora?: any;
  };
  ViewAnalysis: {
    jobId: string;
    jobTitle: string;
  };
};

type AdminStackParamList = {
  AdminTabs: undefined;
  AdminCall: {
    callId: string;
    roomName?: string;
    livekitUrl?: string;
    token?: string;
    clientUsername: string;
    jobTitle: string;
    priorExperience?: string;
    agora?: any;
  };
  InPersonInterview: {
    jobId: string;
    clientId: string;
    clientName: string;
    jobTitle: string;
    priorExperience?: string;
  };
  ViewAnalysis: {
    jobId: string;
    jobTitle: string;
  };
};

const ClientTab = createBottomTabNavigator<ClientTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

function ClientTabNavigator() {
  return (
    <ClientTab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#27ae60" },
        headerTintColor: "#fff",
        tabBarActiveTintColor: "#27ae60",
        tabBarInactiveTintColor: "#999",
      }}
    >
      <ClientTab.Screen
        name="Profile"
        component={ClientProfileScreen}
        options={{
          title: "My Job Posting",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📝</Text>,
        }}
      />
      <ClientTab.Screen
        name="Jobs"
        component={ClientJobsScreen}
        options={{
          headerShown: false,
          title: "Jobs",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🌾</Text>,
        }}
      />
      <ClientTab.Screen
        name="Notifications"
        component={ClientNotificationsScreen}
        options={{
          headerShown: false,
          title: "Notifications",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
        }}
      />
    </ClientTab.Navigator>
  );
}

function ClientTabsShell() {
  const { user, token } = useMergedAuth();
  const navigation = useNavigation<any>();
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIncomingCallId = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !token || !api.hasAuthToken()) return;

    const checkForCalls = async () => {
      try {
        const response = await api.checkIncomingCall();
        if (response.hasIncomingCall && response.callId) {
          if (lastIncomingCallId.current === response.callId) {
            return;
          }

          lastIncomingCallId.current = response.callId;
          navigation.navigate("IncomingCall", {
            callId: response.callId,
            agora: response.agora,
            adminUsername: response.adminUsername || "Admin",
            jobTitle: response.jobTitle || "Job Application",
            roomName: response.roomName,
          });
        } else {
          lastIncomingCallId.current = null;
        }
      } catch {
        // Ignore polling failures to keep the module usable offline between requests.
      }
    };

    checkForCalls();
    pollingInterval.current = setInterval(checkForCalls, 3000);
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      lastIncomingCallId.current = null;
    };
  }, [navigation, token, user]);

  return <ClientTabNavigator />;
}

function ClientNavigator() {
  return (
    <ClientStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientStack.Screen name="ClientTabs" component={ClientTabsShell} />
      <ClientStack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ presentation: "fullScreenModal" }} />
      <ClientStack.Screen name="ClientCall" component={ClientCallScreen} options={{ presentation: "fullScreenModal" }} />
      <ClientStack.Screen name="ViewAnalysis" component={ViewAnalysisScreen} options={{ presentation: "modal" }} />
    </ClientStack.Navigator>
  );
}

function AdminTabNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#27ae60" },
        headerTintColor: "#fff",
        tabBarActiveTintColor: "#27ae60",
        tabBarInactiveTintColor: "#999",
      }}
    >
      <AdminTab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          headerShown: true,
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <AdminTab.Screen
        name="Applications"
        component={AdminApplicationsScreen}
        options={{
          headerShown: true,
          title: "Job Posts",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
    </AdminTab.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <AdminStack.Screen name="AdminCall" component={AdminCallScreen} options={{ presentation: "fullScreenModal" }} />
      <AdminStack.Screen
        name="InPersonInterview"
        component={InPersonInterviewScreen}
        options={{ presentation: "fullScreenModal" }}
      />
      <AdminStack.Screen name="ViewAnalysis" component={ViewAnalysisScreen} options={{ presentation: "modal" }} />
    </AdminStack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#27ae60" />
      <Text style={styles.loadingText}>Loading cultivator module...</Text>
    </View>
  );
}

function AppContent() {
  const { user, token, loading } = useMergedAuth();
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (loading) {
      setApiReady(false);
      return;
    }

    if (!token) {
      api.setAuthToken(null);
      setApiReady(false);
      return;
    }

    api.setAuthToken(token);
    setApiReady(true);
  }, [loading, token]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoadingScreen />;
  if (!token) return <LoadingScreen />;
  if (!apiReady) return <LoadingScreen />;
  if (user.role === "admin" || user.role === "interviewer") return <AdminNavigator />;
  return <ClientNavigator />;
}

export default function CultivatorModule() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
});
