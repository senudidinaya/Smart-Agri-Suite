import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMarketplace } from '../context/MarketplaceContext';
import * as Haptics from 'expo-haptics';

const COLORS = {
  brandDark: '#1E293B',
  primaryGreen: '#10B981',
  surface: '#ffffff',
  background: '#F8FAFC',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  redDark: '#EF4444',
  cardShadow: 'rgba(100, 116, 139, 0.1)'
};

const SPICES = ["Cinnamon", "Pepper", "Cardamom", "Clove", "Nutmeg"];
const REGIONS = ["Matale", "Kandy", "Galle", "Ratnapura", "Kurunegala"];

interface Entry {
  id: string;
  spice: string;
  region: string;
  stock: string;
}

const SelectionModal = ({ visible, onClose, options, onSelect, title }: any) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.brandDark} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={styles.modalItemText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

export default function InventoryRestockScreen() {
  const router = useRouter();
  const { sellHarvest, refreshListings } = useMarketplace();
  
  const [entries, setEntries] = useState<Entry[]>([
    { id: '1', spice: 'Pepper', region: 'Matale', stock: '140' },
  ]);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalOptions, setModalOptions] = useState<string[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [activeEntryId, setActiveEntryId] = useState('');
  const [activeField, setActiveField] = useState<'spice' | 'region' | ''>('');

  const addEntry = () => {
    if (entries.length < 3) {
      setEntries([
        ...entries,
        { id: Math.random().toString(), spice: 'Cinnamon', region: 'Matale', stock: '0' },
      ]);
    }
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof Entry, value: string) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const handleRestockAndLink = async () => {
    for (const entry of entries) {
      if (parseFloat(entry.stock) <= 0 || entry.stock === '') {
        Alert.alert("Invalid Input", `Please enter a valid stock for ${entry.spice}.`);
        return;
      }
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const sellPromises = entries.map(entry => 
        sellHarvest({
          farmerId: 'F1',
          farmerName: 'Mahinda Perera',
          spice: entry.spice,
          quantity: parseFloat(entry.stock),
          region: entry.region
        })
      );

      const results = await Promise.all(sellPromises);
      await refreshListings();
      const successCount = results.filter(r => r !== null).length;
      
      if (successCount > 0) {
        Alert.alert(
          "Stock Synced & Listed",
          `Successfully recorded ${successCount} harvest entries. Prices are curated and live.`,
          [{ text: "View Dashboard", onPress: () => router.push('/(tabs)/farmer') }]
        );
      }
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert("Sync Error", "Failed to connect to marketplace service.");
    } finally {
      setLoading(false);
    }
  };

  const openSelector = (id: string, field: 'spice' | 'region') => {
    setActiveEntryId(id);
    setActiveField(field);
    setModalTitle(`Select ${field === 'spice' ? 'Spice' : 'Region'}`);
    setModalOptions(field === 'spice' ? SPICES : REGIONS);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.brandDark} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Inventory & Restock</Text>
          <Text style={styles.headerSubtitle}>Sync with Marketplace</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record Available Stock</Text>
          <Text style={styles.cardInfo}>Recording stock here automatically curates AI price and creates marketplace listing.</Text>
          
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryWrapper}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryNumber}>{entry.spice} • {entry.region}</Text>
                {entries.length > 1 && (
                  <TouchableOpacity onPress={() => removeEntry(entry.id)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.fieldLabel}>Spice Type</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => openSelector(entry.id, 'spice')}>
                <Ionicons name="leaf-outline" size={18} color={COLORS.primaryGreen} style={{ marginRight: 8 }} />
                <Text style={styles.selectText}>{entry.spice || 'Choose a spice'}</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Region</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => openSelector(entry.id, 'region')}>
                <Ionicons name="location-outline" size={18} color={COLORS.primaryGreen} style={{ marginRight: 8 }} />
                <Text style={styles.selectText}>{entry.region || 'Choose a region'}</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Quantity to Sell (kg)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cube-outline" size={18} color={COLORS.primaryGreen} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={entry.stock}
                  onChangeText={(val) => updateEntry(entry.id, 'stock', val)}
                  placeholder="Enter kg"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={addEntry}>
            <Ionicons name="add-circle" size={22} color={COLORS.primaryGreen} />
            <Text style={styles.addButtonText}>Add New Spice</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleRestockAndLink} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Record & List in Marketplace</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalTitle}
        options={modalOptions}
        onSelect={(val: any) => {
          if (activeField === 'spice') updateEntry(activeEntryId, 'spice', val);
          if (activeField === 'region') updateEntry(activeEntryId, 'region', val);
        }}
      />
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.brandDark },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 32,
    padding: 24,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.brandDark, marginBottom: 8 },
  cardInfo: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 18 },
  entryWrapper: { marginBottom: 32, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 24 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  entryNumber: { fontSize: 14, fontWeight: '800', color: COLORS.primaryGreen, textTransform: 'uppercase' },
  removeText: { fontSize: 13, color: COLORS.redDark, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  selectText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: COLORS.textPrimary, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 8 },
  addButtonText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: COLORS.primaryGreen },
  primaryButton: { backgroundColor: COLORS.brandDark, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 16 },
  buttonText: { color: COLORS.surface, fontSize: 16, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.brandDark },
  modalItem: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
});
