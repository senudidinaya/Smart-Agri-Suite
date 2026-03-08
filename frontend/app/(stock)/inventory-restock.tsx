
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, stockPrediction, SPICES, REGIONS } from '../../data/dashboardData';
import { usePush } from '../../components/common/PushNotificationService';
import { apiService } from '../../services/apiService';
import { useGlobal } from '../../context/GlobalContext';

interface Entry {
  id: string;
  spice: string;
  region: string;
  stock: string;
}

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (value: string) => void;
  title: string;
}

const SelectionModal = ({ visible, onClose, options, onSelect, title }: SelectionModalProps) => (
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
  const [entries, setEntries] = useState<Entry[]>([
    { id: '1', spice: 'Pepper', region: 'Matale', stock: '140' },
  ]);
  const [results, setResults] = useState<any[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);

  // Selector states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalOptions, setModalOptions] = useState<string[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [activeEntryId, setActiveEntryId] = useState('');
  const [activeField, setActiveField] = useState<'spice' | 'region' | ''>('');

  const addEntry = () => {
    if (entries.length < 3) {
      setEntries([
        ...entries,
        { id: Math.random().toString(), spice: 'Cinnamon', region: 'Kandy', stock: '0' },
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

  const { showNotification } = usePush();
  const { refreshInventory: globalRefresh } = useGlobal();
  const [loading, setLoading] = useState(false);

  const handleRestock = async () => {
    // Basic validation
    for (const entry of entries) {
      if (parseFloat(entry.stock) < 0 || entry.stock === '') {
        Alert.alert("Invalid Input", `Please enter a valid stock value for ${entry.spice}.`);
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Save to backend
      await apiService.saveInventory(entries.map(e => ({
        spice: e.spice,
        region: e.region,
        stock: parseFloat(e.stock) || 0
      })));

      // 2. Fetch predictions for analysis display
      const newResults = await Promise.all(
        entries.map(async (entry) => {
          const res = await apiService.predict({
            spice: entry.spice,
            region: entry.region,
            available_stock: parseFloat(entry.stock) || 0,
            is_festival: false
          });
          const data = res.data;
          return {
            ...entry,
            predictedNeed: data.predictedNeed,
            gap: data.gap,
            isShortage: data.gap > 0,
            riskLevel: data.riskLevel
          };
        })
      );

      setResults(newResults);
      setIsCalculated(true);
      
      // 3. Refresh global state so Home screen updates
      await globalRefresh();

      showNotification({
        title: 'Inventory Saved',
        message: `Your stock was saved and analyzed by the AI model.`,
        type: 'success'
      });
      
    } catch (error) {
      console.error("Restock error:", error);
      showNotification({
        title: 'Sync Error',
        message: 'Could not connect to the server to save inventory.',
        type: 'alert'
      });
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
          <Text style={styles.headerSubtitle}>Model-driven stock planning</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Input Cards */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory Details</Text>
          {entries.map((entry, index) => (
            <View key={entry.id} style={styles.entryWrapper}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryNumber}>{entry.spice || 'Select Spice'} – {entry.region || 'Select Region'}</Text>
                {entries.length > 1 && (
                  <TouchableOpacity onPress={() => removeEntry(entry.id)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.fieldLabel}>Spice Type</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => openSelector(entry.id, 'spice')}>
                <Ionicons name="leaf-outline" size={18} color={COLORS.primaryGreen} style={{ marginRight: 8 }} />
                <Text style={[styles.selectText, !entry.spice && { color: '#94a3b8' }]}>{entry.spice || 'Choose a spice'}</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Region</Text>
              <TouchableOpacity style={styles.selectBox} onPress={() => openSelector(entry.id, 'region')}>
                <Ionicons name="location-outline" size={18} color={COLORS.primaryGreen} style={{ marginRight: 8 }} />
                <Text style={[styles.selectText, !entry.region && { color: '#94a3b8' }]}>{entry.region || 'Choose a region'}</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Available Stock (kg)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cube-outline" size={18} color={COLORS.primaryGreen} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={entry.stock}
                  onChangeText={(val) => updateEntry(entry.id, 'stock', val)}
                  placeholder="Enter kg (e.g. 140)"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          ))}

          {entries.length < 3 && (
            <TouchableOpacity style={styles.addButton} onPress={addEntry}>
              <Ionicons name="add-circle" size={22} color={COLORS.primaryGreen} />
              <Text style={styles.addButtonText}>Add Spice Entry</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.primaryButton} onPress={handleRestock} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Restock</Text>}
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {isCalculated && (
          <>
            {/* Multi-Spice Stock Summary */}
            <View style={[styles.card, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7', borderWidth: 1 }]}>
              <Text style={[styles.cardTitle, { color: '#166534' }]}>Stock Summary</Text>
              {results.map((res, idx) => (
                <View key={res.id} style={[styles.summaryRow, idx === results.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.summarySpiceText}>{res.spice}</Text>
                  <Text style={[styles.summaryStatusText, res.isShortage ? styles.shortageText : styles.surplusText]}>
                    {res.isShortage ? `${Math.abs(Math.round(res.gap))} kg shortage` : `${Math.abs(Math.round(res.gap))} kg surplus`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Individual Planning Analysis Cards */}
            {results.map((res) => {
              const shortageAdvices = [
                "Increase stock preparation",
                "Plan harvesting early",
                "Prepare storage for incoming stock",
                "Arrange transport in advance if demand is rising"
              ];
              const surplusAdvices = [
                "Avoid excess harvesting",
                "Store properly for quality preservation",
                "Release stock gradually",
                "Improve packaging and moisture control"
              ];
              const advices = res.isShortage ? shortageAdvices : surplusAdvices;

              return (
                <View key={res.id} style={styles.card}>
                  <View style={styles.analysisHeader}>
                    <Text style={styles.cardTitle}>Planning Analysis – {res.spice}</Text>
                    <View style={[styles.badge, res.isShortage ? styles.shortageBadge : styles.surplusBadge]}>
                      <Text style={[styles.badgeText, res.isShortage ? styles.shortageText : styles.surplusText]}>
                        {res.isShortage ? 'Shortage' : 'Surplus'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.analysisGrid}>
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Predicted Need</Text>
                      <Text style={styles.analysisValue}>{Math.round(res.predictedNeed)} kg</Text>
                    </View>
                    <View style={styles.analysisItem}>
                      <Text style={styles.analysisLabel}>Available Stock</Text>
                      <Text style={styles.analysisValue}>{res.stock} kg</Text>
                    </View>
                  </View>

                  <View style={[styles.gapBanner, res.isShortage ? { backgroundColor: '#fee2e2' } : { backgroundColor: '#dcfce7' }]}>
                     <Ionicons 
                        name={res.isShortage ? "warning" : "checkmark-circle"} 
                        size={20} 
                        color={res.isShortage ? COLORS.redDark : COLORS.primaryGreen} 
                     />
                     <Text style={[styles.gapBannerText, res.isShortage ? styles.shortageText : styles.surplusText]}>
                       Gap: {Math.abs(Math.round(res.gap))} kg {res.isShortage ? 'shortage' : 'surplus'}
                     </Text>
                  </View>

                  {/* Recommendations per spice */}
                  <Text style={styles.recTitle}>Recommendations</Text>
                  {advices.map((advice, i) => (
                    <View key={i} style={styles.adviceItem}>
                      <View style={[styles.bullet, { backgroundColor: res.isShortage ? '#f87171' : '#4ade80' }]} />
                      <Text style={styles.adviceText}>{advice}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <SelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalTitle}
        options={modalOptions}
        onSelect={(val) => {
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.brandDark, marginBottom: 16 },
  entryWrapper: { marginBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 16 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  entryNumber: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  removeText: { fontSize: 13, color: COLORS.redDark, fontWeight: '600' },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
  },
  selectText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginBottom: 16 },
  addButtonText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: COLORS.primaryGreen },
  primaryButton: { backgroundColor: COLORS.primaryGreen, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },
  
  // Results
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#dcfce7' 
  },
  summarySpiceText: { fontSize: 15, fontWeight: '700', color: '#166534' },
  summaryStatusText: { fontSize: 14, fontWeight: '800' },
  
  analysisHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  analysisGrid: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 20 
  },
  analysisItem: { flex: 1 },
  analysisLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  analysisValue: { fontSize: 22, fontWeight: '800', color: COLORS.brandDark },
  
  gapBanner: { 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 20,
    gap: 10
  },
  gapBannerText: { fontSize: 15, fontWeight: '800' },
  
  recTitle: { fontSize: 16, fontWeight: '700', color: COLORS.brandDark, marginBottom: 12 },
  adviceItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10,
    paddingLeft: 4
  },
  bullet: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    marginRight: 10 
  },
  adviceText: { 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    fontWeight: '500',
    lineHeight: 20
  },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  shortageBadge: { backgroundColor: '#fee2e2' },
  surplusBadge: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  shortageText: { color: COLORS.redDark },
  surplusText: { color: COLORS.primaryGreen },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: 600 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.brandDark },
  modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
});
