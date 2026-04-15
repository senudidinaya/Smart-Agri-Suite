import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useOrders } from "../../context/OrderContext";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { useTheme } from "../../context/ThemeContext";

export default function CustomerTabsLayout() {
  const { orders } = useOrders();
  const { cartCount } = useCart();
  const { profile } = useUser();
  const { theme } = useTheme();

  // Active orders for this customer (non-rejected)
  const myActiveOrders = profile.name
    ? orders.filter(o =>
        (o.customer === profile.name || o.customer?.includes(profile.name)) &&
        o.status !== 'REJECTED' && o.status !== 'DELIVERED'
      ).length
    : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBg,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          height: Platform.OS === 'ios' ? 90 : 72,
          paddingBottom: Platform.OS === 'ios' ? 30 : 14,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: theme.tabInactiveTint,
        tabBarLabelStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />
          ),
        }}
      />
      {/* Cart tab with live item count badge */}
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? "cart" : "cart-outline"} size={24} color={color} />
              {cartCount > 0 && (
                <View style={[styles.badge, { borderColor: theme.tabBg }]}>
                  <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      {/* Orders tab with active order count badge */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? "receipt" : "receipt-outline"} size={24} color={color} />
              {myActiveOrders > 0 && (
                <View style={[styles.badge, { backgroundColor: '#10B981', borderColor: theme.tabBg }]}>
                  <Text style={styles.badgeText}>{myActiveOrders > 9 ? '9+' : myActiveOrders}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: 'Poppins_700Bold',
  },
});
