import { GlobalProvider } from '@/context/GlobalContext';
import { PushProvider } from '../components/common/PushNotificationService';
import { UserModeProvider } from '@/context/UserModeContext';
import { useEffect } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

// Contexts — from both branches
import { AuthProvider, useAuth } from "../context/AuthContext";       // gee-xgboost branch
import { LanguageProvider } from "../context/LanguageContext";        // shared
import { OrderProvider } from "../context/OrderContext";              // pricing branch

// Components
import LanguageToggle from "../components/LanguageToggle";            // pricing branch

/**
 * Auth gate — from gee-xgboost branch.
 * Skips redirect for all pricing & logistics screens and stock prediction screens (public routes).
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (loading || !rootNavigationState?.key) return;

    const inAuthGroup = (segments[0] as string) === "auth";

    // All (tabs), (stock) screens and standalone pricing screens are public — no auth redirect
    const inPublicGroup =
      (segments[0] as string) === "(tabs)" ||
      (segments[0] as string) === "(stock)" ||
      (segments[0] as string) === "invoice" ||
      (segments[0] as string) === "modal" ||
      (segments[0] as string) === "price-result";

    if (!user && !inAuthGroup && !inPublicGroup) {
      router.replace("/auth/login" as any);
    } else if (user && inAuthGroup) {
      router.replace("/" as any);
    }
  }, [user, loading, segments, rootNavigationState]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0fdf4" }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const segments = useSegments();
  const showLanguageToggle = segments.length === 0;

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: "transparent" } }}>

          {/* ─────────────────────────────────────────────────
              Auth screens  (gee-xgboost branch)
          ───────────────────────────────────────────────── */}
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />

          {/* ─────────────────────────────────────────────────
              Core / Land screens  (gee-xgboost branch)
          ───────────────────────────────────────────────── */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
          <Stack.Screen name="land/[id]" options={{ title: "Land Details" }} />
          <Stack.Screen name="land/list-land-form" options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen name="listings/detail" options={{ headerShown: false }} />
          <Stack.Screen name="listings/all" options={{ headerShown: false }} />
          <Stack.Screen name="admin/listing-detail" options={{ headerShown: false }} />
          <Stack.Screen name="admin/zones" options={{ headerShown: false }} />
          <Stack.Screen name="admin/add-zone" options={{ headerShown: false }} />

          {/* ─────────────────────────────────────────────────
              Standalone pricing screens  (pricing branch — app/)
              Files: invoice.tsx | modal.tsx | price-result.tsx
          ───────────────────────────────────────────────── */}
          <Stack.Screen name="invoice" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="price-result" options={{ headerShown: false }} />

          {/* ─────────────────────────────────────────────────
              Pricing & Logistics tab group  (pricing branch — app/(tabs)/)
          ───────────────────────────────────────────────── */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* ─────────────────────────────────────────────────
              Stock Prediction screens  (stock-prediction branch — app/(stock)/)
              Screens: ai-insights, cart, customer-dashboard,
                       customer-login, farmer-login, inventory-restock
          ───────────────────────────────────────────────── */}
          <Stack.Screen name="(stock)/ai-insights" options={{ headerShown: false }} />
          <Stack.Screen name="(stock)/cart" options={{ headerShown: false }} />
          <Stack.Screen name="(stock)/customer-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="(stock)/customer-login" options={{ headerShown: false }} />
          <Stack.Screen name="(stock)/farmer-login" options={{ headerShown: false }} />
          <Stack.Screen name="(stock)/inventory-restock" options={{ headerShown: false }} />
          <Stack.Screen name="(stock)/farmer-dashboard" options={{ headerShown: false }} />

        </Stack>

        {/* Global language toggle — hidden when in the Idle Land Mobilization (main) module */}
        {showLanguageToggle && <LanguageToggle />}
      </View>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <OrderProvider>
            <UserModeProvider>
              <GlobalProvider>
                <PushProvider>
                  <RootLayoutNav />
                </PushProvider>
              </GlobalProvider>
            </UserModeProvider>
          </OrderProvider>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
