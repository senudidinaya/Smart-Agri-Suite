import { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/shared/theme/useTheme";

export function Screen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>{children}</SafeAreaView>;
}
