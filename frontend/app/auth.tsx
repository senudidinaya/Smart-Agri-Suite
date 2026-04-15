import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
                <View style={[styles.logoWrap, { backgroundColor: theme.bgCard, shadowColor: theme.green }]}>
                    <Ionicons name="leaf" size={40} color={theme.green} />
                </View>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Smart Agri Suite</Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('roleSubtitle')}</Text>
            </Animated.View>

            <View style={styles.cardsContainer}>
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardWrapper}>
                    <Pressable
                        style={({ pressed }) => [styles.card, styles.customerCard, pressed && { opacity: 0.9 }]}
                        onPress={() => router.replace('/(customer)/')}
                        accessibilityRole="button"
                    >
                        <View style={styles.cardContent}>
                            <Ionicons name="cart" size={40} color="#fff" />
                            <Text style={styles.cardTitle}>{t('customerRole')}</Text>
                            <Text style={styles.cardDesc}>{t('customerDesc')}</Text>
                        </View>
                        <Image
                            source={require('../assets/images/customer_role.png')}
                            style={styles.cardImage}
                            resizeMode="contain"
                        />
                    </Pressable>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.cardWrapper}>
                    <Pressable
                        style={({ pressed }) => [styles.card, styles.farmerCard, pressed && { opacity: 0.9 }]}
                        onPress={() => router.replace('/(farmer)/farmer')}
                        accessibilityRole="button"
                    >
                        <View style={styles.cardContent}>
                            <Ionicons name="business" size={40} color="#fff" />
                            <Text style={styles.cardTitle}>{t('farmerRole')}</Text>
                            <Text style={styles.cardDesc}>{t('farmerDesc')}</Text>
                        </View>
                        <Image
                            source={require('../assets/images/farmer_role.png')}
                            style={styles.cardImage}
                            resizeMode="contain"
                        />
                    </Pressable>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 8,
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    title: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 28,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    cardsContainer: {
        width: '100%',
        gap: 20,
    },
    cardWrapper: {
        width: '100%',
    },
    card: {
        width: '100%',
        padding: 20,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
        overflow: 'hidden',
    },
    cardContent: {
        flex: 1,
        paddingRight: 12,
    },
    cardImage: {
        width: 100,
        height: 100,
        marginRight: -10,
    },
    customerCard: {
        backgroundColor: '#3B82F6',
    },
    farmerCard: {
        backgroundColor: '#10B981',
    },
    cardTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 24,
        color: '#fff',
        marginTop: 16,
        marginBottom: 8,
    },
    cardDesc: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
    },
});
