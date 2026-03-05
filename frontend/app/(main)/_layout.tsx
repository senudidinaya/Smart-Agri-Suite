import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import { Tabs } from "expo-router";
import { Platform, Text } from "react-native";
import styles from "../../src/styles/tabLayoutStyles";
import { useAuth } from "../../context/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          height: Platform.OS === "android" ? 62 : 82,
          paddingTop: 6,
          paddingBottom: Platform.OS === "android" ? 10 : 24
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800"
        }
      }}
    >
      {/* ✅ 1) Overview */}
      <Tabs.Screen
        name="overview"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => (
            <IconText color={color} text="🏠" />
          )
        }}
      />

      {/* ✅ 2) Analytics */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => (
            <IconText color={color} text="📊" />
          )
        }}
      />

      {/* ✅ 3) Map */}
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <IconText color={color} text="🗺️" />
          )
        }}
      />

      {/* ✅ 4) Model */}
      <Tabs.Screen
        name="model"
        options={{
          title: "Model",
          tabBarIcon: ({ color }) => (
            <IconText color={color} text="🤖" />
          )
        }}
      />

      {/* ✅ 5) Marketplace */}
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Market",
          tabBarIcon: ({ color }) => (
            <IconText color={color} text="🏪" />
          )
        }}
      />

      {/* ✅ 6) Dashboard */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Admin",
          href: isAdmin ? "/dashboard" : null,
          tabBarIcon: ({ color }) => (
            <IconText color={color} text="📊" />
          )
        }}
      />

      {/* index */}
      <Tabs.Screen
        name="index"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}

function IconText({ color, text }: { color: string; text: string }) {
  return <TextIcon color={color} text={text} />;
}

function TextIcon({ color, text }: { color: string; text: string }) {
  return (
    <React.Fragment>
      {/* icon */}
      <Emoji color={color} text={text} />
    </React.Fragment>
  );
}

function Emoji({ color, text }: { color: string; text: string }) {
  return <Text style={[styles.emojiIcon, { color }]}>{text}</Text>;
}