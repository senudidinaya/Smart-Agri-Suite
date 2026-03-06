
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../src/config';

interface ComplexityData {
    vegetation_pct: number;
    idle_pct: number;
    built_pct: number;
    avg_ndvi: number;
}

interface AnalysisResult {
    city: string;
    address: string;
    analysis: ComplexityData;
    boundary: any;
    lat: number;
    lng: number;
    tile_url: string;
}

export const ComplexitySearch = ({ theme }: { theme: any }) => {
    const router = useRouter();
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!city.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/city?city=${encodeURIComponent(city)}`);
            const data = await res.json();
            if (res.ok) {
                setResult(data);
            } else {
                setError(data.detail || 'Search failed');
            }
        } catch (e) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    const navigateToMap = (mode: 'point' | 'analysis' | 'listings') => {
        if (!result) return;

        router.push({
            pathname: "/map",
            params: {
                cityMode: mode,
                lat: result.lat.toString(),
                lng: result.lng.toString(),
                cityName: result.city,
                boundary: JSON.stringify(result.boundary),
                geeTileUrl: result.tile_url
            }
        } as any);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>🌏 City Land Complexity</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Analyze idle land and vegetation for any city
            </Text>

            <View style={styles.searchRow}>
                <TextInput
                    style={[styles.input, { color: theme.textPrimary, borderColor: theme.borderColor, backgroundColor: theme.background }]}
                    placeholder="e.g. Colombo, Malabe..."
                    placeholderTextColor={theme.textMuted}
                    value={city}
                    onChangeText={setCity}
                />
                <Pressable
                    style={[styles.searchBtn, { backgroundColor: theme.textHighlight }]}
                    onPress={handleSearch}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.searchBtnText}>Analyze</Text>
                    )}
                </Pressable>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {result && (
                <View style={styles.resultArea}>
                    <Text style={[styles.locationName, { color: theme.textPrimary }]}>{result.city}</Text>
                    <Text style={[styles.address, { color: theme.textSecondary }]} numberOfLines={1}>
                        {result.address}
                    </Text>

                    <View style={styles.statsRow}>
                        <StatBox
                            label="Idle"
                            value={`${result.analysis.idle_pct.toFixed(1)}%`}
                            color="#f59e0b"
                            theme={theme}
                        />
                        <StatBox
                            label="Vegetation"
                            value={`${result.analysis.vegetation_pct.toFixed(1)}%`}
                            color="#10b981"
                            theme={theme}
                        />
                        <StatBox
                            label="Built-up"
                            value={`${result.analysis.built_pct.toFixed(1)}%`}
                            color="#94a3b8"
                            theme={theme}
                        />
                    </View>

                    {/* Progress Bar Visualization */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${result.analysis.idle_pct}%`, backgroundColor: '#f59e0b', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]} />
                        <View style={[styles.progressBar, { width: `${result.analysis.vegetation_pct}%`, backgroundColor: '#10b981' }]} />
                        <View style={[styles.progressBar, { width: `${result.analysis.built_pct}%`, backgroundColor: '#94a3b8', borderTopRightRadius: 8, borderBottomRightRadius: 8 }]} />
                    </View>

                    {/* Interaction Buttons */}
                    <View style={styles.buttonRow}>
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.borderColor }]}
                            onPress={() => navigateToMap('point')}
                        >
                            <Text style={styles.actionBtnIcon}>📍</Text>
                            <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Point Analysis</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.borderColor }]}
                            onPress={() => navigateToMap('analysis')}
                        >
                            <Text style={styles.actionBtnIcon}>🏗️</Text>
                            <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Land Analysis</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: theme.background, borderColor: theme.borderColor }]}
                            onPress={() => navigateToMap('listings')}
                        >
                            <Text style={styles.actionBtnIcon}>🏘️</Text>
                            <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Land Listings</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
};

const StatBox = ({ label, value, color, theme }: any) => (
    <View style={styles.statBox}>
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 20,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 14,
    },
    searchBtn: {
        paddingHorizontal: 16,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    resultArea: {
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 20,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '700',
    },
    address: {
        fontSize: 12,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    progressContainer: {
        height: 12,
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 8,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 20,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    actionBtnIcon: {
        fontSize: 16,
    },
    actionBtnText: {
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    }
});
