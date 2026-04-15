import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useOrders } from "../../context/OrderContext";
import { useTheme } from "../../context/ThemeContext";

export default function FarmerTabsLayout() {
  const { orders } = useOrders();
  const { theme } = useTheme();
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBg,
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
        tabBarActiveTintColor: theme.tabActiveTint,
        tabBarInactiveTintColor: theme.tabInactiveTint,
        tabBarLabelStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, marginTop: 6 },
      }}
    >
      {/* 1. HOME */}
      <Tabs.Screen
        name="farmer"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }] : null}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 2. STOCK / MARKETPLACE */}
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }] : null}>
              <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 3. INBOUND ORDERS — badge shows pending count */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              <View style={focused ? [styles.activeIconWrap, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }] : null}>
                <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
              </View>
              {pendingCount > 0 && (
                <View style={[styles.badge, { borderColor: theme.tabBg }]}>
                  <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* 4. ANALYTICS */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }] : null}>
              <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 5. PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconWrap, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }] : null}>
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* HIDDEN — accessible via Home studio */}
      <Tabs.Screen name="srilanka-demand-map" options={{ href: null }} />
      <Tabs.Screen name="simulator" options={{ href: null }} />
      <Tabs.Screen name="transport" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    padding: 8,
    borderRadius: 14,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
  },
});
