import { useEffect } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import { ActivityIndicator, View } from "react-native";

/**
 * Auth gate — redirects to login if not authenticated,
 * and away from login if already authenticated.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until AuthContext finishes loading AND the root navigator is fully mounted
    if (loading || !rootNavigationState?.key) return;

    const inAuthGroup = (segments[0] as string) === "auth";

    if (!user && !inAuthGroup) {
      // Not logged in and not on auth screens → redirect to login
      router.replace("/auth/login" as any);
    } else if (user && inAuthGroup) {
      // Logged in but on auth screens → redirect to home
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
  return (
    <AuthGate>
      <Stack>
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="cultivator" options={{ headerShown: false }} />
        <Stack.Screen name="land/[id]" options={{ title: "Land Details" }} />
        <Stack.Screen name="admin/listing-detail" options={{ headerShown: false }} />
        <Stack.Screen name="admin/zones" options={{ headerShown: false }} />
        <Stack.Screen name="admin/add-zone" options={{ headerShown: false }} />
        <Stack.Screen name="listings/detail" options={{ headerShown: false }} />
        <Stack.Screen name="listings/all" options={{ headerShown: false }} />
        <Stack.Screen name="land/list-land-form" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <RootLayoutNav />
      </LanguageProvider>
    </AuthProvider>
  );
}
