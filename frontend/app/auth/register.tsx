/**
 * Register Screen — Production-level, farmer-themed, light UI
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { register } = useAuth();

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [age, setAge] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'client' | 'admin' | 'helper' | 'farmer'>('client');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [secretCount, setSecretCount] = useState(0);

    const handleSecretTap = () => {
        setSecretCount(prev => prev + 1);
    };

    const handleRegister = async () => {
        if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please fill in all required fields.');
            return;
        }
        if (password.length < 4) {
            Alert.alert('Weak Password', 'Password must be at least 4 characters.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const message = await register({
                fullName: fullName.trim(),
                username: username.trim(),
                email: email.trim(),
                address: address.trim() || undefined,
                age: age ? parseInt(age, 10) : undefined,
                password,
                role,
            });

            Alert.alert('Success! 🎉', message || 'Account created. Please login.', [
                { text: 'Go to Login', onPress: () => router.replace('/auth/login' as any) },
            ]);
        } catch (e: any) {
            Alert.alert('Registration Failed', e.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Decorative Circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.headerSection}>
                        <Pressable
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.backButtonText}>← Back</Text>
                        </Pressable>
                        <View style={styles.headerContent}>
                            <Pressable onPress={handleSecretTap}>
                                <Text style={styles.headerEmoji}>🌱</Text>
                            </Pressable>
                            <Text style={styles.headerTitle}>Join Smart Agri</Text>
                            <Text style={styles.headerSubtitle}>
                                Create your account to start managing agricultural land
                            </Text>
                        </View>
                    </View>

                    {/* Form Card */}
                    <View style={styles.formCard}>
                        {/* Full Name */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Full Name *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput
                                    style={styles.input}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="e.g. Kamal Perera"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>
                        </View>

                        {/* Username */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Username *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🏷️</Text>
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Choose a username"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Email *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>📧</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="your@email.com"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Address (optional) */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Address</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>📍</Text>
                                <TextInput
                                    style={styles.input}
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder="Your address (optional)"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>
                        </View>

                        {/* Age (optional) */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Age</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🎂</Text>
                                <TextInput
                                    style={styles.input}
                                    value={age}
                                    onChangeText={setAge}
                                    placeholder="Your age (optional)"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Password *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Min 4 characters"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Confirm Password *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>🔐</Text>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter your password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <Text style={styles.errorText}>Passwords don't match</Text>
                            )}
                            {confirmPassword.length > 0 && password === confirmPassword && (
                                <Text style={styles.matchText}>✓ Passwords match</Text>
                            )}
                        </View>

                        {/* Role Selector */}
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputLabel}>Join as *</Text>
                            <View style={styles.roleGrid}>
                                <Pressable
                                    style={[styles.roleButton, role === 'client' && styles.roleButtonActive]}
                                    onPress={() => setRole('client')}
                                >
                                    <Text style={styles.roleEmoji}>👤</Text>
                                    <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>
                                        Client
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.roleButton, role === 'farmer' && styles.roleButtonActive]}
                                    onPress={() => setRole('farmer')}
                                >
                                    <Text style={styles.roleEmoji}>🧑‍🌾</Text>
                                    <Text style={[styles.roleText, role === 'farmer' && styles.roleTextActive]}>
                                        Farmer
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.roleButton, role === 'helper' && styles.roleButtonActive]}
                                    onPress={() => setRole('helper')}
                                >
                                    <Text style={styles.roleEmoji}>🤝</Text>
                                    <Text style={[styles.roleText, role === 'helper' && styles.roleTextActive]}>
                                        Helper
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Hidden Admin Override */}
                            {secretCount >= 5 && (
                                <Pressable
                                    style={[styles.adminToggle, role === 'admin' && styles.roleButtonActive]}
                                    onPress={() => setRole('admin')}
                                >
                                    <Text style={styles.roleEmoji}>🛡️</Text>
                                    <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>
                                        Admin (Unauthorized)
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Register Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.registerButton,
                                loading && styles.registerButtonDisabled,
                                pressed && !loading && styles.registerButtonPressed,
                            ]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.registerButtonText}>Create Account</Text>
                            )}
                        </Pressable>

                        {/* Back to Login */}
                        <Pressable
                            style={styles.loginLink}
                            onPress={() => router.replace('/auth/login' as any)}
                        >
                            <Text style={styles.loginLinkText}>
                                Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
                            </Text>
                        </Pressable>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4',
    },
    circle1: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: '#bbf7d0',
        top: -60,
        left: -60,
        opacity: 0.4,
    },
    circle2: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#fef08a',
        bottom: 40,
        right: -40,
        opacity: 0.3,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerSection: {
        marginBottom: 24,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 12,
    },
    backButtonText: {
        fontSize: 16,
        color: '#16a34a',
        fontWeight: '700',
    },
    headerContent: {
        alignItems: 'center',
    },
    headerEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#14532d',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
        maxWidth: '85%',
    },
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    inputWrapper: {
        marginBottom: 18,
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
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        fontWeight: '500',
    },
    eyeButton: {
        padding: 6,
        marginLeft: 4,
    },
    eyeIcon: {
        fontSize: 16,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 4,
    },
    matchText: {
        color: '#16a34a',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
        marginLeft: 4,
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleButton: {
        flex: 1,
        minWidth: '30%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        gap: 4,
    },
    adminToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#fee2e2',
        backgroundColor: '#fef2f2',
        marginTop: 12,
        gap: 8,
    },
    roleButtonActive: {
        borderColor: '#16a34a',
        backgroundColor: '#f0fdf4',
    },
    roleEmoji: {
        fontSize: 20,
    },
    roleText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748b',
    },
    roleTextActive: {
        color: '#16a34a',
    },
    registerButton: {
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
    registerButtonDisabled: {
        backgroundColor: '#86efac',
        shadowOpacity: 0,
    },
    registerButtonPressed: {
        transform: [{ scale: 0.97 }],
        shadowOpacity: 0.2,
    },
    registerButtonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    loginLink: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 8,
    },
    loginLinkText: {
        fontSize: 14,
        color: '#64748b',
    },
    loginLinkBold: {
        color: '#16a34a',
        fontWeight: '800',
    },
});
