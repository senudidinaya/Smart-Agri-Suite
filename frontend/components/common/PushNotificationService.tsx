
import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/data/dashboardData';

const { width } = Dimensions.get('window');

interface Notification {
  title: string;
  message: string;
  type?: 'alert' | 'success' | 'info';
}

interface PushContextType {
  showNotification: (notif: Notification) => void;
}

const PushContext = createContext<PushContextType | undefined>(undefined);

export const usePush = () => {
  const context = useContext(PushContext);
  if (!context) throw new Error("usePush must be used within PushProvider");
  return context;
};

export const PushProvider = ({ children }: { children: React.ReactNode }) => {
  const [notif, setNotif] = useState<Notification | null>(null);
  const anim = useState(new Animated.Value(-150))[0];

  const showNotification = (newNotif: Notification) => {
    setNotif(newNotif);
    Animated.sequence([
      Animated.spring(anim, { toValue: 50, useNativeDriver: true, bounciness: 12 }),
      Animated.delay(4000),
      Animated.timing(anim, { toValue: -150, duration: 300, useNativeDriver: true })
    ]).start(() => setNotif(null));
  };

  return (
    <PushContext.Provider value={{ showNotification }}>
      {children}
      {notif && (
        <Animated.View style={[styles.container, { transform: [{ translateY: anim }] }]}>
          <TouchableOpacity 
            style={styles.notifCard} 
            onPress={() => Animated.timing(anim, { toValue: -150, duration: 200, useNativeDriver: true }).start()}
          >
            <View style={[styles.iconBox, { backgroundColor: notif.type === 'alert' ? COLORS.redLight : COLORS.primaryGreen }]}>
              <Ionicons name={notif.type === 'alert' ? "warning" : "notifications"} size={22} color={notif.type === 'alert' ? COLORS.redDark : "#fff"} />
            </View>
            <View style={styles.textBox}>
              <Text style={styles.title}>{notif.title}</Text>
              <Text style={styles.message} numberOfLines={2}>{notif.message}</Text>
            </View>
            <View style={styles.dragBar} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </PushContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primaryGreen,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.brandDark,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dragBar: {
    width: 30,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
  }
});
