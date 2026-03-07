import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Alert, Modal, FlatList, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { API_BASE_URL } from "../src/config";
import { ComplexitySearch } from "../components/ComplexitySearch";

const COMPONENTS = [
    {
        id: "idle_land",
        title: "Idle Land Mobilization",
        subtitle: "Identify & optimize unused land parcels using GEE & AI-driven analytics",
        icon: "🗺️",
        route: "/overview",
        active: true,
        colors: ["#0ba5e9", "#0284c7"], // Skly blue
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=600&auto=format&fit=crop",
    },
    {
        id: "buyer_intent",
        title: "Buyer Intent Analysis",
        subtitle: "Predict market demand and match buyers with agricultural opportunities",
        icon: "🎯",
        route: null,
        active: false,
        colors: ["#8b5cf6", "#7c3aed"], // Violet
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop",
    },
    {
        id: "crop_rec",
        title: "Crop Recommendation",
        subtitle: "AI-based insights for maximum yield and optimal resource usage",
        icon: "🌱",
        route: null,
        active: false,
        colors: ["#10b981", "#059669"], // Emerald
        image: "https://images.unsplash.com/photo-1592982537447-6f81fcbc7bc2?q=80&w=600&auto=format&fit=crop",
    },
    {
        id: "supply_chain",
        title: "Supply Chain & Market",
        subtitle: "Forecast pricing and manage logistics for agricultural outputs",
        icon: "📈",
        route: "/pricing/insights",
        active: true,
        colors: ["#f59e0b", "#d97706"], // Amber
        image: "https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=600&auto=format&fit=crop",
    },
];

type ThemeMode = "light" | "dark" | "farmer";

const getTheme = (mode: ThemeMode) => {
    if (mode === "farmer") {
        return {
            background: "#14532d", // deep green
            cardBg: "#166534", // darker green
            cardDisabledBg: "#14532d",
            textPrimary: "#f0fdf4",
            textHighlight: "#bbf7d0",
            textSecondary: "#86efac",
            textMuted: "#4ade80",
            borderColor: "rgba(255,255,255,0.05)",
            iconBg: "#15803d",
            badgeBg: "rgba(34, 197, 94, 0.15)",
            badgeBorder: "rgba(34, 197, 94, 0.3)",
            badgeText: "#86efac",
            statusInactiveBg: "rgba(134, 239, 172, 0.15)",
            statusInactiveText: "#86efac",
            shadowColor: "#000",
        };
    } else if (mode === "dark") {
        return {
            background: "#0f172a",
            cardBg: "#1e293b",
            cardDisabledBg: "#0f172a",
            textPrimary: "#f8fafc",
            textHighlight: "#ffffff",
            textSecondary: "#94a3b8",
            textMuted: "#64748b",
            borderColor: "rgba(255,255,255,0.05)",
            iconBg: "#334155",
            badgeBg: "rgba(56, 189, 248, 0.15)",
            badgeBorder: "rgba(56, 189, 248, 0.3)",
            badgeText: "#38bdf8",
            statusInactiveBg: "rgba(148, 163, 184, 0.15)",
            statusInactiveText: "#94a3b8",
            shadowColor: "#000",
        };
    } else {
        return {
            background: "#f8fafc", // A very clean light background
            cardBg: "#ffffff",
            cardDisabledBg: "#f1f5f9", // Slight gray for inactive cards
            textPrimary: "#0f172a", // Dark gray for high contrast
            textHighlight: "#16a34a", // Green emphasis
            textSecondary: "#475569", // Medium gray
            textMuted: "#64748b", // Visible subdued gray for disabled cards
            borderColor: "rgba(0,0,0,0.06)",
            iconBg: "#f1f5f9", // Clean icon bg in disabled/standard cards
            badgeBg: "rgba(22, 163, 74, 0.1)",
            badgeBorder: "rgba(22, 163, 74, 0.2)",
            badgeText: "#16a34a",
            statusInactiveBg: "rgba(100, 116, 139, 0.1)", // Gray for upcoming
            statusInactiveText: "#64748b", // Visible gray
            shadowColor: "rgba(0,0,0,0.05)",
        };
    }
};

export default function AppHome() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [themeMode, setThemeMode] = useState<ThemeMode>("light");
    const { user, token, logout } = useAuth();
    const { language, toggleLanguage: switchLanguage, langConfig } = useLanguage();

    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    const theme = getTheme(themeMode);

    const toggleTheme = () => {
        setThemeMode(prev => prev === "light" ? "dark" : prev === "dark" ? "farmer" : "light");
    };

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/user/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (e) {
            console.error("Failed to fetch notifications:", e);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [token]);

    const markAsRead = async (id: string, listingId: number) => {
        try {
            await fetch(`${API_BASE_URL}/api/v1/user/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setShowNotifications(false);
            if (listingId) {
                router.push({ pathname: "/listings/detail", params: { id: String(listingId) } } as any);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const handlePress = (route: string | null) => {
        if (route) {
            router.push(route as any);
        }
    };

    const handleLogout = () => {
        Alert.alert(langConfig['dash.logout'], langConfig['dash.logoutPrompt'], [
            { text: langConfig['dash.cancel'], style: 'cancel' },
            {
                text: langConfig['dash.logout'],
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/auth/login' as any);
                },
            },
        ]);
    };

    return (
        <View style={[{ flex: 1, backgroundColor: theme.background }]}>
            {/* Dynamic Background Accents */}
            <View style={[styles.bgAccent, styles.bgAccent1, { opacity: themeMode === "dark" || themeMode === "farmer" ? 0.15 : 0.08 }]} />
            <View style={[styles.bgAccent, styles.bgAccent2, { opacity: themeMode === "dark" || themeMode === "farmer" ? 0.1 : 0.05 }]} />

            <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>

                {/* Theme Toggle + User Header */}
                <View style={[styles.topNav, { paddingHorizontal: 20 }]}>
                    {user && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Text style={{ fontSize: 14, color: theme.textSecondary, fontWeight: '600' }}>
                                {langConfig['dash.hello']} {user.fullName}
                            </Text>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {user?.role !== 'admin' && (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.themeToggle,
                                    { backgroundColor: theme.cardBg, borderColor: theme.borderColor, position: 'relative' },
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => setShowNotifications(true)}
                            >
                                <Text style={styles.themeToggleIcon}>🔔</Text>
                                {unreadCount > 0 && (
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                                    </View>
                                )}
                            </Pressable>
                        )}
                        <Pressable
                            style={({ pressed }) => [
                                styles.themeToggle,
                                { backgroundColor: theme.cardBg, borderColor: theme.borderColor },
                                pressed && { opacity: 0.7 }
                            ]}
                            onPress={switchLanguage}
                        >
                            <Text style={styles.themeToggleIcon}>
                                {language === "en" ? "සිං" : "EN"}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.themeToggle,
                                { backgroundColor: theme.cardBg, borderColor: theme.borderColor },
                                pressed && { opacity: 0.7 }
                            ]}
                            onPress={toggleTheme}
                        >
                            <Text style={styles.themeToggleIcon}>
                                {themeMode === "light" ? "☀️" : themeMode === "dark" ? "🌙" : "🌾"}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.themeToggle,
                                { backgroundColor: theme.cardBg, borderColor: theme.borderColor },
                                pressed && { opacity: 0.7 }
                            ]}
                            onPress={handleLogout}
                        >
                            <Text style={styles.themeToggleIcon}>🚪</Text>
                        </Pressable>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header Area */}
                    <View style={styles.header}>
                        <View style={[styles.badge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                            <Text style={[styles.badgeText, { color: theme.badgeText }]}> {langConfig['dash.title']}</Text>
                        </View>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>{langConfig['dash.growSmarter']}</Text>
                        <Text style={[styles.titleHighlight, { color: theme.textHighlight }]}>{langConfig['dash.yieldBetter']}</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {langConfig['dash.subtitle']}
                        </Text>
                    </View>

                    {/* Cards Grid */}
                    <View style={styles.grid}>
                        {COMPONENTS.map((comp) => {
                            const isActive = comp.active;
                            return (
                                <Pressable
                                    key={comp.id}
                                    style={({ pressed }) => [
                                        styles.card,
                                        {
                                            backgroundColor: theme.cardBg,
                                            borderColor: isActive ? comp.colors[0] : theme.borderColor,
                                            borderWidth: isActive ? 2 : 1,
                                            shadowColor: theme.shadowColor
                                        },
                                        !isActive && { backgroundColor: theme.cardDisabledBg },
                                        pressed && isActive && styles.cardPressed
                                    ]}
                                    onPress={() => handlePress(comp.route)}
                                    disabled={!isActive}
                                >
                                    <View style={StyleSheet.absoluteFillObject}>
                                        <Image
                                            source={{ uri: comp.image }}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                opacity: themeMode === "light" ? 0.15 : 0.25,
                                                position: 'absolute'
                                            }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.iconContainer, { backgroundColor: isActive ? comp.colors[0] + '20' : theme.iconBg }]}>
                                            <Text style={styles.icon}>{comp.icon}</Text>
                                        </View>
                                        {isActive ? (
                                            <View style={styles.statusActive}>
                                                <View style={styles.statusDot} />
                                                <Text style={styles.statusActiveText}>{langConfig['dash.online']}</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.statusInactive, { backgroundColor: theme.statusInactiveBg }]}>
                                                <Text style={[styles.statusInactiveText, { color: theme.statusInactiveText }]}>{langConfig['dash.upcoming']}</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }, !isActive && { color: theme.textSecondary }]}>
                                        {langConfig[`mod.${comp.id === 'idle_land' ? 'idleLand' : comp.id === 'buyer_intent' ? 'buyerIntent' : comp.id === 'crop_rec' ? 'cropRec' : 'supplyChain'}.title`]}
                                    </Text>
                                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }, !isActive && { color: theme.textMuted }]}>
                                        {langConfig[`mod.${comp.id === 'idle_land' ? 'idleLand' : comp.id === 'buyer_intent' ? 'buyerIntent' : comp.id === 'crop_rec' ? 'cropRec' : 'supplyChain'}.sub`]}
                                    </Text>

                                    {isActive && (
                                        <View style={[styles.cardFooter, { backgroundColor: comp.colors[0] }]}>
                                            <Text style={styles.launchText}>{langConfig['dash.launch']}</Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                </ScrollView>

                {/* Notifications Modal */}
                <Modal visible={showNotifications} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.background, paddingBottom: insets.bottom + 20 }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{langConfig['dash.notifications']}</Text>
                                <Pressable onPress={() => setShowNotifications(false)} style={styles.closeBtn}>
                                    <Text style={styles.closeBtnText}>✕</Text>
                                </Pressable>
                            </View>

                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={[
                                            styles.notificationCard,
                                            { backgroundColor: theme.cardBg, borderColor: theme.borderColor },
                                            !item.read && { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder, borderWidth: 2 } // Highlight unread
                                        ]}
                                        onPress={() => markAsRead(item._id, item.listingId)}
                                    >
                                        <Text style={{ fontSize: 28, marginRight: 16 }}>
                                            {item.type === 'verified' ? '✅' : item.type === 'rejected' ? '❌' : '🔔'}
                                        </Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.notificationMessage, { color: theme.textPrimary }, !item.read && { fontWeight: '700' }]}>
                                                {item.message}
                                            </Text>
                                            <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
                                                {new Date(item.createdAt).toLocaleString()}
                                            </Text>
                                        </View>
                                        {!item.read && <View style={styles.unreadDot} />}
                                    </Pressable>
                                )}
                                ListEmptyComponent={
                                    <View style={{ padding: 40, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>No notifications yet.</Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    bgAccent: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    bgAccent1: {
        top: -50,
        left: -100,
        backgroundColor: "#38bdf8",
        transform: [{ scale: 1.5 }],
    },
    bgAccent2: {
        bottom: -100,
        right: -50,
        backgroundColor: "#10b981",
        transform: [{ scale: 1.2 }],
    },
    topNav: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingTop: 10,
        paddingBottom: 10,
    },
    themeToggle: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    themeToggleIcon: {
        fontSize: 14,
    },
    themeToggleText: {
        fontSize: 12,
        fontWeight: "700",
    },
    scrollContent: {
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 40,
    },
    badge: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 36,
        fontWeight: "300",
        letterSpacing: -0.5,
    },
    titleHighlight: {
        fontSize: 38,
        fontWeight: "800",
        letterSpacing: -1,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        maxWidth: "90%",
    },
    grid: {
        gap: 20,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        overflow: "hidden",
    },
    cardPressed: {
        transform: [{ scale: 0.98 }],
        borderColor: "#16a34a",
        shadowOpacity: 0.4,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    icon: {
        fontSize: 24,
    },
    statusActive: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#10b981",
    },
    statusActiveText: {
        color: "#10b981",
        fontSize: 12,
        fontWeight: "700",
    },
    statusInactive: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusInactiveText: {
        fontSize: 12,
        fontWeight: "600",
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "900",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "500",
        marginBottom: 16,
    },
    cardFooter: {
        marginTop: "auto",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignSelf: "flex-start",
    },
    launchText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    notificationBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748b',
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        alignItems: 'flex-start',
    },
    notificationMessage: {
        fontSize: 15,
        marginBottom: 6,
        lineHeight: 22,
    },
    notificationTime: {
        fontSize: 12,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#16a34a',
        marginTop: 6,
        marginLeft: 12,
    }
});
