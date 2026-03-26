
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '@/data/dashboardData';
import { useGlobal } from '@/context/GlobalContext';
import { apiService } from '@/services/apiService';

interface PredictionResult {
  spice: string;
  region: string;
  predictedNeed: number;
  availableStock: number;
  gap: number;
  status: string;
  riskLevel: string;
}

export default function StockPredictionSummary() {
  const { inventory, refreshInventory } = useGlobal();
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    if (inventory.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        inventory.map(async (item) => {
          const res = await apiService.predict({
            spice: item.spice,
            region: item.region,
            available_stock: item.stock,
            is_festival: false
          });
          return res.data;
        })
      );
      setPredictions(results);
    } catch (err) {
      console.error("Prediction fetch error:", err);
      setError("Unable to connect to the prediction server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshInventory().then(() => {
        if (inventory.length > 0) fetchPredictions();
        else setPredictions([]);
      });
    }, [inventory.length])
  );

  if (loading && predictions.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryGreen} />
        <Text style={styles.loaderText}>Analyzing your stock trends...</Text>
      </View>
    );
  }

  if (error && predictions.length === 0) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchPredictions}>
          <Text style={styles.retryText}>Retry Analysis</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && inventory.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No inventory records found. Add your spice stock in 'Inventory & Restock' to see AI predictions.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Stock Prediction Summary</Text>
      {predictions.map((data, index) => {
        const isShortage = data.gap > 0;
        return (
          <View key={index} style={styles.cardContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.spiceMatchTitle}>{data.spice} Forecast</Text>
              <View style={[styles.riskBadge, { backgroundColor: data.riskLevel === 'High' ? '#fee2e2' : '#fef3c7' }]}>
                <Text style={[styles.riskBadgeText, { color: data.riskLevel === 'High' ? '#991b1b' : '#92400e' }]}>
                   {data.riskLevel} Risk
                </Text>
              </View>
            </View>

            <View style={styles.gridContainer}>
              {/* Row 1 */}
              <View style={styles.gridRow}>
                <View style={[styles.gridItem, styles.greenBg]}>
                  <Text style={styles.gridLabel}>Region</Text>
                  <Text style={styles.gridValue}>{data.region}</Text>
                </View>
                <View style={[styles.gridItem, styles.greenBg]}>
                  <Text style={styles.gridLabel}>Spice</Text>
                  <Text style={styles.gridValue}>{data.spice}</Text>
                </View>
              </View>
              {/* Row 2 */}
              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Predicted Need{'\n'}(Next Month)</Text>
                  <View style={styles.valRow}>
                    <Text style={styles.mainVal}>{Math.round(data.predictedNeed)}</Text>
                    <Text style={styles.unitVal}> kg</Text>
                  </View>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Available Stock vs{'\n'}Model Gap</Text>
                  <View style={styles.valRow}>
                    <Text style={styles.mainVal}>{data.availableStock}</Text>
                    <Text style={styles.unitVal}> kg</Text>
                  </View>
                  <Text style={[
                    styles.gapStyle,
                    isShortage ? styles.shortageText : styles.surplusText
                  ]}>
                    {isShortage ? `Gap: ${Math.abs(Math.round(data.gap))} kg shortage` : `Gap: ${Math.abs(Math.round(data.gap))} kg surplus`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.insightLine}>
              <Text style={styles.insightIcon}>💡</Text>
              <Text style={styles.insightText}>
                Seasonal demand is expected to change based on previous monthly patterns in this region.
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.brandDark,
    marginBottom: 16,
    marginLeft: 4
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  loaderContainer: { padding: 40, alignItems: 'center' },
  loaderText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  spiceMatchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Grid Styles
  gridContainer: {
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  greenBg: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 30,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
  },
  valRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainVal: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  unitVal: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  gapStyle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  shortageText: { color: '#dc2626' },
  surplusText: { color: COLORS.primaryGreen },

  insightLine: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  insightIcon: { fontSize: 14, marginRight: 8 },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontWeight: '500'
  },
  emptyCard: {
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500'
  },
  errorCard: {
    padding: 24,
    backgroundColor: '#fef2f2',
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600'
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 14
  }
});
