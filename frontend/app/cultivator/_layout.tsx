/**
 * Cultivator Module Root Layout
 * Handles role-based routing for cultivator screens
 * - client role → client tabs
 * - interviewer role → admin tabs / applications
 */

import { useEffect, useRef } from 'react';
import { useRouter, Stack, usePathname } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { cultivatorApi as cultivatorApi } from '@/api/cultivatorApi';

export default function CultivatorLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Role-based redirect
  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      // Not logged in - redirect to login
      router.replace('/auth/login');
      return;
    }

    // Interviewer/admin roles → admin applications
    if (user.role === 'interviewer' || user.role === 'admin') {
      router.replace('/cultivator/admin/applications');
    }
    // Client/helper roles → client tabs
    else if (user.role === 'client' || user.role === 'helper') {
      router.replace('/cultivator/client/profile');
    }
    // Fallback: other roles go to client
    else {
      router.replace('/cultivator/client/profile');
    }
  }, [user?.role, loading]);

  // Keep API auth token in sync with AsyncStorage-backed session.
  useEffect(() => {
    cultivatorApi.init().catch(() => {
      // Ignore one-time init errors; subsequent requests will still attempt auth.
    });
  }, []);

  // Poll for incoming calls (parity with original analyzer App.tsx behavior).
  useEffect(() => {
    if (loading || !user) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const canPoll = user.role === 'client' || user.role === 'interviewer' || user.role === 'admin';
    const inCallFlow =
      pathname?.startsWith('/cultivator/incoming-call') ||
      pathname?.startsWith('/cultivator/call') ||
      pathname?.startsWith('/cultivator/admin/call');

    if (!canPoll || inCallFlow) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const pollIncoming = async () => {
      try {
        const response = await cultivatorApi.checkIncomingCall();
        if (!cancelled && response.hasIncomingCall && response.callId) {
          router.replace({
            pathname: '/cultivator/incoming-call',
            params: {
              callId: response.callId,
              interviewerUsername: response.adminUsername || response.interviewerUsername || 'Interviewer',
              jobTitle: response.jobTitle || 'Job Application',
              agora: response.agora ? JSON.stringify(response.agora) : '',
              roomName: response.roomName || '',
            },
          });
        }
      } catch {
        // Silent failure by design to keep polling resilient.
      }
    };

    pollIncoming();
    pollRef.current = setInterval(pollIncoming, 3000);

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#27ae60" />
      </View>
    );
  }

  if (!user) {
    return null; // Will redirect above
  }

  // Render stack with all cultivator screens
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Client routes */}
      <Stack.Screen 
        name="client" 
        options={{ headerShown: false }}
      />

      {/* Admin routes */}
      <Stack.Screen 
        name="admin/applications" 
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="admin/in-person-interview"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="analysis/view"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />

      {/* Shared call screens (modal overlays) */}
      <Stack.Screen 
        name="call" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
        }} 
      />
      <Stack.Screen 
        name="admin/call" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
        }} 
      />
      <Stack.Screen 
        name="incoming-call" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
        }} 
      />
    </Stack>
  );
}
