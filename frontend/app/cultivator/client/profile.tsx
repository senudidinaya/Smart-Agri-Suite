/**
 * Client Profile Screen - Create job posts for farm work
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { cultivatorApi as api } from '@/api/cultivatorApi';

export default function ClientProfileScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [districtOrLocation, setDistrictOrLocation] = useState('');
  const [startsOnDate, setStartsOnDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [priorExperience, setPriorExperience] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Work type options
  const workTypes = [
    'Harvesting',
    'Planting',
    'Irrigation',
    'Weeding',
    'Spraying',
    'General Farm Work',
  ];

  // Plantation experience options
  const plantationOptions = [
    'Cinnamon',
    'Cardamom',
    'Nutmeg',
    'Pepper',
    'Clove',
    'Other',
    'None',
  ];

  const [showWorkDropdown, setShowWorkDropdown] = useState(false);
  const [showPlantationDropdown, setShowPlantationDropdown] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDistrictOrLocation('');
    setStartsOnDate(null);
    setPriorExperience([]);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !districtOrLocation.trim() || !startsOnDate || priorExperience.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.createJob({
        title,
        districtOrLocation,
        startsOnText: startsOnDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        priorExperience: priorExperience.join(', '),
      });

      Alert.alert('Success', 'Your job post has been created!', [
        { text: 'OK', onPress: resetForm }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Job Post</Text>
          <Text style={styles.headerSubtitle}>Post a farming job opportunity</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title / Type of Work *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowWorkDropdown(!showWorkDropdown)}
            >
              <Text style={title ? styles.dropdownText : styles.dropdownPlaceholder}>
                {title || 'Select work type'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            
            {showWorkDropdown && (
              <View style={styles.dropdownList}>
                {workTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setTitle(type);
                      setShowWorkDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Village / District *</Text>
            <TextInput
              style={styles.input}
              value={districtOrLocation}
              onChangeText={setDistrictOrLocation}
              placeholder="e.g., Anuradhapura"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Starts From *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowDatePicker(true);
                setShowWorkDropdown(false);
                setShowPlantationDropdown(false);
                const base = startsOnDate || new Date();
                setPickerYear(base.getFullYear());
                setPickerMonth(base.getMonth());
              }}
            >
              <Text style={startsOnDate ? styles.dropdownText : styles.dropdownPlaceholder}>
                {startsOnDate
                  ? startsOnDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Select a start date'}
              </Text>
              <Text style={styles.dropdownArrow}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plantations You Have Prior Experience *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => { setShowPlantationDropdown(!showPlantationDropdown); setShowWorkDropdown(false); }}
            >
              <Text style={priorExperience.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
                {priorExperience.length > 0 ? priorExperience.join(', ') : 'Select plantation experience'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {showPlantationDropdown && (
              <View style={styles.dropdownList}>
                {plantationOptions.map((option) => {
                  const isSelected = priorExperience.includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        if (option === 'None') {
                          setPriorExperience(['None']);
                        } else {
                          const withoutNone = priorExperience.filter(p => p !== 'None');
                          if (isSelected) {
                            setPriorExperience(withoutNone.filter(p => p !== option));
                          } else {
                            setPriorExperience([...withoutNone, option]);
                          }
                        }
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextSelected,
                      ]}>{isSelected ? '✓ ' : ''}{option}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.dropdownDoneButton}
                  onPress={() => setShowPlantationDropdown(false)}
                >
                  <Text style={styles.dropdownDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Posting...' : 'Post Job'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalContent}>
            {/* Month/Year Navigation */}
            <View style={styles.dateNavRow}>
              <TouchableOpacity onPress={() => {
                if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(pickerYear - 1); }
                else setPickerMonth(pickerMonth - 1);
              }}>
                <Text style={styles.dateNavArrow}>◀</Text>
              </TouchableOpacity>
              <Text style={styles.dateNavTitle}>
                {new Date(pickerYear, pickerMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => {
                if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(pickerYear + 1); }
                else setPickerMonth(pickerMonth + 1);
              }}>
                <Text style={styles.dateNavArrow}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.dateWeekRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <Text key={d} style={styles.dateWeekDay}>{d}</Text>
              ))}
            </View>

            {/* Day Grid */}
            <View style={styles.dateDayGrid}>
              {(() => {
                const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
                const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<View key={`blank-${i}`} style={styles.dateDayCell} />);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const thisDate = new Date(pickerYear, pickerMonth, day);
                  const isPast = thisDate < today;
                  const isSelected = startsOnDate?.toDateString() === thisDate.toDateString();
                  cells.push(
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dateDayCell,
                        isSelected && styles.dateDayCellSelected,
                        isPast && styles.dateDayCellDisabled,
                      ]}
                      disabled={isPast}
                      onPress={() => {
                        setStartsOnDate(thisDate);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.dateDayText,
                        isSelected && styles.dateDayTextSelected,
                        isPast && styles.dateDayTextDisabled,
                      ]}>{day}</Text>
                    </TouchableOpacity>
                  );
                }
                return cells;
              })()}
            </View>

            {/* Cancel */}
            <TouchableOpacity style={styles.dateCancelButton} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.dateCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 25,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    // Use boxShadow for web compatibility (shadow* props are deprecated)
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 5,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  dropdownItemTextSelected: {
    color: '#27ae60',
    fontWeight: '600',
  },
  dropdownDoneButton: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#27ae60',
  },
  dropdownDoneText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#27ae60',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a3d9a5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Date Picker Modal styles
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 360,
  },
  dateNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateNavArrow: {
    fontSize: 20,
    color: '#27ae60',
    paddingHorizontal: 10,
  },
  dateNavTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  dateWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  dateDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dateDayCellSelected: {
    backgroundColor: '#27ae60',
  },
  dateDayCellDisabled: {
    opacity: 0.3,
  },
  dateDayText: {
    fontSize: 15,
    color: '#333',
  },
  dateDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dateDayTextDisabled: {
    color: '#ccc',
  },
  dateCancelButton: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 10,
  },
  dateCancelText: {
    fontSize: 15,
    color: '#e74c3c',
    fontWeight: '600',
  },
});
