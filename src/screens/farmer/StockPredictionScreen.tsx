import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

const REGIONS = ['Matale', 'Kandy', 'Nuwara Eliya', 'Colombo', 'Kurunegala'];
const SPICES = ['Cardamom', 'Cinnamon', 'Black Pepper', 'Cloves', 'Nutmeg'];

export default function StockPredictionScreen() {
    const [region, setRegion] = useState(REGIONS[0]);
    const [spice, setSpice] = useState(SPICES[0]);
    const [isFestival, setIsFestival] = useState(false);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState<any>(null);

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowPicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const handlePredict = async () => {
        setLoading(true);
        setPrediction(null);
        try {
            const payload = {
                date: date.toISOString().split('T')[0],
                region: region,
                spice: spice,
                is_festival: isFestival
            };

            const response = await api.post('/stock/predict', payload);
            setPrediction(response.data);
        } catch (error: any) {
            console.log('Prediction error:', error.response?.data || error);
            Alert.alert('Prediction Failed', 'Could not get prediction from the AI model.');
        } finally {
            setLoading(false);
        }
    };

    const renderPills = (data: string[], selected: string, onSelect: (val: string) => void) => (
        <View style={styles.pillContainer}>
            {data.map(item => (
                <TouchableOpacity
                    key={item}
                    style={[styles.pill, selected === item && styles.pillActive]}
                    onPress={() => onSelect(item)}
                >
                    <Text style={[styles.pillText, selected === item && styles.pillTextActive]}>{item}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="AI Stock Prediction" />
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.subtitle}>Forecast future yield quantities using our advanced machine learning model.</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Select Region</Text>
                    {renderPills(REGIONS, region, setRegion)}

                    <Text style={[styles.label, { marginTop: 24 }]}>Select Spice</Text>
                    {renderPills(SPICES, spice, setSpice)}

                    <Text style={[styles.label, { marginTop: 24 }]}>Select Target Date</Text>
                    <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
                        <Text style={styles.dateText}>{date.toDateString()}</Text>
                    </TouchableOpacity>

                    {showPicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                        />
                    )}

                    <View style={styles.switchRow}>
                        <Text style={styles.label}>Festival Season?</Text>
                        <Switch
                            value={isFestival}
                            onValueChange={setIsFestival}
                            trackColor={{ false: '#ccc', true: '#FF9800' }}
                            thumbColor={isFestival ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <TouchableOpacity style={styles.predictBtn} onPress={handlePredict} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.predictBtnText}>Generate Forecast</Text>}
                    </TouchableOpacity>
                </View>

                {prediction && (
                    <View style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <Ionicons name="sparkles" size={24} color="#2E7D32" />
                            <Text style={styles.resultTitle}>Forecast Result</Text>
                        </View>

                        <View style={styles.resultMain}>
                            <View style={styles.resultValContainer}>
                                <Text style={styles.resultVal}>{prediction.predicted_qty_kg?.toFixed(2)}</Text>
                                <Text style={styles.resultUnit}>kg</Text>
                            </View>
                            <Text style={styles.resultLabel}>Estimated Yield</Text>
                        </View>

                        <View style={styles.resultDivider} />

                        <View style={styles.resultFooter}>
                            <View style={styles.footerItem}>
                                <Ionicons name="calendar-outline" size={16} color="#388E3C" />
                                <Text style={styles.resultDate}>Target: {prediction.date}</Text>
                            </View>
                            {prediction.message && (
                                <Text style={styles.resultMsg}>{prediction.message}</Text>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    scroll: { padding: 20, paddingBottom: 120 },
    subtitle: { fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, marginBottom: 24 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
    pillContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    pill: { backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, marginRight: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    pillActive: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
    pillText: { color: '#666', fontWeight: 'bold', fontSize: 14 },
    pillTextActive: { color: '#fff' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 24 },
    dateSelector: { backgroundColor: '#f8f9fa', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    dateText: { fontSize: 16, color: '#333', fontWeight: 'bold' },
    predictBtn: { backgroundColor: '#FF9800', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4, shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    predictBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },

    resultCard: { backgroundColor: '#fff', padding: 24, borderRadius: 24, elevation: 6, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, borderLeftWidth: 6, borderLeftColor: '#4CAF50' },
    resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
    resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginLeft: 10 },
    resultMain: { alignItems: 'center', marginBottom: 20 },
    resultValContainer: { flexDirection: 'row', alignItems: 'baseline' },
    resultVal: { fontSize: 56, fontWeight: '900', color: '#2E7D32' },
    resultUnit: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', marginLeft: 6 },
    resultLabel: { fontSize: 14, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    resultDivider: { height: 1, backgroundColor: '#f0f0f0', width: '100%', marginBottom: 16 },
    resultFooter: { alignItems: 'center' },
    footerItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    resultDate: { color: '#666', fontSize: 14, marginLeft: 6, fontWeight: '500' },
    resultMsg: { textAlign: 'center', color: '#FF9800', marginTop: 8, fontSize: 14, fontWeight: 'bold', fontStyle: 'italic', backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, overflow: 'hidden' },
});
