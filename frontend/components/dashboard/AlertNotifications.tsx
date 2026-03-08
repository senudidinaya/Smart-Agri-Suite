import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '@/data/dashboardData';
import { usePush } from '@/components/common/PushNotificationService';
import { apiService } from '@/services/apiService';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'High' | 'Medium' | 'Low';
  icon: string;
  spice?: string;
  region?: string;
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'High':
        return { bg: COLORS.redLight, color: COLORS.redDark };
      case 'Medium':
        return { bg: COLORS.amberLight, color: COLORS.amberDark };
      default:
        return { bg: COLORS.tealLight, color: COLORS.tealDark };
    }
  };

  const severity = getSeverityStyle(alert.severity);

  return (
    <TouchableOpacity style={styles.alertRow} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: severity.bg }]}>
        <Text style={styles.iconEm}>{alert.icon}</Text>
      </View>
      <View style={styles.textContent}>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertMessage} numberOfLines={2}>
          {alert.message}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function AlertNotifications() {
  const { showNotification } = usePush();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Simulate checking for alerts based on model predictions
  const checkAlerts = async () => {
    try {
      const res = await apiService.getAlerts();
      const newAlerts = res.data;
      
      setAlerts(newAlerts);

      // Trigger push for High severity
      const urgent = newAlerts.find((a: any) => a.severity === 'High');
      if (urgent) {
        showNotification({
          title: urgent.title,
          message: urgent.message,
          type: 'alert'
        });
      }
    } catch (error) {
      console.error("Alert check error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkAlerts();
    }, [])
  );

  return (
    <View style={styles.cardContainer}>
      <Text style={styles.cardTitle}>Model Alerts</Text>
      
      {loading ? (
        <ActivityIndicator color={COLORS.primaryGreen} style={{ margin: 20 }} />
      ) : (
        alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.brandDark,
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.actionBg, // very light gray
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconEm: {
    fontSize: 20,
  },
  textContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.brandDark,
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    paddingRight: 8,
  },
  chevron: {
    fontSize: 24,
    color: '#94a3b8',
    marginLeft: 8,
  },
});
