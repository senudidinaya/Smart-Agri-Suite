import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonCardProps {
  height?: number;
  width?: string | number;
  borderRadius?: number;
  marginBottom?: number;
}

export const SkeletonCard = ({
  height = 160,
  width = '100%',
  borderRadius = 24,
  marginBottom = 16
}: SkeletonCardProps) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          height, width, borderRadius, marginBottom, opacity,
          backgroundColor: theme.mode === 'dark' ? '#334155' : '#E2E8F0',
        }
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {},
});
