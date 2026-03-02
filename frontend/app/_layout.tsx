import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="land/[id]" options={{ title: "Land Details" }} />
      <Stack.Screen name="admin/listing-detail" options={{ headerShown: false }} />
      <Stack.Screen name="admin/zones" options={{ headerShown: false }} />
      <Stack.Screen name="admin/add-zone" options={{ headerShown: false }} />
      <Stack.Screen name="listings/detail" options={{ headerShown: false }} />
      <Stack.Screen name="listings/all" options={{ headerShown: false }} />
      <Stack.Screen name="land/list-land-form" options={{ headerShown: false, presentation: "fullScreenModal" }} />
    </Stack>
  );
}
