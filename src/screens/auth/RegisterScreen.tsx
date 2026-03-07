import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen({ navigation }: any) {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'client' | 'farmer'>('client');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !username || !email || !password) {
            Alert.alert('Error', 'Please fill all fields.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/register', {
                fullName,
                username,
                email,
                password,
                role,
            });
            Alert.alert('Success', 'Registration successful! Please login.');
            navigation.navigate('Login');
        } catch (error: any) {
            console.log('Register error', error.response?.data || error.message);
            let errorMessage = 'An error occurred';
            if (error.response?.data?.detail) {
                if (typeof error.response.data.detail === 'string') {
                    errorMessage = error.response.data.detail;
                } else if (Array.isArray(error.response.data.detail)) {
                    errorMessage = error.response.data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
                } else {
                    errorMessage = JSON.stringify(error.response.data.detail);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            Alert.alert('Registration Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join the Spice Marketplace</Text>

                <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
                <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

                <Text style={styles.roleLabel}>I want to join as a:</Text>
                <View style={styles.roleContainer}>
                    <TouchableOpacity
                        style={[styles.roleButton, role === 'client' && styles.roleButtonActive]}
                        activeOpacity={0.8}
                        onPress={() => setRole('client')}>
                        <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>🛍️  Shopper</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleButton, role === 'farmer' && styles.roleButtonActive]}
                        activeOpacity={0.8}
                        onPress={() => setRole('farmer')}>
                        <Text style={[styles.roleText, role === 'farmer' && styles.roleTextActive]}>🚜  Farmer</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.link}>Login Here</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 24, justifyContent: 'center', flexGrow: 1 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
    input: { backgroundColor: '#f0f2f5', padding: 18, borderRadius: 12, marginBottom: 16, fontSize: 16, color: '#333' },
    roleLabel: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 12, marginTop: 8 },
    roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    roleButton: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#eee', alignItems: 'center', marginHorizontal: 6, backgroundColor: '#fff' },
    roleButtonActive: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
    roleText: { color: '#888', fontWeight: 'bold', fontSize: 16 },
    roleTextActive: { color: '#4CAF50' },
    button: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 24, elevation: 3, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
    footer: { flexDirection: 'row', justifyContent: 'center' },
    link: { color: '#4CAF50', fontWeight: 'bold' },
});
