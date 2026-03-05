/**
 * API Service for Smart Agri-Suite
 * Simple HTTP client for backend communication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use localhost for web, IP address for mobile devices
// Backend runs on port 8000
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000/api/v1' 
  : 'http://192.168.1.9:8000/api/v1';

const TOKEN_KEY = 'smartagri_token';
const USER_KEY = 'smartagri_user';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  address?: string;
  age?: number;
  role: 'client' | 'admin';
  createdAt: string;
}

export interface Job {
  id: string;
  createdByUserId: string;
  createdByUsername: string;
  title: string;
  districtOrLocation: string;
  startsOnText: string;
  priorExperience: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  applicantUserId: string;
  applicantName: string;
  applicantDistrict?: string;
  workType?: string;
  availability?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Call-related interfaces
export interface AgoraTokenInfo {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
}

export interface CallInitiateResponse {
  callId: string;
  agora: AgoraTokenInfo;
  // Legacy fields
  roomName: string;
  livekitUrl: string;
  token: string;
}

export interface IncomingCallResponse {
  hasIncomingCall: boolean;
  callId?: string;
  jobId?: string;
  jobTitle?: string;
  adminUsername?: string;
  agora?: AgoraTokenInfo;
  // Legacy fields
  roomName?: string;
  livekitUrl?: string;
}

export interface CallAcceptResponse {
  agora: AgoraTokenInfo;
  // Legacy fields
  roomName: string;
  livekitUrl: string;
  token: string;
}

export interface RecordingUploadResponse {
  success: boolean;
  intentLabel: string;
  confidence: number;
  scores?: Record<string, number>;
  message: string;
}

export interface AnalysisResult {
  intentLabel: string;
  confidence: number;
  scores?: Record<string, number>;
}

export interface CloudRecordingInfo {
  resourceId: string;
  sid: string;
  recordingUid: number;
  status: string;
}

export interface CallStatusResponse {
  id: string;
  jobId: string;
  channelName?: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  analysis?: AnalysisResult;
  cloudRecording?: CloudRecordingInfo;
  // Legacy
  roomName?: string;
}

export interface StartRecordingResponse {
  success: boolean;
  resourceId?: string;
  sid?: string;
  message: string;
}

export interface StopRecordingResponse {
  success: boolean;
  fileList?: any[];
  message: string;
}

// Interview-related interfaces
export interface InterviewInviteResponse {
  success: boolean;
  message: string;
  interviewId: string;
  applicationStatus: string;
}

// Gate 2 Analysis Stats
export interface Gate2AnalysisStats {
  frames_used: number;
  faces_detected: number;
  face_detection_rate: number;
  stability: number;
  avg_model_confidence: number;
  predictions_count: number;
}

export interface InterviewAnalyzeResponse {
  success: boolean;
  interviewId: string;
  decision: 'APPROVE' | 'VERIFY' | 'REJECT';
  confidence: number;
  reasons: string[];
  applicationStatus: string;
  message: string;
  // Gate 2 specific fields
  emotion_distribution?: Record<string, number>;
  dominant_emotion?: string;
  top_signals?: string[];
  stats?: Gate2AnalysisStats;
  model_version?: string;
}

export interface CallAssessment {
  id: string;
  jobId: string;
  clientId: string;
  adminId: string;
  callStartedAt?: string;
  callEndedAt?: string;
  decision: string;
  confidence: number;
  reasons: string[];
  scores?: Record<string, number>;
  createdAt: string;
}

export interface Interview {
  id: string;
  jobId: string;
  clientId: string;
  adminId: string;
  interviewScheduledAt?: string;
  interviewCompletedAt?: string;
  videoDurationSeconds?: number;
  analysisDecision?: 'APPROVE' | 'VERIFY' | 'REJECT';
  confidence?: number;
  reasons: string[];
  status: string;
  createdAt: string;
  // Gate 2 detailed fields
  emotion_distribution?: Record<string, number>;
  dominant_emotion?: string;
  top_signals?: string[];
  stats?: Gate2AnalysisStats;
  model_version?: string;
}

export interface InterviewStatusResponse {
  hasInterview: boolean;
  interview?: Interview;
  callAssessment?: CallAssessment;
}

// Notification interfaces
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  jobId?: string;
  jobTitle?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

// DeepSeek Insight interfaces
export interface InsightResponse {
  success: boolean;
  insight: string;
}

class ApiService {
  private token: string | null = null;

  async init(): Promise<User | null> {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) {
        return JSON.parse(userJson);
      }
    } catch (e) {
      console.error('Failed to init API:', e);
    }
    return null;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    auth: boolean = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${path}`;
    console.log(`API Request: ${method} ${url}`);
    
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkError: any) {
      console.error('Network error:', networkError);
      throw new Error(`Network error: ${networkError.message || 'Unable to connect to server'}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error(`Server error (status ${response.status})`);
    }

    if (!response.ok) {
      console.error('API error:', response.status, data);
      throw new Error(data.detail || `Request failed (status ${response.status})`);
    }

    return data;
  }

  // Auth
  async register(data: {
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    password: string;
    role: 'client' | 'admin';
  }): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/auth/register', data, false);
  }

  async login(username: string, password: string, rememberMe: boolean): Promise<User> {
    const result = await this.request<{ token: string; user: User }>(
      'POST',
      '/auth/login',
      { username, password, rememberMe },
      false
    );

    this.token = result.token;
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user));

    return result.user;
  }

  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }

  async getCurrentUser(): Promise<User> {
    return this.request('GET', '/auth/me');
  }

  // Jobs
  async getJobs(status?: string): Promise<{ jobs: Job[]; total: number }> {
    const query = status ? `?status=${status}` : '';
    return this.request('GET', `/jobs/${query}`);
  }

  async getMyJobs(): Promise<{ jobs: Job[]; total: number }> {
    return this.request('GET', '/jobs/my');
  }

  async createJob(data: {
    title: string;
    districtOrLocation: string;
    startsOnText?: string;
    priorExperience: string;
  }): Promise<Job> {
    return this.request('POST', '/jobs/', data);
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    return this.request('PATCH', `/jobs/${jobId}/status?status=${status}`);
  }

  // Applications
  async getApplications(status?: string): Promise<{ applications: Application[]; total: number }> {
    const query = status ? `?status=${status}` : '';
    return this.request('GET', `/applications/${query}`);
  }

  async applyToJob(jobId: string): Promise<Application> {
    return this.request('POST', '/applications/', { jobId });
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<void> {
    return this.request('PATCH', `/applications/${applicationId}/status`, { status });
  }

  // Calls
  async initiateCall(jobId: string): Promise<CallInitiateResponse> {
    return this.request('POST', '/calls/initiate', { jobId });
  }

  async checkIncomingCall(): Promise<IncomingCallResponse> {
    return this.request('GET', `/calls/incoming`);
  }

  async acceptCall(callId: string): Promise<CallAcceptResponse> {
    return this.request('POST', `/calls/${callId}/accept`);
  }

  async rejectCall(callId: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', `/calls/${callId}/reject`);
  }

  async endCall(callId: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', `/calls/${callId}/end`);
  }

  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    return this.request('GET', `/calls/${callId}`);
  }

  async startCloudRecording(callId: string): Promise<StartRecordingResponse> {
    return this.request('POST', `/calls/${callId}/recording/start`);
  }

  async stopCloudRecording(callId: string): Promise<StopRecordingResponse> {
    return this.request('POST', `/calls/${callId}/recording/stop`);
  }

  async uploadRecording(callId: string, audioUri: string, retryCount: number = 0): Promise<RecordingUploadResponse> {
    const formData = new FormData();
    
    // Get file name from URI
    const fileName = audioUri.split('/').pop() || 'recording.wav';
    
    // Ensure URI has file:// prefix for React Native
    const fileUri = audioUri.startsWith('file://') ? audioUri : `file://${audioUri}`;
    
    console.log(`Uploading recording (attempt ${retryCount + 1}):`, { callId, fileUri, fileName });
    
    // Append the file to FormData
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'audio/wav',
    } as any);

    // Create abort controller for timeout - 60 seconds for slow networks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_BASE_URL}/calls/${callId}/recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      console.log('Upload successful:', data);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Retry logic for network errors (max 2 retries)
      if (retryCount < 2 && (error.name === 'AbortError' || error.message?.includes('Network') || error.message?.includes('Failed to fetch'))) {
        console.log(`Upload failed, retrying in ${(retryCount + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return this.uploadRecording(callId, audioUri, retryCount + 1);
      }
      
      if (error.name === 'AbortError') {
        throw new Error('Upload timeout after 60 seconds. Your network may be blocking file uploads. Try connecting to a different network.');
      }
      throw error;
    }
  }

  // Interview methods
  async inviteForInterview(
    jobId: string, 
    clientId: string, 
    scheduledAt?: string
  ): Promise<InterviewInviteResponse> {
    const body = scheduledAt ? { scheduledAt } : {};
    return this.request('POST', `/admin/interviews/${jobId}/${clientId}/invite`, body);
  }

  async analyzeInterviewVideo(
    jobId: string,
    clientId: string,
    videoUri: string,
    durationSeconds: number
  ): Promise<InterviewAnalyzeResponse> {
    const formData = new FormData();
    
    const fileName = videoUri.split('/').pop() || 'interview.mp4';
    
    formData.append('file', {
      uri: videoUri,
      name: fileName,
      type: 'video/mp4',
    } as any);
    
    formData.append('duration_seconds', durationSeconds.toString());

    const response = await fetch(
      `${API_BASE_URL}/admin/interviews/${jobId}/${clientId}/analyze-video`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Analysis failed');
    }

    return data;
  }

  async getInterviewStatus(
    jobId: string, 
    clientId: string
  ): Promise<InterviewStatusResponse> {
    return this.request('GET', `/admin/interviews/${jobId}/${clientId}`);
  }

  async rejectApplication(
    jobId: string, 
    clientId: string
  ): Promise<{ success: boolean; message: string; applicationStatus: string }> {
    return this.request('POST', `/admin/interviews/${jobId}/${clientId}/reject`);
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(unreadOnly: boolean = false): Promise<NotificationListResponse> {
    const query = unreadOnly ? '?unread_only=true' : '';
    return this.request('GET', `/notifications/${query}`);
  }

  async markNotificationsRead(notificationIds?: string[]): Promise<{ success: boolean; markedCount: number }> {
    const body = notificationIds ? { notificationIds } : {};
    return this.request('POST', '/notifications/mark-read', body);
  }

  async getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
    return this.request('GET', '/notifications/unread-count');
  }

  // ==================== DEEPSEEK INSIGHTS ====================

  async getGate1Insight(
    intentLabel: string,
    confidence: number,
    scores: Record<string, number>
  ): Promise<InsightResponse> {
    return this.request('POST', '/explain/gate1', {
      intent_label: intentLabel,
      confidence,
      scores,
    });
  }

  async getGate2Insight(
    decision: string,
    confidence: number,
    dominantEmotion: string,
    emotionDistribution: Record<string, number>,
    topSignals: string[],
    stats?: Record<string, any>
  ): Promise<InsightResponse> {
    return this.request('POST', '/explain/gate2', {
      decision,
      confidence,
      dominant_emotion: dominantEmotion,
      emotion_distribution: emotionDistribution,
      top_signals: topSignals,
      stats,
    });
  }
}

export const api = new ApiService();
