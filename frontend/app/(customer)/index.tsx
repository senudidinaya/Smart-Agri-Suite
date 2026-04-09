import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function CustomerHome() {
    const router = useRouter();
    const { t } = useLanguage();

    const sections = [
        {
            title: t('marketplace'),
            desc: t('aiPricing'),
            icon: "compass-outline",
            colors: ["#6366F1", "#4F46E5"],
            route: "/(customer)/marketplace"
        },
        {
            title: t('myOrders'),
            desc: t('logisticsTracking'),
            icon: "cube-outline",
            colors: ["#10B981", "#059669"],
            route: "/(customer)/orders"
        },
        {
            title: t('profile'),
            desc: t('warehouseSettings'),
            icon: "person-outline",
            colors: ["#F59E0B", "#D97706"],
            route: "/(customer)/profile"
        }
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient 
                colors={['#F8FAFC', '#F1F5F9']} 
                style={StyleSheet.absoluteFill} 
            />
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* 3D Glass Hero Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(800)} style={styles.heroWrapper}>
                    <View style={styles.hero3DEffect} />
                    <LinearGradient
                        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                        style={styles.hero}
                    >
                        <View style={styles.heroTextContainer}>
                            <Text style={styles.welcome}>{t('welcomeBack')}</Text>
                            <Text style={styles.brandTitle}>{t('smartAgri')}</Text>
                            <Text style={styles.brandSubtitle}>{t('customerPortal')}</Text>
                            <View style={styles.statusChip}>
                                <View style={styles.pulseDot} />
                                <Text style={styles.statusText}>{t('networkActive')}</Text>
                            </View>
                        </View>
                        <View style={styles.hero3DIcon}>
                             <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.iconCircle}
                             >
                                <Ionicons name="leaf" size={40} color="#fff" />
                             </LinearGradient>
                             <View style={styles.iconShadow} />
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* 3D Action Grid */}
                <Text style={styles.sectionTitle}>Studio</Text>
                <View style={styles.grid}>
                    {sections.map((section: any, index: number) => (
                        <Animated.View 
                            key={section.title} 
                            entering={FadeInUp.delay(300 + (index * 100))}
                            style={styles.gridItemWrapper}
                        >
                            <Pressable 
                                style={({pressed}) => [styles.gridCard, pressed && { transform: [{scale: 0.98}] }]}
                                onPress={() => router.push(section.route as any)}
                            >
                                <LinearGradient
                                    colors={[section.colors[0], section.colors[1]]}
                                    style={styles.gridIconBox}
                                >
                                    <Ionicons name={section.icon as any} size={28} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.gridTitle}>{section.title}</Text>
                                <Text style={styles.gridDesc}>{section.desc}</Text>
                            </Pressable>
                            <View style={[styles.gridShadow, { backgroundColor: section.colors[1] }]} />
                        </Animated.View>
                    ))}
                </View>

                {/* How it works 3D Card */}
                <Animated.View entering={FadeInDown.delay(700)} style={styles.infoCardWrapper}>
                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <Ionicons name="sparkles" size={20} color="#6366F1" />
                            <Text style={styles.infoCardTitle}>{t('quickGuide')}</Text>
                        </View>
                        <View style={styles.step}>
                             <Text style={styles.stepNum}>01</Text>
                             <Text style={styles.stepText}>{t('guideStep1')}</Text>
                        </View>
                        <View style={styles.step}>
                             <Text style={styles.stepNum}>02</Text>
                             <Text style={styles.stepText}>{t('guideStep2')}</Text>
                        </View>
                        <View style={styles.step}>
                             <Text style={styles.stepNum}>03</Text>
                             <Text style={styles.stepText}>{t('guideStep3')}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Switch Role Button */}
                <Animated.View entering={FadeInUp.delay(900)} style={styles.switchRoleWrapper}>
                    <Pressable 
                        style={({pressed}) => [styles.switchRoleBtn, pressed && { transform: [{scale: 0.98}] }]}
                        onPress={() => router.replace('/auth')}
                    >
                        <Ionicons name="swap-horizontal" size={20} color="#64748B" />
                        <Text style={styles.switchRoleText}>{t('switchRole')}</Text>
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
    hero3DEffect: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        bottom: -10,
        backgroundColor: '#E2E8F0',
        borderRadius: 32,
        opacity: 0.5,
    },
    hero: { 
        borderRadius: 32, 
        padding: 28, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    heroTextContainer: { flex: 1 },
    welcome: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#64748B', letterSpacing: 1 },
    brandTitle: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: '#0F172A', lineHeight: 36 },
    brandSubtitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#6366F1', marginTop: 2 },
    statusChip: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F0FDF4', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 12
    },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
    statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#166534', textTransform: 'uppercase' },
    
    hero3DIcon: { alignItems: 'center', justifyContent: 'center' },
    iconCircle: { 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 12,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        zIndex: 2
    },
    iconShadow: {
        position: 'absolute',
        bottom: -5,
        width: 60,
        height: 10,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.1)',
        transform: [{ scaleX: 1.5 }],
        filter: 'blur(5px)'
    },

    sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#1E293B', marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
    gridItemWrapper: { width: '47%', height: 180, position: 'relative' },
    gridCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    gridShadow: {
        position: 'absolute',
        bottom: -6,
        left: 10,
        right: 10,
        height: 20,
        borderRadius: 20,
        opacity: 0.2,
        zIndex: 1
    },
    gridIconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 5 },
    gridTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#0F172A' },
    gridDesc: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4 },

    infoCardWrapper: { marginTop: 32 },
    infoCard: { backgroundColor: '#1E293B', borderRadius: 32, padding: 28, elevation: 10 },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    infoCardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#fff' },
    step: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
    stepNum: { fontFamily: 'Poppins_700Bold', fontSize: 12, color: '#6366F1' },
    stepText: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#94A3B8' },

    switchRoleWrapper: { marginTop: 40, alignItems: 'center' },
    switchRoleBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10, 
        backgroundColor: '#fff', 
        paddingHorizontal: 24, 
        paddingVertical: 14, 
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10
    },
    switchRoleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#64748B' },

    spacing: { height: 60 }
});
