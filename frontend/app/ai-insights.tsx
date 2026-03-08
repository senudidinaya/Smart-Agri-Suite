import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { COLORS, SPICES, REGIONS } from '@/data/dashboardData';
import { apiService } from '@/services/apiService';

const screenWidth = Dimensions.get('window').width;

// ── Helpers ────────────────────────────────────────────────
const formatDate = (date: Date) => {
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// ── Selection Modal Component ──────────────────────────────
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

// ── Simple Date Picker Modal ────────────────────────────────
const SimpleDatePickerModal = ({ visible, onClose, onSelect, title }: any) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = [2024, 2025, 2026];

  const [selDay, setSelDay] = useState(1);
  const [selMonth, setSelMonth] = useState(4); 
  const [selYear, setSelYear] = useState(2025);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.pickerRow}>
            <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
              {days.map(d => (
                <TouchableOpacity key={d} onPress={() => setSelDay(d)} style={[styles.pItem, selDay === d && styles.pItemActive]}>
                  <Text style={[styles.pText, selDay === d && styles.pTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
              {months.map((m, i) => (
                <TouchableOpacity key={m} onPress={() => setSelMonth(i)} style={[styles.pItem, selMonth === i && styles.pItemActive]}>
                  <Text style={[styles.pText, selMonth === i && styles.pTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
              {years.map(y => (
                <TouchableOpacity key={y} onPress={() => setSelYear(y)} style={[styles.pItem, selYear === y && styles.pItemActive]}>
                  <Text style={[styles.pText, selYear === y && styles.pTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity 
            style={styles.confirmBtn} 
            onPress={() => {
              onSelect(new Date(selYear, selMonth, selDay));
              onClose();
            }}
          >
            <Text style={styles.confirmBtnText}>Confirm Date</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function AIInsightsScreen() {
  const router = useRouter();
  
  // Single Prediction States
  const [predDate, setPredDate] = useState(new Date(2025, 4, 1));
  const [region, setRegion] = useState('Galle');
  const [spice, setSpice] = useState('Clove');
  const [isFestival, setIsFestival] = useState(false);
  const [predictedStock, setPredictedStock] = useState(0);
  const [loading, setLoading] = useState(false);

  // Range Forecast States
  const [startDate, setStartDate] = useState(new Date(2025, 4, 1));
  const [endDate, setEndDate] = useState(new Date(2025, 5, 5));
  const [chartLabels, setChartLabels] = useState(["1 May", "8 May", "15 May", "22 May", "29 May", "5 Jun"]);
  const [chartData, setChartData] = useState([1023, 996, 1005, 1018, 1012, 1025]);
  const [rangeLoading, setRangeLoading] = useState(false);

  // Modal States
  const [selModal, setSelModal] = useState({ visible: false, type: '', title: '', options: [] as string[] });
  const [dateModal, setDateModal] = useState({ visible: false, target: '' });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await apiService.predict({
        spice,
        region,
        date: predDate.toISOString(),
        is_festival: isFestival,
        available_stock: 0 
      });
      const data = res.data;
      setPredictedStock(data.predictedNeed);
    } catch (error) {
      console.error("Single prediction error:", error);
      alert("Unable to fetch prediction from the model. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRange = async () => {
    if (endDate <= startDate) {
      alert("End date must be after start date.");
      return;
    }
    setRangeLoading(true);
    try {
      const res = await apiService.rangeForecast({
        spice,
        region,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_festival: isFestival
      });
      const data = res.data;
      
      if (data.results && data.results.length > 0) {
        const labels = data.results.map((r: any) => {
          const d = new Date(r.date);
          return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`;
        });
        const values = data.results.map((r: any) => r.value);
        setChartLabels(labels);
        setChartData(values);
      }
    } catch (error) {
      console.error("Range forecast error:", error);
      alert("Failed to generate range forecast.");
    } finally {
      setRangeLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.brandDark} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>AI Insights</Text>
          <Text style={styles.headerSubtitle}>Forecast demand & price using your model</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Prediction Inputs */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity style={styles.pickerBox} onPress={() => setDateModal({ visible: true, target: 'pred' })}>
            <Text style={styles.pickerValue}>{formatDate(predDate)}</Text>
            <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Region</Text>
          <TouchableOpacity 
            style={styles.pickerBox} 
            onPress={() => setSelModal({ visible: true, type: 'region', title: 'Select Region', options: REGIONS })}
          >
            <Text style={styles.pickerValue}>{region}</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Spice</Text>
          <TouchableOpacity 
            style={styles.pickerBox} 
            onPress={() => setSelModal({ visible: true, type: 'spice', title: 'Select Spice', options: SPICES })}
          >
            <Text style={styles.pickerValue}>{spice}</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.inputLabel}>Festival Week</Text>
              <Text style={styles.toggleSub}>Toggle to compare festival effect</Text>
            </View>
            <Switch
              value={isFestival}
              onValueChange={setIsFestival}
              trackColor={{ false: COLORS.border, true: COLORS.primaryGreen }}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleRefresh} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Refresh Prediction</Text>}
          </TouchableOpacity>
        </View>

        {/* Section 2: Festival Impact Explanation */}
        {isFestival && (
          <View style={[styles.card, { backgroundColor: COLORS.lightGreen }]}>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="sparkles" size={20} color={COLORS.primaryGreen} />
                <Text style={[styles.cardTitle, { marginLeft: 8, color: COLORS.darkGreen, marginBottom: 0 }]}>Festival Impact Detected</Text>
             </View>
             <Text style={[styles.cardSubText, { color: COLORS.darkGreen }]}>
                Because this is a festival week, the model predicts higher {spice} demand compared to a normal week in {region}. 
                Forecast reflects historical demand surges for {formatDate(predDate)}.
             </Text>
          </View>
        )}

        {/* Section 3: Prediction Result Card */}
        <View style={styles.card}>
          <Text style={styles.resultLabel}>Predicted Stock Need</Text>
          <View style={styles.resultValueRow}>
            <Text style={styles.resultValue}>{formatNumber(Math.round(predictedStock))}</Text>
            <Text style={styles.resultUnit}>kg</Text>
          </View>
        </View>

        {/* Section 4: Range Forecast */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Range Forecast</Text>
          <Text style={styles.cardSubText}>
            Select a start & end date. We will generate weekly predictions (step = 7 days).
          </Text>
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TouchableOpacity style={styles.pickerBoxShort} onPress={() => setDateModal({ visible: true, target: 'start' })}>
                <Text style={styles.pickerValueShort}>{formatDate(startDate)}</Text>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TouchableOpacity style={styles.pickerBoxShort} onPress={() => setDateModal({ visible: true, target: 'end' })}>
                <Text style={styles.pickerValueShort}>{formatDate(endDate)}</Text>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateRange} disabled={rangeLoading}>
            {rangeLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate Range Forecast</Text>}
          </TouchableOpacity>

          <Text style={styles.chartLabelText}>Predicted Quantity (kg)</Text>
          <LineChart
            data={{
              labels: chartLabels,
              datasets: [{ data: chartData }]
            }}
            width={screenWidth - 80}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
              labelColor: () => COLORS.textSecondary,
              propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.primaryGreen },
              decimalPlaces: 0,
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </ScrollView>

      {/* Modals */}
      <SelectionModal 
        visible={selModal.visible} 
        onClose={() => setSelModal({ ...selModal, visible: false })}
        title={selModal.title}
        options={selModal.options}
        onSelect={(val) => {
          if (selModal.type === 'region') setRegion(val);
          else setSpice(val);
        }}
      />

      <SimpleDatePickerModal 
        visible={dateModal.visible}
        onClose={() => setDateModal({ ...dateModal, visible: false })}
        title="Select Date"
        onSelect={(d: Date) => {
          if (dateModal.target === 'pred') setPredDate(d);
          else if (dateModal.target === 'start') setStartDate(d);
          else setEndDate(d);
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
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.brandDark, marginBottom: 8 },
  cardSubText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20, lineHeight: 18 },

  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.brandDark, marginBottom: 8 },
  pickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  pickerBoxShort: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  pickerValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  pickerValueShort: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 4 },
  toggleSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  primaryButton: { backgroundColor: COLORS.primaryGreen, padding: 18, borderRadius: 16, alignItems: 'center', marginVertical: 8 },
  buttonText: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },

  resultLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },
  resultValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  resultValue: { fontSize: 36, fontWeight: '800', color: COLORS.brandDark, letterSpacing: -1 },
  resultUnit: { fontSize: 18, fontWeight: '700', color: COLORS.brandDark, marginLeft: 6 },

  row: { flexDirection: 'row' },
  chartLabelText: { fontSize: 15, fontWeight: '700', color: COLORS.brandDark, marginTop: 28, marginBottom: 12 },
  chart: { borderRadius: 16, marginTop: 8, marginLeft: -12 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 28, padding: 24, maxHeight: 500 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.brandDark },
  modalItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },

  // Date Picker Modal
  datePickerContent: { backgroundColor: COLORS.surface, borderRadius: 28, padding: 24, alignItems: 'center' },
  pickerRow: { flexDirection: 'row', height: 200, marginVertical: 20 },
  column: { flex: 1, paddingHorizontal: 4 },
  pItem: { paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  pItemActive: { backgroundColor: COLORS.lightGreen },
  pText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  pTextActive: { color: COLORS.primaryGreen, fontWeight: '800' },
  confirmBtn: { backgroundColor: COLORS.primaryGreen, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  confirmBtnText: { color: COLORS.surface, fontWeight: '800', fontSize: 15 }
});
