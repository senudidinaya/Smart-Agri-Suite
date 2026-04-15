import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrders } from '../../context/OrderContext';
import { useUser } from '../../context/UserContext';

export default function CustomerHome() {
    const router = useRouter();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { orders } = useOrders();
    const { profile } = useUser();

    const activeOrderCount = profile.name
        ? orders.filter(o =>
            (o.customer === profile.name || o.customer?.includes(profile.name)) &&
            (o.status === 'PENDING' || o.status === 'ACCEPTED' || o.status === 'IN_TRANSIT')
          ).length
        : 0;

    const sections = [
        {
            key: 'myOrders' as const,
            title: t('marketplace'),
            desc: t('aiPricing'),
            icon: "compass-outline",
            colors: ["#6366F1", "#4F46E5"] as [string, string],
            route: "/(customer)/marketplace"
        },
        {
            key: 'orders' as const,
            title: t('myOrders'),
            desc: t('logisticsTracking'),
            icon: "cube-outline",
            colors: ["#10B981", "#059669"] as [string, string],
            route: "/(customer)/orders"
        },
        {
            key: 'profile' as const,
            title: t('profile'),
            desc: t('warehouseSettings'),
            icon: "person-outline",
            colors: ["#F59E0B", "#D97706"] as [string, string],
            route: "/(customer)/profile"
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 3D Glass Hero Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.heroWrapper}>
                    <View style={[styles.hero3DEffect, { backgroundColor: theme.bgSecondary }]} />
                    <LinearGradient
                        colors={theme.mode === 'dark'
                            ? ['rgba(30,41,59,0.95)', 'rgba(30,41,59,0.8)']
                            : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                        style={[styles.hero, { borderColor: theme.border }]}
                    >
                        <View style={styles.heroTextContainer}>
                            <Text style={[styles.welcome, { color: theme.textMuted }]}>{t('welcomeBack')}</Text>
                            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>{t('smartAgri')}</Text>
                            <Text style={[styles.brandSubtitle, { color: theme.indigo }]}>{t('customerPortal')}</Text>
                            <View style={[styles.statusChip, { backgroundColor: theme.mode === 'dark' ? '#0f2e22' : '#F0FDF4' }]}>
                                <View style={styles.pulseDot} />
                                <Text style={[styles.statusText, { color: theme.mode === 'dark' ? '#34d399' : '#166534' }]}>
                                    {t('networkActive')}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.hero3DIcon}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.iconCircle}>
                                <Ionicons name="leaf" size={40} color="#fff" />
                            </LinearGradient>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Quick Access Grid */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('quickAccess')}</Text>
                <View style={styles.grid}>
                    {sections.map((section, index) => (
                        <Animated.View
                            key={section.key}
                            entering={FadeInUp.delay(300 + (index * 100))}
                            style={styles.gridItemWrapper}
                        >
                            <Pressable
                                style={({ pressed }) => [
                                    styles.gridCard,
                                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                                    pressed && { transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => router.push(section.route as any)}
                            >
                                <LinearGradient colors={section.colors} style={styles.gridIconBox}>
                                    <Ionicons name={section.icon as any} size={28} color="#fff" />
                                </LinearGradient>
                                {section.key === 'orders' && activeOrderCount > 0 && (
                                    <View style={styles.cardBadge}>
                                        <Text style={styles.cardBadgeText}>{activeOrderCount}</Text>
                                    </View>
                                )}
                                <Text style={[styles.gridTitle, { color: theme.textPrimary }]}>{section.title}</Text>
                                <Text style={[styles.gridDesc, { color: theme.textMuted }]}>{section.desc}</Text>
                            </Pressable>
                            <View style={[styles.gridShadow, { backgroundColor: section.colors[1] }]} />
                        </Animated.View>
                    ))}
                </View>

                {/* How it works Card */}
                <Animated.View entering={FadeInDown.delay(700)} style={styles.infoCardWrapper}>
                    <View style={[styles.infoCard, { backgroundColor: theme.bgSecondary }]}>
                        <View style={styles.infoCardHeader}>
                            <Ionicons name="sparkles" size={20} color={theme.indigo} />
                            <Text style={[styles.infoCardTitle, { color: theme.textPrimary }]}>{t('quickGuide')}</Text>
                        </View>
                        {[
                            { num: '01', text: t('guideStep1') },
                            { num: '02', text: t('guideStep2') },
                            { num: '03', text: t('guideStep3') },
                        ].map(step => (
                            <View key={step.num} style={styles.step}>
                                <Text style={[styles.stepNum, { color: theme.indigo }]}>{step.num}</Text>
                                <Text style={[styles.stepText, { color: theme.textMuted }]}>{step.text}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Switch Role Button */}
                <Animated.View entering={FadeInUp.delay(900)} style={styles.switchRoleWrapper}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.switchRoleBtn,
                            { backgroundColor: theme.bgCard, borderColor: theme.border },
                            pressed && { transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={() => router.replace('/auth')}
                    >
                        <Ionicons name="swap-horizontal" size={20} color={theme.textMuted} />
                        <Text style={[styles.switchRoleText, { color: theme.textMuted }]}>{t('switchRole')}</Text>
                    </Pressable>
                </Animated.View>

                <View style={styles.spacing} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingTop: 10 },

    heroWrapper: { marginBottom: 32, position: 'relative' },
    hero3DEffect: { position: 'absolute', top: 20, left: 20, right: 20, bottom: -10, borderRadius: 32, opacity: 0.5 },
    hero: {
        borderRadius: 32, padding: 28, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    },
    heroTextContainer: { flex: 1 },
    welcome: { fontFamily: 'Poppins_500Medium', fontSize: 13, letterSpacing: 1 },
    brandTitle: { fontFamily: 'Poppins_700Bold', fontSize: 32, lineHeight: 36 },
    brandSubtitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, marginTop: 2 },
    statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 12 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
    statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, textTransform: 'uppercase' },
    hero3DIcon: { alignItems: 'center', justifyContent: 'center' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowOpacity: 0.3, shadowRadius: 10, zIndex: 2 },

    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
    gridItemWrapper: { width: '47%', height: 180, position: 'relative' },
    gridCard: { flex: 1, borderRadius: 24, padding: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 1 },
    gridShadow: { position: 'absolute', bottom: -6, left: 10, right: 10, height: 20, borderRadius: 20, opacity: 0.2, zIndex: 1 },
    gridIconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 5 },
    cardBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: '#10B981', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
    cardBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_700Bold' },
    gridTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
    gridDesc: { fontFamily: 'Poppins_400Regular', fontSize: 11, textAlign: 'center', marginTop: 4 },

    infoCardWrapper: { marginTop: 32 },
    infoCard: { borderRadius: 32, padding: 28, elevation: 4 },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    infoCardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
    stepNum: { fontFamily: 'Poppins_700Bold', fontSize: 12 },
    stepText: { fontFamily: 'Poppins_400Regular', fontSize: 14, flex: 1, lineHeight: 20 },

    switchRoleWrapper: { marginTop: 40, alignItems: 'center' },
    switchRoleBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    switchRoleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    spacing: { height: 60 },
});
