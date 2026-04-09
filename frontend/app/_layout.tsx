import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { OrderProvider } from "../context/OrderContext";
import { LanguageProvider } from "../context/LanguageContext";
import { CartProvider } from "../context/CartContext";
import { UserProvider } from "../context/UserContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";


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
      <LanguageProvider>
        <UserProvider>
          <CartProvider>
            <OrderProvider>
              <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
              </View>
            </OrderProvider>
          </CartProvider>
        </UserProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
