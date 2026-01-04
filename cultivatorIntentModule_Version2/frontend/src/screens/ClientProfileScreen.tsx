/**
 * Client Profile Screen - Create/update profile and post availability
 */

import React, { useState, useEffect } from 'react';
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
  const [fullName, setFullName] = useState('');
  const [villageOrDistrict, setVillageOrDistrict] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [typeOfWork, setTypeOfWork] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await api.getMyProfile();
      if (profile) {
        setFullName(profile.fullName);
        setVillageOrDistrict(profile.villageOrDistrict);
        setContactNumber(profile.contactNumber || '');
        setTypeOfWork(profile.typeOfWork);
        setAvailableFrom(profile.availableFrom);
        setHasProfile(true);
      } else if (user) {
        // Pre-fill from user data
        setFullName(user.fullName);
      }
    } catch (e) {
      // No profile yet, use user's name
      if (user) {
        setFullName(user.fullName);
      }
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !villageOrDistrict.trim() || !typeOfWork || !availableFrom.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.saveProfile({
        fullName,
        villageOrDistrict,
        contactNumber: contactNumber || undefined,
        typeOfWork,
        availableFrom,
      });

      Alert.alert('Success', hasProfile ? 'Profile updated!' : 'Your availability has been posted!');
      setHasProfile(true);
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
          <Text style={styles.headerTitle}>Create Profile</Text>
          <Text style={styles.headerSubtitle}>Post your availability for farm work</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Village / District *</Text>
            <TextInput
              style={styles.input}
              value={villageOrDistrict}
              onChangeText={setVillageOrDistrict}
              placeholder="e.g., Anuradhapura"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="e.g., 071-1234567"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type of Work *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowWorkDropdown(!showWorkDropdown)}
            >
              <Text style={typeOfWork ? styles.dropdownText : styles.dropdownPlaceholder}>
                {typeOfWork || 'Select work type'}
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
                      setTypeOfWork(type);
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
            <Text style={styles.label}>Available From *</Text>
            <TextInput
              style={styles.input}
              value={availableFrom}
              onChangeText={setAvailableFrom}
              placeholder="e.g., January 2025 or Immediate"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : hasProfile ? 'Update Profile' : 'Post My Availability'}
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
