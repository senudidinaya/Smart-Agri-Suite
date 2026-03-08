import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { cultivatorApi as api } from '@/api/cultivatorApi';

// Lazy-load expo-camera to prevent native module error from crashing route initialization
let CameraView: any = null;
let useCameraPermissions: any = null;
let useMicrophonePermissions: any = null;
let cameraModuleAvailable = false;

try {
  const camera = require('expo-camera');
  CameraView = camera.CameraView;
  useCameraPermissions = camera.useCameraPermissions;
  useMicrophonePermissions = camera.useMicrophonePermissions;
  cameraModuleAvailable = true;
} catch (error) {
  console.warn('expo-camera native module not available. In-person interview requires a custom dev build.');
}

export default function InPersonInterviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jobId?: string;
    clientId?: string;
    clientName?: string;
    jobTitle?: string;
    priorExperience?: string;
  }>();

  const jobId = String(params.jobId || '');
  const clientId = String(params.clientId || '');
  const clientName = String(params.clientName || 'Client');
  const jobTitle = String(params.jobTitle || 'Job');
  const priorExperience = params.priorExperience ? String(params.priorExperience) : undefined;

  // Safe permission hooks - only call if module is available
  const [cameraPermission, requestCameraPermission] = cameraModuleAvailable && useCameraPermissions 
    ? useCameraPermissions() 
    : [null, () => {}];
  const [micPermission, requestMicPermission] = cameraModuleAvailable && useMicrophonePermissions
    ? useMicrophonePermissions()
    : [null, () => {}];
  const [showConsent, setShowConsent] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTime = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!jobTitle || !priorExperience) return;
      try {
        const response = await api.generateQuestions(jobTitle, priorExperience, 'gate2', 5);
        if (response.success) setQuestions(response.questions || []);
      } catch {
        // Optional UX data only
      }
    };
    fetchQuestions();
  }, [jobTitle, priorExperience]);

  const handleConsentAgree = () => {
    if (!cameraPermission?.granted || !micPermission?.granted) {
      Alert.alert('Permissions Required', 'Camera and microphone permissions are required to record the interview.');
      return;
    }
    setShowConsent(false);
  };

  const handleConsentDecline = () => {
    Alert.alert('Interview Cancelled', 'Consent is required to proceed.', [
      { text: 'OK', onPress: () => router.replace('/cultivator/admin/applications') },
    ]);
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      recordingStartTime.current = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - recordingStartTime.current) / 1000));
      }, 1000);

      const video = await cameraRef.current.recordAsync({ maxDuration: 300 });
      if (video?.uri) {
        setVideoUri(video.uri);
        await analyzeVideo(video.uri);
      }
    } catch (error: any) {
      Alert.alert('Recording Error', error.message || 'Failed to record video');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
    setIsRecording(false);
  };

  const analyzeVideo = async (uri: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await api.analyzeInterviewVideo(jobId, clientId, uri, recordingTime);
      setAnalysisResult(result);
      await FileSystem.deleteAsync(uri, { idempotent: true });
      setVideoUri(null);
    } catch (error: any) {
      setAnalysisError(error.message || 'Failed to analyze interview');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = async () => {
    if (videoUri) await analyzeVideo(videoUri);
  };

  const handleDiscard = async () => {
    if (videoUri) {
      await FileSystem.deleteAsync(videoUri, { idempotent: true });
    }
    router.replace('/cultivator/admin/applications');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show error if camera module is not available
  if (!cameraModuleAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={[styles.title, { textAlign: 'center', marginBottom: 12 }]}>Camera Not Available</Text>
          <Text style={[styles.text, { textAlign: 'center', marginHorizontal: 20, marginBottom: 20 }]}>
            In-person interviews require a custom development build with expo-camera.{'\n\n'}
            This feature is not available in Expo Go.
          </Text>
          <TouchableOpacity 
            style={[styles.btn, styles.btnPrimary, { width: 200 }]} 
            onPress={() => router.replace('/cultivator/admin/applications')}
          >
            <Text style={styles.btnPrimaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showConsent) {
    return (
      <SafeAreaView style={styles.container}>
        <Modal visible transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.card}>
              <Text style={styles.title}>Recording Consent</Text>
              <Text style={styles.text}>This interview will be recorded for verification and safety analysis.</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleConsentDecline}>
                  <Text style={styles.btnGhostText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleConsentAgree}>
                  <Text style={styles.btnPrimaryText}>I Agree</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.text}>Analyzing interview...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (analysisResult) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Interview Analysis</Text>
          <Text style={styles.meta}>Client: {clientName}</Text>
          <Text style={styles.meta}>Job: {jobTitle}</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultDecision}>Decision: {analysisResult.decision}</Text>
            <Text style={styles.meta}>Confidence: {((analysisResult.confidence || 0) * 100).toFixed(1)}%</Text>
            {!!analysisResult.dominant_emotion && (
              <Text style={styles.meta}>Dominant Emotion: {analysisResult.dominant_emotion}</Text>
            )}
            {Array.isArray(analysisResult.reasons) && analysisResult.reasons.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.meta}>Reasons:</Text>
                {analysisResult.reasons.map((r: string, i: number) => (
                  <Text key={i} style={styles.reason}>• {r}</Text>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => router.replace('/cultivator/admin/applications')}>
            <Text style={styles.btnPrimaryText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>In-Person Interview</Text>
        <Text style={styles.meta}>{clientName} • {jobTitle}</Text>
      </View>

      <View style={styles.cameraWrap}>
        {(cameraPermission?.granted && micPermission?.granted) ? (
          <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" />
        ) : (
          <View style={styles.center}><Text style={styles.text}>Waiting for camera/mic permissions...</Text></View>
        )}
      </View>

      {questions.length > 0 && (
        <View style={styles.questionsBox}>
          <Text style={styles.questionsTitle}>Suggested Questions</Text>
          {questions.slice(0, 3).map((q, i) => (
            <Text key={i} style={styles.reason}>• {q.question}</Text>
          ))}
        </View>
      )}

      {!!analysisError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{analysisError}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleDiscard}>
              <Text style={styles.btnGhostText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleRetry}>
              <Text style={styles.btnPrimaryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.meta}>Duration: {formatTime(recordingTime)}</Text>
        {!isRecording ? (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startRecording}>
            <Text style={styles.btnPrimaryText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={stopRecording}>
            <Text style={styles.btnPrimaryText}>Stop Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 16, gap: 10 },
  header: { padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  text: { color: '#d1d5db' },
  meta: { color: '#9ca3af', marginTop: 4 },
  cameraWrap: { flex: 1, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1f2937' },
  camera: { flex: 1 },
  footer: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#16a34a' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnGhost: { backgroundColor: '#374151' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhostText: { color: '#e5e7eb', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, gap: 10 },
  resultCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14 },
  resultDecision: { color: '#bbf7d0', fontSize: 18, fontWeight: '800' },
  reason: { color: '#d1d5db', marginTop: 2 },
  errorBox: { margin: 12, backgroundColor: '#7f1d1d', borderRadius: 10, padding: 12, gap: 8 },
  errorText: { color: '#fee2e2' },
  questionsBox: { marginHorizontal: 12, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#1f2937' },
  questionsTitle: { color: '#fff', fontWeight: '700', marginBottom: 6 },
});
