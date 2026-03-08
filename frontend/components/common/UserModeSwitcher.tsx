
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/data/dashboardData';
import { useUserMode } from '@/context/UserModeContext';

export default function UserModeSwitcher() {
  const router = useRouter();
  const { userMode, setUserMode } = useUserMode();
  const [modalVisible, setModalVisible] = useState(false);

  const switchMode = (mode: 'farmer' | 'customer') => {
    setUserMode(mode);
    setModalVisible(false);
    if (mode === 'farmer') {
      router.push('/');
    } else {
      router.push('/customer-dashboard');
    }
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.profileBtn} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="person-circle-outline" size={32} color={COLORS.brandDark} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>User Settings</Text>
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>
                  Current: {userMode === 'farmer' ? 'Farmer' : 'Customer'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.menuItem, userMode === 'farmer' && styles.activeItem]} 
              onPress={() => switchMode('farmer')}
            >
              <View style={[styles.iconBg, { backgroundColor: COLORS.lightGreen }]}>
                <Ionicons name="leaf-outline" size={20} color={COLORS.primaryGreen} />
              </View>
              <Text style={[styles.menuItemText, userMode === 'farmer' && styles.activeText]}>Switch to Farmer Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, userMode === 'customer' && styles.activeItem]} 
              onPress={() => switchMode('customer')}
            >
              <View style={[styles.iconBg, { backgroundColor: '#e2e8f0' }]}>
                <Ionicons name="cart-outline" size={20} color={COLORS.brandDark} />
              </View>
              <Text style={[styles.menuItemText, userMode === 'customer' && styles.activeText]}>Switch to Customer Mode</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  profileBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    width: 260,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  menuHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  modeBadge: {
    backgroundColor: COLORS.actionBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  activeItem: {
    backgroundColor: COLORS.background,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.brandDark,
  },
  activeText: {
    color: COLORS.primaryGreen,
  },
});
