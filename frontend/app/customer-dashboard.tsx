import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPICES, REGIONS, SPICE_IMAGES } from '@/data/dashboardData';
import UserModeSwitcher from '@/components/common/UserModeSwitcher';
import { apiService } from '@/services/apiService';
import { useGlobal } from '@/context/GlobalContext';

const SpiceFilterButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.filterButton, active && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const FarmerSpiceCard = ({ item, onAddToCart }: { item: any; onAddToCart: () => void }) => (
  <View style={styles.card}>
    <View style={styles.imageContainer}>
      <Image source={SPICE_IMAGES[item.spice]} style={styles.spiceImage} resizeMode="contain" />
    </View>
    <View style={styles.cardInfo}>
      <View style={styles.spiceTag}>
        <Text style={styles.spiceTagText}>{item.spice}</Text>
      </View>
      <Text style={styles.farmerName}>{item.farmerName}</Text>
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.locationText}>{item.region}</Text>
      </View>
      <View style={styles.stockRow}>
        <Text style={styles.stockLabel}>Available Stock:</Text>
        <Text style={styles.stockValue}>{item.availableStock} kg</Text>
      </View>
      <TouchableOpacity style={styles.addToCartButton} onPress={onAddToCart}>
        <Ionicons name="cart-outline" size={18} color={COLORS.surface} style={{ marginRight: 8 }} />
        <Text style={styles.addToCartText}>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function CustomerDashboardScreen() {
  const router = useRouter();
  const { cart, addToCart } = useGlobal();
  const [activeSpice, setActiveSpice] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [modalVisible, setModalVisible] = useState(false);
  
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMarketplace();
      // Map backend inventory to expected UI format
      const formatted = res.data.map((item: any) => ({
        id: item.id,
        farmerName: item.farmer,
        spice: item.spice,
        region: item.region,
        availableStock: item.stock
      }));
      setMarketData(formatted);
    } catch (error) {
      console.error("Marketplace fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMarketplace();
    }, [])
  );

  // Filter Logic
  const filteredData = useMemo(() => {
    return marketData.filter((item) => {
      const spiceMatch = activeSpice === 'All' || item.spice === activeSpice;
      const regionMatch = selectedRegion === 'All Regions' || item.region === selectedRegion;
      return spiceMatch && regionMatch;
    });
  }, [marketData, activeSpice, selectedRegion]);

  const allSpices = ['All', ...SPICES];
  const allRegions = ['All Regions', ...REGIONS];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.brandDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Spice Marketplace</Text>
          <Text style={styles.headerSubtitle}>Direct from local farmers</Text>
        </View>
        <UserModeSwitcher />
        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartIcon}>
          <Ionicons name="cart" size={26} color={COLORS.primaryGreen} />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        {/* Section 1: Spice Filter Buttons */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            {allSpices.map((s) => (
              <SpiceFilterButton
                key={s}
                label={s}
                active={activeSpice === s}
                onPress={() => setActiveSpice(s)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Section 2: Region Selector / Search */}
        <View style={styles.searchSection}>
          <TouchableOpacity style={styles.searchBar} onPress={() => setModalVisible(true)}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <Text style={styles.searchText}>{selectedRegion}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ marginTop: 100 }}>
            <ActivityIndicator size="large" color={COLORS.primaryGreen} />
            <Text style={{ textAlign: 'center', marginTop: 16, color: COLORS.textSecondary }}>Refreshing marketplace...</Text>
          </View>
        ) : (
          /* Section 3: Farmer Spice Cards */
          <View style={styles.listContainer}>
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <FarmerSpiceCard
                  key={item.id}
                  item={{
                    ...item,
                    farmerID: item.id // Ensuring compatibility
                  }}
                  onAddToCart={() => {
                    addToCart(item);
                    alert(`${item.spice} added to cart!`);
                  }}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color={COLORS.border} />
                <Text style={styles.emptyText}>No spices found in this region.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Region Selection Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Region</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.brandDark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allRegions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedRegion(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {selectedRegion === item && <Ionicons name="checkmark" size={20} color={COLORS.primaryGreen} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.brandDark },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  cartIcon: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  filterSection: { backgroundColor: COLORS.surface, paddingTop: 12, paddingBottom: 8 },
  filterBar: { paddingHorizontal: 16, gap: 10 },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: { backgroundColor: COLORS.primaryGreen, borderColor: COLORS.primaryGreen },
  filterButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  filterButtonTextActive: { color: COLORS.surface },

  searchSection: { backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  searchText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },

  listContainer: { padding: 16 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 4,
  },
  imageContainer: {
    height: 180,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  spiceImage: { width: '80%', height: '80%' },
  cardInfo: { padding: 20 },
  spiceTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  spiceTagText: { color: COLORS.darkGreen, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  farmerName: { fontSize: 20, fontWeight: '800', color: COLORS.brandDark, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationText: { marginLeft: 4, fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 16,
  },
  stockLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  stockValue: { fontSize: 18, fontWeight: '800', color: COLORS.primaryGreen },
  addToCartButton: {
    backgroundColor: COLORS.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  addToCartText: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: 600 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.brandDark },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
});
