import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS, monthlyTrends } from '@/data/dashboardData';

const screenWidth = Dimensions.get('window').width;

export default function SeasonalTrendAnalysis() {
  const labels = monthlyTrends.map((t) => t.month);
  const dataPoints = monthlyTrends.map((t) => t.demand);
  const highMonths = monthlyTrends.filter((t) => t.season === 'high').map((t) => t.month);
  const lowMonths = monthlyTrends.filter((t) => t.season === 'low').map((t) => t.month);

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalCount: 0,
    color: (opacity = 1) => `rgba(45, 106, 79, ${opacity})`,
    labelColor: () => COLORS.darkGray,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: COLORS.primaryGreen,
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: COLORS.lightGray,
    },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionIcon}>📈</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Seasonal Trend Analysis</Text>
          <Text style={styles.sectionSub}>12-month demand pattern</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels,
            datasets: [{ data: dataPoints, strokeWidth: 2 }],
          }}
          width={screenWidth - 72}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={false}
        />
      </View>

      {/* Season Badges */}
      <View style={styles.seasonRow}>
        <View style={styles.seasonGroup}>
          <View style={[styles.seasonBadge, { backgroundColor: COLORS.paleGreen }]}>
            <Text style={[styles.seasonBadgeText, { color: COLORS.primaryGreen }]}>
              📈 High Season
            </Text>
          </View>
          <Text style={styles.seasonMonths}>{highMonths.join(', ')}</Text>
        </View>
        <View style={styles.seasonGroup}>
          <View style={[styles.seasonBadge, { backgroundColor: COLORS.warningLight }]}>
            <Text style={[styles.seasonBadgeText, { color: COLORS.warningAmber }]}>
              📉 Low Season
            </Text>
          </View>
          <Text style={styles.seasonMonths}>{lowMonths.join(', ')}</Text>
        </View>
      </View>

      {/* Insights */}
      <View style={styles.insightBox}>
        <Text style={styles.insightIcon}>🌦️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.insightText}>
            Demand usually rises during festival and rainy harvesting periods.
            Stock tends to fall sharply in certain off-season weeks.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  chart: {
    borderRadius: 12,
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  seasonGroup: {
    flex: 1,
    alignItems: 'center',
  },
  seasonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  seasonBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seasonMonths: {
    fontSize: 11,
    color: COLORS.mediumGray,
    textAlign: 'center',
  },
  insightBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.mintBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.softGreen,
  },
  insightIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  insightText: {
    fontSize: 13,
    color: COLORS.darkGray,
    lineHeight: 19,
  },
});
