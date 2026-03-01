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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function ClientProfileScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [districtOrLocation, setDistrictOrLocation] = useState('');
  const [startsOnText, setStartsOnText] = useState('');
  const [ratePerDay, setRatePerDay] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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

  const [showWorkDropdown, setShowWorkDropdown] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDistrictOrLocation('');
    setStartsOnText('');
    setRatePerDay('');
    setPhoneNumber('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !districtOrLocation.trim() || !startsOnText.trim() || !ratePerDay.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const rate = parseFloat(ratePerDay);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid rate per day');
      return;
    }

    // Validate phone number (Sri Lankan format)
    const phoneRegex = /^(\+94|0)?[0-9]{9,10}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      await api.createJob({
        title,
        districtOrLocation,
        startsOnText,
        ratePerDay: rate,
        phoneNumber: phoneNumber.trim(),
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <TextInput
              style={styles.input}
              value={startsOnText}
              onChangeText={setStartsOnText}
              placeholder="e.g., January 2026 or Immediate"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rate Per Day (Rs.) *</Text>
            <TextInput
              style={styles.input}
              value={ratePerDay}
              onChangeText={setRatePerDay}
              placeholder="e.g., 2500"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="e.g., 0771234567"
              keyboardType="phone-pad"
            />
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
  button: {
    backgroundColor: '#5C9A9A',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#99C1C1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
