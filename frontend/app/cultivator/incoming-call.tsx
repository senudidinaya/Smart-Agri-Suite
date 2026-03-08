/**
 * Incoming Call Screen - Displayed when cultivator receives a call from interviewer
 * Shows legal notice about recording before allowing acceptance
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  ScrollView,
  Animated,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cultivatorApi as api, AgoraTokenInfo } from '@/api/cultivatorApi';

interface RouteParams {
  callId: string;
  interviewerUsername: string;
  jobTitle: string;
  agora?: AgoraTokenInfo;
  // Legacy
  roomName?: string;
}

export default function IncomingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    callId?: string;
    interviewerUsername?: string;
    jobTitle?: string;
    agora?: string;
    roomName?: string;
  }>();

  const callId = String(params.callId || '');
  const interviewerUsername = String(params.interviewerUsername || 'Interviewer');
  const jobTitle = String(params.jobTitle || 'Job Application');
  const agora = (() => {
    try {
      return params.agora ? (JSON.parse(String(params.agora)) as AgoraTokenInfo) : undefined;
    } catch {
      return undefined;
    }
  })();

  const [showLegalNotice, setShowLegalNotice] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Pulsing animation for the call icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start vibration pattern (long-short-long)
    const vibrationPattern = [0, 1000, 200, 1000, 200, 1000];
    
    // Vibrate repeatedly
    const vibrationInterval = setInterval(() => {
      Vibration.vibrate(vibrationPattern);
    }, 4000);

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      clearInterval(vibrationInterval);
      Vibration.cancel();
      pulseAnimation.stop();
    };
  }, []);

  const handleAcceptPress = () => {
    // Show legal notice before accepting
    setShowLegalNotice(true);
  };

  const handleAcceptCall = async () => {
    setIsAccepting(true);
    Vibration.cancel();

    try {
      const response = await api.acceptCall(callId);

      // PHASE 3: Frontend API response logging (client accept)
      const token = response.agora.token;
      const startsWithOo6 = token.startsWith('006');
      console.log(`[AGORA-FRONTEND-RECEIVE] channel=${response.agora.channelName} uid=${response.agora.uid} prefix=${token.substring(0, 10)} length=${token.length} starts_with_006=${startsWithOo6}`);
      
      // PHASE 4: AsyncStorage save logging (client accept)
      console.log(`[AGORA-FRONTEND-STORAGE-SAVE] prefix=${token.substring(0, 10)} length=${token.length}`);

      // Store agora config in AsyncStorage to avoid URL encoding corruption
      if (response.agora) {
        await AsyncStorage.setItem(
          `call_config_${callId}`,
          JSON.stringify(response.agora)
        );
      }

      // Navigate to ClientCallScreen with only non-sensitive data
      router.replace({
        pathname: '/cultivator/call',
        params: {
          callId,
          jobTitle,
        },
      });
    } catch (error: any) {
      console.error('Accept call error:', error);
      // If call is no longer available, go back
      router.replace('/cultivator/client/profile');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectCall = async () => {
    setIsRejecting(true);
    Vibration.cancel();

    try {
      await api.rejectCall(callId);
      router.replace('/cultivator/client/profile');
    } catch (error: any) {
      console.error('Reject call error:', error);
      router.replace('/cultivator/client/profile');
    }
  };

  const handleCloseLegalNotice = () => {
    setShowLegalNotice(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Caller Info */}
        <View style={styles.callerInfo}>
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.avatarText}>📞</Text>
          </Animated.View>
          <Text style={styles.incomingText}>Incoming Call</Text>
          <Text style={styles.callerName}>{interviewerUsername || 'Interviewer'}</Text>
          <Text style={styles.jobTitle}>Re: {jobTitle || 'Job Application'}</Text>
        </View>

        {/* Call Controls */}
        <View style={styles.controls}>
          {/* Reject Button */}
          <TouchableOpacity
            style={[styles.callButton, styles.rejectButton]}
            onPress={handleRejectCall}
            disabled={isAccepting || isRejecting}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>❌</Text>
            <Text style={styles.buttonLabel}>Decline</Text>
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            style={[styles.callButton, styles.acceptButton]}
            onPress={handleAcceptPress}
            disabled={isAccepting || isRejecting}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonIcon}>✅</Text>
            <Text style={styles.buttonLabel}>Accept</Text>
          </TouchableOpacity>
        </View>

        {/* Recording Notice */}
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeIcon}>🔴</Text>
          <Text style={styles.noticeText}>
            This call will be recorded for research purposes
          </Text>
        </View>
      </View>

      {/* Legal Notice Modal */}
      <Modal
        visible={showLegalNotice}
        transparent
        animationType="slide"
        onRequestClose={handleCloseLegalNotice}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>⚖️ Recording Notice</Text>
              
              <Text style={styles.modalSubtitle}>Please read before accepting:</Text>
              
              <View style={styles.legalTextContainer}>
                <Text style={styles.legalText}>
                  By accepting this call, you acknowledge and consent to the following:
                </Text>
                
                <Text style={styles.legalPoint}>
                  • <Text style={styles.legalBold}>Audio Recording:</Text> This call will be recorded 
                  on your device for quality assurance and research purposes.
                </Text>
                
                <Text style={styles.legalPoint}>
                  • <Text style={styles.legalBold}>Research Purpose:</Text> The recording may be 
                  analyzed using machine learning algorithms to understand cultivator intent 
                  and improve our agricultural services.
                </Text>
                
                <Text style={styles.legalPoint}>
                  • <Text style={styles.legalBold}>Data Storage:</Text> The recording will be securely 
                  uploaded to our servers after the call ends.
                </Text>
                
                <Text style={styles.legalPoint}>
                  • <Text style={styles.legalBold}>Confidentiality:</Text> Your voice data will be 
                  handled in accordance with data protection regulations and will only be used 
                  for the stated research purposes.
                </Text>
                
                <Text style={styles.legalPoint}>
                  • <Text style={styles.legalBold}>Voluntary Consent:</Text> Participation is voluntary. 
                  If you do not wish to be recorded, please decline the call.
                </Text>
              </View>
              
              <Text style={styles.consentText}>
                By tapping "I Agree & Accept", you provide your informed consent to be recorded.
              </Text>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleCloseLegalNotice}
                disabled={isAccepting}
              >
                <Text style={styles.declineButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.agreeButton, isAccepting && styles.buttonDisabled]}
                onPress={handleAcceptCall}
                disabled={isAccepting}
              >
                <Text style={styles.agreeButtonText}>
                  {isAccepting ? 'Connecting...' : 'I Agree & Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  callerInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarText: {
    fontSize: 60,
  },
  incomingText: {
    fontSize: 16,
    color: '#27ae60',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  callButton: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 40,
    width: 80,
    height: 80,
    marginHorizontal: 30,
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  acceptButton: {
    backgroundColor: '#27ae60',
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 0,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    position: 'absolute',
    bottom: -25,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noticeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noticeText: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2d2d44',
    borderRadius: 20,
    padding: 25,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 20,
  },
  legalTextContainer: {
    marginBottom: 20,
  },
  legalText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 15,
  },
  legalPoint: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 10,
    paddingLeft: 5,
  },
  legalBold: {
    fontWeight: 'bold',
    color: '#fff',
  },
  consentText: {
    fontSize: 14,
    color: '#f39c12',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  declineButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  agreeButton: {
    flex: 2,
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
