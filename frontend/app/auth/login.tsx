/**
 * Login Screen — Production-level, farmer-themed, light UI
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please enter both username and password.');
            return;
        }

        setLoading(true);
        try {
            await login(username.trim(), password);
            router.replace('/');
        } catch (e: any) {
            Alert.alert('Login Failed', e.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Decorative Circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Top Section — Branding */}
                    <View style={styles.brandSection}>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoCircle}>
                                <Text style={styles.logoEmoji}>🌾</Text>
                            </View>
                            <View style={styles.logoGlow} />
                        </View>
                        <Text style={styles.appName}>Smart Agri-Suite</Text>
                        <Text style={styles.appTagline}>Empowering Sri Lankan Agriculture</Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Welcome Back</Text>
                        <Text style={styles.formSubtitle}>Sign in to continue managing your lands</Text>

                        {/* Username Field */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Enter your username"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password Field */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Login Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.loginButton,
                                loading && styles.loginButtonDisabled,
                                pressed && !loading && styles.loginButtonPressed,
                            ]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </Pressable>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Register Link */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.registerButton,
                                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                            ]}
                            onPress={() => router.push('/auth/register' as any)}
                        >
                            <Text style={styles.registerButtonText}>Create New Account</Text>
                        </Pressable>
                    </View>

                    {/* Bottom Text */}
                    <View style={styles.bottomSection}>
                        <Text style={styles.bottomText}>🌿 Idle Land Mobilization System</Text>
                        <Text style={styles.versionText}>Version 2.3.0</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4', // Very light green
    },
    circle1: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: '#bbf7d0',
        top: -80,
        right: -60,
        opacity: 0.5,
    },
    circle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#a7f3d0',
        bottom: 60,
        left: -80,
        opacity: 0.4,
    },
    circle3: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#fef08a',
        top: 200,
        left: -30,
        opacity: 0.3,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    brandSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    logoCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 3,
        borderColor: '#dcfce7',
    },
    logoGlow: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#22c55e',
        opacity: 0.08,
        top: -10,
        left: -10,
    },
    logoEmoji: {
        fontSize: 44,
    },
    appName: {
        fontSize: 30,
        fontWeight: '800',
        color: '#14532d',
        letterSpacing: -0.5,
    },
    appTagline: {
        fontSize: 14,
        color: '#4ade80',
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    formTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 28,
        lineHeight: 20,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#0f172a',
        fontWeight: '500',
    },
    eyeButton: {
        padding: 8,
        marginLeft: 4,
    },
    eyeIcon: {
        fontSize: 18,
    },
    loginButton: {
        backgroundColor: '#16a34a',
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    loginButtonDisabled: {
        backgroundColor: '#86efac',
        shadowOpacity: 0,
    },
    loginButtonPressed: {
        transform: [{ scale: 0.97 }],
        shadowOpacity: 0.2,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    dividerText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
        marginHorizontal: 16,
    },
    registerButton: {
        borderRadius: 16,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.04)',
    },
    registerButtonText: {
        color: '#16a34a',
        fontSize: 16,
        fontWeight: '700',
    },
    bottomSection: {
        alignItems: 'center',
        marginTop: 32,
        paddingBottom: 20,
    },
    bottomText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    versionText: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
    },
});
