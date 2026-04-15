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
import { StockProvider } from "../context/StockContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";

function AppContent() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </View>
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
      <ThemeProvider>
        <LanguageProvider>
          <UserProvider>
            <StockProvider>
              <CartProvider>
                <OrderProvider>
                  <AppContent />
                </OrderProvider>
              </CartProvider>
            </StockProvider>
          </UserProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
