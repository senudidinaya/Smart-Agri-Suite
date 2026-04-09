import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform } from "react-native";

export default function FarmerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 25,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 20,
          height: Platform.OS === 'ios' ? 95 : 75,
          paddingBottom: Platform.OS === 'ios' ? 35 : 15,
          paddingTop: 15,
          position: 'absolute',
          borderTopLeftRadius: 36,
          borderTopRightRadius: 36,
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#CBD5E1',
        tabBarLabelStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, marginTop: 6 },
      }}
    >
      {/* 1. HOME / AGRI-COMMAND */}
      <Tabs.Screen
        name="farmer"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
             <View style={focused ? styles.activeIconWrap : null}>
                <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
             </View>
          ),
        }}
      />

      {/* 2. MARKETPLACE / STOCK */}
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 3. INBOUND ORDERS / TRACKING */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 4. FARMER PROFILE / LOCATION HUB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* HIDDEN OPERATIONAL SUBSENSORS (Accessible via Home studio) */}
      <Tabs.Screen name="srilanka-demand-map" options={{ href: null }} />
      <Tabs.Screen name="simulator" options={{ href: null }} />
      <Tabs.Screen name="transport" options={{ href: null }} />

    </Tabs>
  );
}

const styles = StyleSheet.create({
    activeIconWrap: {
        backgroundColor: '#F0FDF4',
        padding: 8,
        borderRadius: 14,
    }
});
