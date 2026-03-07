import { Tabs } from "expo-router";
import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Platform, Text } from "react-native";

function TabIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 18 }}>{icon}</Text>;
}

export default function PricingTabsLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F59E0B",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          height: Platform.OS === "android" ? 62 : 82,
          paddingTop: 6,
          paddingBottom: Platform.OS === "android" ? 10 : 24,
          backgroundColor: "#ffffff",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Poppins_500Medium",
        },
      }}
    >
      <Tabs.Screen
        name="farmer"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon icon="🌾" />,
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <TabIcon icon="📦" />,
        }}
      />
      <Tabs.Screen
        name="price-result"
        options={{
          title: "Prices",
          tabBarIcon: ({ color }) => <TabIcon icon="💰" />,
        }}
      />
      <Tabs.Screen
        name="demand-prediction"
        options={{
          title: "Demand",
          tabBarIcon: ({ color }) => <TabIcon icon="📊" />,
        }}
      />
      <Tabs.Screen
        name="route-planner"
        options={{
          title: "Routes",
          tabBarIcon: ({ color }) => <TabIcon icon="🗺️" />,
        }}
      />
      <Tabs.Screen
        name="transport"
        options={{
          title: "Transport",
          tabBarIcon: ({ color }) => <TabIcon icon="🚚" />,
        }}
      />
      <Tabs.Screen
        name="seasonal-price-analytics"
        options={{
          title: "Seasonal",
          tabBarIcon: ({ color }) => <TabIcon icon="📅" />,
        }}
      />
      <Tabs.Screen
        name="simulator"
        options={{
          title: "Simulator",
          tabBarIcon: ({ color }) => <TabIcon icon="🧪" />,
        }}
      />
      <Tabs.Screen
        name="srilanka-demand-map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <TabIcon icon="🇱🇰" />,
        }}
      />
      <Tabs.Screen
        name="transport-analytics"
        options={{
          title: "T.Analytics",
          tabBarIcon: ({ color }) => <TabIcon icon="📈" />,
        }}
      />
      <Tabs.Screen
        name="transport-optimizer"
        options={{
          title: "Optimizer",
          tabBarIcon: ({ color }) => <TabIcon icon="⚡" />,
        }}
      />
      <Tabs.Screen
        name="transport-tracking"
        options={{
          title: "Tracking",
          tabBarIcon: ({ color }) => <TabIcon icon="📍" />,
        }}
      />
      <Tabs.Screen
        name="yield-analytics"
        options={{
          title: "Yield",
          tabBarIcon: ({ color }) => <TabIcon icon="🌱" />,
        }}
      />
    </Tabs>
  );
}
