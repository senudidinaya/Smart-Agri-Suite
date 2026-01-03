import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="land/[id]" options={{ title: "Land Details" }} />
    </Stack>
  );
}
