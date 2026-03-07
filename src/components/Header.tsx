import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
    title: string;
    themeColor?: string;
    showBackButton?: boolean;
    onBack?: () => void;
}

export default function Header({ title, themeColor = '#4CAF50', showBackButton = false, onBack }: HeaderProps) {
    const { user, logout } = useContext(AuthContext);
    const [profileVisible, setProfileVisible] = useState(false);

    const getInitial = () => {
        if (user?.fullName) return user.fullName.charAt(0).toUpperCase();
        if (user?.username) return user.username.charAt(0).toUpperCase();
        return '?';
    };

    const handleLogout = async () => {
        setProfileVisible(false);
        await logout();
    };

    return (
        <View style={styles.headerContainer}>
            <View style={styles.leftSection}>
                {showBackButton && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>{title}</Text>
            </View>

            <TouchableOpacity
                style={[styles.avatarContainer, { backgroundColor: themeColor }]}
                onPress={() => setProfileVisible(true)}
            >
                <Text style={styles.avatarText}>{getInitial()}</Text>
            </TouchableOpacity>

            <Modal visible={profileVisible} animationType="fade" transparent={true}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.profileCard}>
                        <View style={styles.profileHeader}>
                            <View style={[styles.largeAvatar, { backgroundColor: themeColor }]}>
                                <Text style={styles.largeAvatarText}>{getInitial()}</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
                                <Text style={styles.userRole}>@{user?.username} • {user?.role}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={24} color="#F44336" />
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2C3E50',
        letterSpacing: 0.5,
    },
    avatarContainer: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16,
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: 280,
        padding: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    largeAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    largeAvatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    userInfo: {
        marginLeft: 16,
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        color: '#777',
        textTransform: 'capitalize',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FFF1F0',
    },
    logoutText: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#F44336',
    },
});
