import React, { createContext, useContext, PropsWithChildren } from "react";
import { colors } from "./colors";
type Theme = { colors: typeof colors };
const ThemeContext = createContext<Theme>({ colors });

export function ThemeProvider({ children }: PropsWithChildren) {
  return <ThemeContext.Provider value={{ colors }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
