import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function RoutePlanner() {
    const params = useLocalSearchParams();
    const destination = params.destination as string || 'Colombo';
    const spice = params.spice as string || 'Cinnamon';
    const priceStr = params.price as string || '2000';
    const price = parseInt(priceStr, 10);

    const [origin, setOrigin] = useState("Matale");
    const origins = ["Matale", "Kandy", "Kurunegala", "Galle"];

    // Dummy logic
    const distanceMultiplier = origin === "Matale" ? 1.5 : 1.2;
    const transportCost = Math.round(150 * distanceMultiplier * 40); // Lorry style roughly 40/km
    const quantity = 100; // default 100kg
    const grossRevenue = price * quantity;
    const estProfit = grossRevenue - transportCost;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
            <View style={styles.headerBar}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </Pressable>
                <Text style={styles.headerTitle}>Route Planner</Text>
                <View style={{width: 40}} />
            </View>

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Delivery Objective</Text>
                        <View style={styles.objectiveRow}>
                            <View style={[styles.iconWrap, {backgroundColor: '#FEF3C7'}]}>
                                <Ionicons name="leaf" size={20} color="#F59E0B" />
                            </View>
                            <View style={{marginLeft: 12}}>
                                <Text style={styles.itemTitle}>{spice}</Text>
                                <Text style={styles.itemSub}>{quantity} kg @ LKR {price}/kg</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Logistics Setup</Text>
                        
                        <Text style={styles.label}>Origin Factory</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
                            {origins.map(o => (
                                <Pressable
                                    key={o}
                                    style={[styles.chip, origin === o && styles.chipActive]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setOrigin(o);
                                    }}
                                >
                                    <Text style={[styles.chipText, origin === o && styles.chipTextActive]}>{o}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Target Destination</Text>
                        <View style={styles.destBox}>
                            <Ionicons name="flag" size={18} color="#3B82F6" />
                            <Text style={styles.destText}>{destination} Market</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300).springify()}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Financial Projection</Text>
                        
                        <View style={styles.finRow}>
                            <Text style={styles.finLabel}>Gross Revenue ({quantity}kg)</Text>
                            <Text style={styles.finValue}>LKR {grossRevenue.toLocaleString()}</Text>
                        </View>
                        <View style={styles.finRow}>
                            <Text style={styles.finLabel}>Est. Transport Cost</Text>
                            <Text style={[styles.finValue, {color: '#EF4444'}]}>- LKR {transportCost.toLocaleString()}</Text>
                        </View>
                        
                        <View style={styles.divider} />

                        <View style={styles.finRow}>
                            <Text style={[styles.finLabel, {fontFamily: 'Poppins_700Bold', color: '#0F172A'}]}>Net Profit</Text>
                            <Text style={[styles.finValue, {fontFamily: 'Poppins_700Bold', color: '#10B981', fontSize: 18}]}>LKR {estProfit.toLocaleString()}</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <Pressable 
                        style={({pressed}) => [styles.confirmBtn, pressed && {opacity: 0.9, transform: [{scale: 0.98}]}]}
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            router.replace('/transport-tracking');
                        }}
                    >
                        <Text style={styles.confirmBtnText}>Confirm Route & Track</Text>
                        <Ionicons name="map" size={18} color="#fff" style={{marginLeft: 8}} />
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backBtn: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 18,
        color: '#0F172A'
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#64748b",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    sectionTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#1E293B',
        marginBottom: 16
    },
    objectiveRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    iconWrap: {
        width: 48, height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    itemTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#0F172A'
    },
    itemSub: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        color: '#64748B'
    },
    label: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        color: '#64748B',
        marginBottom: 8
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
        marginRight: 10,
    },
    chipActive: {
        backgroundColor: "#0F172A",
    },
    chipText: {
        fontFamily: "Poppins_600SemiBold",
        fontSize: 13,
        color: "#64748B",
    },
    chipTextActive: {
        color: "#fff",
    },
    destBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE'
    },
    destText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
        color: '#3B82F6',
        marginLeft: 8
    },
    finRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    finLabel: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
        color: '#64748B'
    },
    finValue: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#0F172A'
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12
    },
    confirmBtn: {
        backgroundColor: '#10B981',
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: "#10B981",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    confirmBtnText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
        color: '#fff'
    }
});
