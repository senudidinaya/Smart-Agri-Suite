import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;

  // Backgrounds
  bg: string;
  bgSecondary: string;
  bgCard: string;
  bgInput: string;
  bgTab: string;
  bgChip: string;
  bgModalBackdrop: string;

  // Borders
  border: string;
  borderFocus: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Brand colors (always same in light/dark)
  green: string;
  greenDark: string;
  indigo: string;
  indigoDark: string;
  amber: string;
  red: string;
  blue: string;

  // Surface shadows
  shadow: string;
  shadowOpacity: number;

  // Special
  heroGradient: [string, string];
  cardShadowBg: string;

  // Tab bars
  tabBg: string;
  tabActiveTint: string;
  tabInactiveTint: string;
}

const lightTheme: Theme = {
  mode: 'light',

  bg: '#F8FAFC',
  bgSecondary: '#F1F5F9',
  bgCard: '#FFFFFF',
  bgInput: '#FFFFFF',
  bgTab: '#FFFFFF',
  bgChip: '#F8FAFC',
  bgModalBackdrop: 'rgba(15,23,42,0.45)',

  border: '#F1F5F9',
  borderFocus: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#1E293B',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  green: '#10B981',
  greenDark: '#059669',
  indigo: '#6366F1',
  indigoDark: '#4F46E5',
  amber: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',

  shadow: '#000',
  shadowOpacity: 0.08,

  heroGradient: ['#F0FDF4', '#F8FAFC'],
  cardShadowBg: '#E2E8F0',

  tabBg: '#FFFFFF',
  tabActiveTint: '#10B981',
  tabInactiveTint: '#CBD5E1',
};

const darkTheme: Theme = {
  mode: 'dark',

  bg: '#0F172A',
  bgSecondary: '#1E293B',
  bgCard: '#1E293B',
  bgInput: '#253347',
  bgTab: '#1E293B',
  bgChip: '#253347',
  bgModalBackdrop: 'rgba(0,0,0,0.7)',

  border: '#334155',
  borderFocus: '#475569',

  textPrimary: '#F1F5F9',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  textInverse: '#0F172A',

  green: '#10B981',
  greenDark: '#059669',
  indigo: '#818CF8',
  indigoDark: '#6366F1',
  amber: '#FBBF24',
  red: '#F87171',
  blue: '#60A5FA',

  shadow: '#000',
  shadowOpacity: 0.5,

  heroGradient: ['#1E293B', '#0F172A'],
  cardShadowBg: '#0F172A',

  tabBg: '#1E293B',
  tabActiveTint: '#10B981',
  tabInactiveTint: '#475569',
};

interface ThemeContextProps {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
