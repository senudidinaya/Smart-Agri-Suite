import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolateColor,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const Particle = ({ startX, startY, size, duration, delay }: any) => {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            translateY.value = withRepeat(
                withTiming(-height * 0.8, { duration, easing: Easing.linear }),
                -1,
                false
            );
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.4, { duration: duration * 0.2 }),
                    withTiming(0.4, { duration: duration * 0.6 }),
                    withTiming(0, { duration: duration * 0.2 })
                ),
                -1,
                false
            );
        }, delay);
        return () => clearTimeout(timeout);
    }, [delay, duration]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.particle,
                { left: startX, top: startY, width: size, height: size, borderRadius: size / 2 },
                style,
            ]}
        />
    );
};

export default function AnimatedBackground() {
    const colorShift = useSharedValue(0);

    useEffect(() => {
        colorShift.value = withRepeat(
            withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
    }, []);

    const bgStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            colorShift.value,
            [0, 1],
            ['#F8FAFC', '#F0FDF4'] // Subtle green shift
        );
        return { backgroundColor };
    });

    const particles = useMemo(() => {
        return Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            startX: Math.random() * width,
            startY: height + Math.random() * 200, // Start slightly below screen
            size: Math.random() * 8 + 4,
            duration: 12000 + Math.random() * 20000,
            delay: Math.random() * 8000,
        }));
    }, []);

    return (
        <Animated.View style={[StyleSheet.absoluteFill, bgStyle, { zIndex: -1 }]}>
            {particles.map((p) => (
                <Particle key={p.id} {...p} />
            ))}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    particle: {
        position: 'absolute',
        backgroundColor: '#10B981', // Agritech Green
    },
});
