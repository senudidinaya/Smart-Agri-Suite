import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const LEAF_COUNT = 12;

const FallingLeaf = ({ index }: { index: number }) => {
  const startX = Math.random() * width;
  const size = 16 + Math.random() * 12;
  const duration = 6000 + Math.random() * 4000;
  const delay = Math.random() * 5000;
  const swing = 20 + Math.random() * 40;

  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(startX);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(height + 50, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(startX + swing, { duration: duration / 4, easing: Easing.inOut(Easing.ease) }),
          withTiming(startX - swing, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(startX, { duration: duration / 4, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: duration * 0.8, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // Using opacity between 0.25 and 0.35 per requirements
  const leafOpacity = 0.25 + Math.random() * 0.1;

  return (
    <Animated.View style={[styles.leaf, animatedStyle]}>
      <Ionicons name="leaf" size={size} color="#10B981" style={{ opacity: leafOpacity }} />
    </Animated.View>
  );
};

export default function FallingLeavesBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: LEAF_COUNT }).map((_, i) => (
        <FallingLeaf key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  leaf: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
