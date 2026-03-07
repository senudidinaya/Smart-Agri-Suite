import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="logistics" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
