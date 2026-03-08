import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserModeProvider } from '@/context/UserModeContext';
import { GlobalProvider } from '@/context/GlobalContext';
import { PushProvider } from '@/components/common/PushNotificationService';

export default function RootLayout() {
  return (
    <UserModeProvider>
      <GlobalProvider>
        <PushProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#f0f2f5' },
            }}
          />
        </PushProvider>
      </GlobalProvider>
    </UserModeProvider>
  );
}
