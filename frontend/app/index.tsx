import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const COMPONENTS = [
    {
        id: "idle_land",
        title: "Idle Land Mobilization",
        subtitle: "Identify & optimize unused land parcels using GEE & AI-driven analytics",
        icon: "🗺️",
        route: "/overview",
        active: true,
        colors: ["#0ea5e9", "#0284c7"], // Skly blue
    },
    {
        id: "buyer_intent",
        title: "Buyer Intent Analysis",
        subtitle: "Predict market demand and match buyers with agricultural opportunities",
        icon: "🎯",
        route: null,
        active: false,
        colors: ["#8b5cf6", "#7c3aed"], // Violet
    },
    {
        id: "crop_rec",
        title: "Crop Recommendation",
        subtitle: "AI-based insights for maximum yield and optimal resource usage",
        icon: "🌱",
        route: null,
        active: false,
        colors: ["#10b981", "#059669"], // Emerald
    },
    {
        id: "supply_chain",
        title: "Supply Chain & Market",
        subtitle: "Forecast pricing and manage logistics for agricultural outputs",
        icon: "📈",
        route: null,
        active: false,
        colors: ["#f59e0b", "#d97706"], // Amber
    },
];

const getTheme = (isDark: boolean) => ({
    background: isDark ? "#0f172a" : "#f8fafc",
    cardBg: isDark ? "#1e293b" : "#ffffff",
    cardDisabledBg: isDark ? "#0f172a" : "#f1f5f9",
    textPrimary: isDark ? "#f8fafc" : "#0f172a",
    textHighlight: isDark ? "#ffffff" : "#000000",
    textSecondary: isDark ? "#94a3b8" : "#475569",
    textMuted: isDark ? "#64748b" : "#94a3b8",
    borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    iconBg: isDark ? "#334155" : "#e2e8f0",
    badgeBg: isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(14, 165, 233, 0.1)",
    badgeBorder: isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(14, 165, 233, 0.2)",
    badgeText: isDark ? "#38bdf8" : "#0ea5e9",
    statusInactiveBg: isDark ? "rgba(148, 163, 184, 0.1)" : "rgba(100, 116, 139, 0.1)",
    statusInactiveText: isDark ? "#94a3b8" : "#64748b",
    shadowColor: isDark ? "#000" : "rgba(0,0,0,0.15)",
});

export default function AppHome() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isDarkMode, setIsDarkMode] = useState(true);

    const theme = getTheme(isDarkMode);

    const handlePress = (route: string | null) => {
        if (route) {
            router.push(route as any);
        }
    };

    return (
        <View style={[{ flex: 1, backgroundColor: theme.background }]}>
            {/* Dynamic Background Accents */}
            <View style={[styles.bgAccent, styles.bgAccent1, { opacity: isDarkMode ? 0.15 : 0.08 }]} />
            <View style={[styles.bgAccent, styles.bgAccent2, { opacity: isDarkMode ? 0.1 : 0.05 }]} />

            <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>

                {/* Theme Toggle Header */}
                <View style={[styles.topNav, { paddingHorizontal: 20 }]}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.themeToggle,
                            { backgroundColor: theme.cardBg, borderColor: theme.borderColor },
                            pressed && { opacity: 0.7 }
                        ]}
                        onPress={() => setIsDarkMode(!isDarkMode)}
                    >
                        <Text style={styles.themeToggleIcon}>
                            {isDarkMode ? "☀️" : "🌙"}
                        </Text>
                        <Text style={[styles.themeToggleText, { color: theme.textSecondary }]}>
                            {isDarkMode ? "Light Mode" : "Dark Mode"}
                        </Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header Area */}
                    <View style={styles.header}>
                        <View style={[styles.badge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                            <Text style={[styles.badgeText, { color: theme.badgeText }]}>AgriTech System V2.0</Text>
                        </View>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>Agricultural</Text>
                        <Text style={[styles.titleHighlight, { color: theme.textHighlight }]}>Intelligence Hub</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            Select a module below to access predictive analytics, satellite insights, and market intelligence.
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
                                            borderColor: theme.borderColor,
                                            shadowColor: theme.shadowColor
                                        },
                                        !isActive && { backgroundColor: theme.cardDisabledBg, opacity: isDarkMode ? 0.6 : 0.8 },
                                        pressed && isActive && styles.cardPressed
                                    ]}
                                    onPress={() => handlePress(comp.route)}
                                    disabled={!isActive}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.iconContainer, { backgroundColor: isActive ? comp.colors[0] + '20' : theme.iconBg }]}>
                                            <Text style={styles.icon}>{comp.icon}</Text>
                                        </View>
                                        {isActive ? (
                                            <View style={styles.statusActive}>
                                                <View style={styles.statusDot} />
                                                <Text style={styles.statusActiveText}>Online</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.statusInactive, { backgroundColor: theme.statusInactiveBg }]}>
                                                <Text style={[styles.statusInactiveText, { color: theme.statusInactiveText }]}>Upcoming</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }, !isActive && { color: theme.textSecondary }]}>{comp.title}</Text>
                                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }, !isActive && { color: theme.textMuted }]}>{comp.subtitle}</Text>

                                    {isActive && (
                                        <View style={[styles.cardFooter, { backgroundColor: comp.colors[0] }]}>
                                            <Text style={styles.launchText}>Launch Module  →</Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                </ScrollView>
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
        borderColor: "#38bdf8",
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
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    cardFooter: {
        alignSelf: "flex-start",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 4,
    },
    launchText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 14,
    }
});
