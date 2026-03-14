/**
 * Cultivator API Service
 * Unified API wrapper for cultivator module and Agora token refresh.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { AUTH_API_BASE_URL } from '../config';

const CULTIVATOR_API_BASE_URL = `${AUTH_API_BASE_URL.replace('/api/v1', '')}`;

const TOKEN_KEY = 'smartagri_token';
const USER_KEY = 'smartagri_user';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  address?: string;
  age?: number;
  role: 'client' | 'interviewer' | 'admin' | 'helper' | 'farmer';
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

export interface AgoraTokenInfo {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
}

export interface AgoraTokenResponse extends AgoraTokenInfo {
  expiresIn: number;
}

export interface CallInitiateResponse {
  callId: string;
  agora: AgoraTokenInfo;
  roomName?: string;
  livekitUrl?: string;
  token?: string;
}

export interface IncomingCallResponse {
  hasIncomingCall: boolean;
  callId?: string;
  jobId?: string;
  jobTitle?: string;
  adminUsername?: string;
  interviewerUsername?: string;
  agora?: AgoraTokenInfo;
  roomName?: string;
  livekitUrl?: string;
}

export interface CallAcceptResponse {
  agora: AgoraTokenInfo;
  roomName?: string;
  livekitUrl?: string;
  token?: string;
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

export interface CallStatusResponse {
  id: string;
  jobId: string;
  channelName?: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  analysis?: AnalysisResult;
  roomName?: string;
}

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

export interface InterviewStatusResponse {
  hasInterview: boolean;
  interview?: any;
  callAssessment?: any;
}

export interface JobCallAnalysesResponse {
  jobId: string;
  total: number;
  analyses: Array<{
    id: string;
    jobId: string;
    adminUserId?: string;
    clientUserId?: string;
    status: string;
    createdAt?: string;
    endedAt?: string;
    analysis?: AnalysisResult;
  }>;
}

export interface JobInterviewAnalysesResponse {
  jobId: string;
  total: number;
  analyses: any[];
}

export interface InterviewAnalyzeResponse {
  success: boolean;
  interviewId: string;
  decision: 'APPROVE' | 'VERIFY' | 'REJECT';
  confidence: number;
  reasons: string[];
  applicationStatus: string;
  message: string;
  emotion_distribution?: Record<string, number>;
  dominant_emotion?: string;
  top_signals?: string[];
  stats?: Record<string, any>;
  model_version?: string;
}

export interface InsightResponse {
  success: boolean;
  insight: string;
}

export interface Question {
  question: string;
  purpose: string;
  follow_up_hint?: string;
}

export interface QuestionGenerationResponse {
  success: boolean;
  gate: string;
  job_title: string;
  plantation_type: string;
  questions: Question[];
}

class CultivatorApiService {
  private token: string | null = null;

  async init(): Promise<User | null> {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (userJson) return JSON.parse(userJson);
    } catch (e) {
      console.error('Failed to init Cultivator API:', e);
    }
    return null;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    auth: boolean = true,
    timeoutMs: number = 45000
  ): Promise<T> {
    if (auth && !this.token) {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;

    const url = `${CULTIVATOR_API_BASE_URL}${path}`;
    
    // === RUNTIME DIAGNOSTICS (Temporary) ===
    console.log(`[CULTIVATOR API] ${method.toUpperCase()} ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      // === RUNTIME DIAGNOSTICS (Temporary) ===
      console.log(`[CULTIVATOR API] Response: ${response.status} ${response.statusText}`);

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server error (status ${response.status})`);
      }

      if (!response.ok) {
        console.warn(`[CULTIVATOR API] Request failed: ${response.status}`, data.detail || '');
        throw new Error(data.detail || `Request failed (status ${response.status})`);
      }

      return data as T;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error(`Request timeout after ${Math.round(timeoutMs / 1000)}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async register(data: {
    fullName: string;
    username: string;
    email: string;
    address?: string;
    age?: number;
    password: string;
    role: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('POST', '/cultivator/auth/register', data, false);
  }

  async login(username: string, password: string, rememberMe: boolean): Promise<User> {
    const result = await this.request<{ token: string; user: User }>(
      'POST',
      '/cultivator/auth/login',
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
    return this.request('GET', '/cultivator/auth/me', undefined, true, 8000);
  }

  async getJobs(status?: string): Promise<{ jobs: Job[]; total: number }> {
    const query = status ? `?status=${status}` : '';
    return this.request('GET', `/cultivator/jobs/${query}`, undefined, true, 60000);
  }

  async getMyJobs(): Promise<{ jobs: Job[]; total: number }> {
    return this.request('GET', '/cultivator/jobs/my', undefined, true, 60000);
  }

  async createJob(data: {
    title: string;
    districtOrLocation: string;
    startsOnText?: string;
    priorExperience: string;
  }): Promise<Job> {
    return this.request('POST', '/cultivator/jobs/', data);
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    return this.request('PATCH', `/cultivator/jobs/${jobId}/status?status=${status}`);
  }

  async getApplications(status?: string): Promise<{ applications: Application[]; total: number }> {
    const query = status ? `?status=${status}` : '';
    return this.request('GET', `/cultivator/applications/${query}`, undefined, true, 60000);
  }

  async applyToJob(jobId: string): Promise<Application> {
    return this.request('POST', '/cultivator/applications/', { jobId });
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<void> {
    return this.request('PATCH', `/cultivator/applications/${applicationId}/status`, { status });
  }

  async rejectApplication(jobId: string, clientId: string): Promise<any> {
    return this.request('POST', `/cultivator/admin/interviews/${jobId}/${clientId}/reject`);
  }

  async initiateCall(jobId: string): Promise<CallInitiateResponse> {
    return this.request('POST', '/cultivator/calls/initiate', { jobId });
  }

  async checkIncomingCall(): Promise<IncomingCallResponse> {
    return this.request('GET', '/cultivator/calls/incoming');
  }

  async acceptCall(callId: string): Promise<CallAcceptResponse> {
    return this.request('POST', `/cultivator/calls/${callId}/accept`);
  }

  async rejectCall(callId: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', `/cultivator/calls/${callId}/reject`);
  }

  async endCall(callId: string): Promise<{ success: boolean; message: string }> {
    return this.request('POST', `/cultivator/calls/${callId}/end`);
  }

  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    return this.request('GET', `/cultivator/calls/${callId}`);
  }

  async getAgoraToken(
    channelName: string,
    uid: number,
    role: 'publisher' | 'subscriber' = 'publisher'
  ): Promise<AgoraTokenResponse> {
    const response = await this.request<AgoraTokenResponse>('POST', '/api/agora/generate-token', { channelName, uid, role });
    console.log('[FRONTEND TOKEN RECEIVED]', response.token);
    console.log('[TOKEN PREFIX]', response.token?.substring(0, 6));
    console.log('[JOIN CHANNEL]', response.channelName);
    return response;
  }

  async uploadRecording(
    callId: string,
    audioUri: string,
    retryCount: number = 0
  ): Promise<RecordingUploadResponse> {
    // ===== VALIDATE INPUT =====
    console.log(`[GATE1] Upload starting - URI received: ${audioUri}`);
    
    if (!FileSystem) {
      console.error('[GATE1] FileSystem module not available');
      throw new Error('FileSystem module not available');
    }

    // Ensure file:// prefix
    const fileUri = audioUri.startsWith('file://') ? audioUri : `file://${audioUri}`;
    console.log(`[GATE1] File URI normalized: ${fileUri}`);
    console.log(`[GATE1] Upload URI used: ${fileUri}`);

    // ===== VALIDATE FILE EXISTS =====
    try {
      console.log(`[GATE1] Validating file existence...`);
      const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
      
      if (!fileInfo.exists) {
        console.error(`[GATE1] FILE NOT FOUND - uri=${fileUri}`);
        throw new Error(`Recording file not found at ${fileUri}`);
      }
      
      if (!fileInfo.size || fileInfo.size === 0) {
        console.error(`[GATE1] FILE EMPTY - size=0`);
        throw new Error('Recording file is empty (0 bytes)');
      }
      
      console.log(`[GATE1] File validation passed:`);
      console.log(`[GATE1]   - exists: true`);
      console.log(`[GATE1]   - size: ${fileInfo.size} bytes`);
      console.log(`[GATE1]   - uri: ${fileInfo.uri}`);
      
    } catch (fsError: any) {
      console.error(`[GATE1] File validation failed: ${fsError.message || String(fsError)}`);
      throw fsError;
    }

    // ===== UPLOAD DIRECTLY FROM CACHE =====
    // No need to copy - recording is already in FileSystem.cacheDirectory from startLocalRecording()
    try {
      const uploadUrl = `${CULTIVATOR_API_BASE_URL}/cultivator/calls/${callId}/recording`;
      
      console.log(`[GATE1] UploadAsync starting:`);
      console.log(`[GATE1]   - callId: ${callId}`);
      console.log(`[GATE1]   - retry: ${retryCount}`);
      console.log(`[GATE1]   - endpoint: ${uploadUrl}`);
      console.log(`[GATE1]   - method: POST (MULTIPART)`);
      console.log(`[GATE1]   - file: ${fileUri}`);
      console.log(`[GATE1]   - fieldName: file`);
      
      const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      console.log(`[GATE1] UploadAsync response received:`);
      console.log(`[GATE1]   - status: ${result.status}`);
      console.log(`[GATE1]   - body length: ${result.body?.length || 0} bytes`);
      
      // Parse response
      let responseData: RecordingUploadResponse;
      try {
        responseData = JSON.parse(result.body);
        console.log(`[GATE1] Response parsed successfully`);
      } catch (parseError: any) {
        console.error(`[GATE1] Failed to parse response JSON: ${parseError.message}`);
        console.error(`[GATE1] Raw body: ${result.body?.substring(0, 200)}`);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
      
      // Check status
      if (result.status !== 200 && result.status !== 201) {
        const errorMsg = responseData.detail || `Upload failed with status ${result.status}`;
        console.error(`[GATE1] Upload rejected by server: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log(`[GATE1] Upload successful:`);
      console.log(`[GATE1]   - callId: ${callId}`);
      console.log(`[GATE1]   - intent: ${responseData.intentLabel}`);
      console.log(`[GATE1]   - confidence: ${responseData.confidence}`);
      console.log(`[GATE1]   - deception: ${responseData.deceptionLabel || 'N/A'}`);
      
      // Clean up recording file after successful upload
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log(`[GATE1] Recording file cleaned up: ${fileUri}`);
      } catch (cleanupError: any) {
        console.warn(`[GATE1] Failed to clean up recording file: ${cleanupError.message}`);
      }
      
      return responseData;
      
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`[GATE1] Upload failed: ${errorMsg}`);
      
      // Retry on network errors
      const isNetworkError = 
        errorMsg.includes('Network') || 
        errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('timeout') || 
        errorMsg.includes('ECONNREFUSED');
        
      if (retryCount < 2 && isNetworkError) {
        const delayMs = (retryCount + 1) * 2000;
        console.log(`[GATE1] Retrying upload after ${delayMs}ms (attempt ${retryCount + 2}/3)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.uploadRecording(callId, audioUri, retryCount + 1);
      }
      
      throw error;
    }
  }

  async getNotifications(page: number = 1): Promise<NotificationListResponse> {
    return this.request('GET', `/cultivator/notifications?page=${page}&limit=20`);
  }

  async markNotificationsRead(notificationIds?: string[]): Promise<void> {
    return this.request('POST', '/cultivator/notifications/mark-read', { notificationIds });
  }

  async getInterviewStatus(jobId: string, userId: string): Promise<InterviewStatusResponse> {
    return this.request('GET', `/cultivator/admin/interviews/${jobId}/${userId}`);
  }

  async inviteForInterview(jobId: string, clientId: string, scheduledAt?: string): Promise<any> {
    const body = scheduledAt ? { scheduledAt } : {};
    return this.request('POST', `/cultivator/admin/interviews/${jobId}/${clientId}/invite`, body);
  }

  async analyzeInterviewVideo(
    jobId: string,
    clientId: string,
    videoUri: string,
    durationSeconds: number
  ): Promise<InterviewAnalyzeResponse> {
    const formData = new FormData();
    const fileName = videoUri.split('/').pop() || 'interview.mp4';
    const fileUri = videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;

    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'video/mp4',
    } as any);
    formData.append('duration_seconds', String(durationSeconds || 0));

    const response = await fetch(
      `${CULTIVATOR_API_BASE_URL}/cultivator/admin/interviews/${jobId}/${clientId}/analyze-video`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || `Request failed (status ${response.status})`);
    }

    return data as InterviewAnalyzeResponse;
  }

  async getJobCallAnalyses(jobId: string): Promise<JobCallAnalysesResponse> {
    return this.request('GET', `/cultivator/jobs/${jobId}/call-analyses`, undefined, true, 60000);
  }

  async getJobInterviewAnalyses(jobId: string): Promise<JobInterviewAnalysesResponse> {
    return this.request('GET', `/cultivator/jobs/${jobId}/interview-analyses`, undefined, true, 60000);
  }

  async startCloudRecording(callId: string): Promise<any> {
    return this.request('POST', `/cultivator/calls/${callId}/recording/start`);
  }

  async stopCloudRecording(callId: string): Promise<any> {
    return this.request('POST', `/cultivator/calls/${callId}/recording/stop`);
  }

  async getGate1Insight(
    intentLabel: string,
    confidence: number,
    scores: Record<string, number>
  ): Promise<InsightResponse> {
    return this.request('POST', '/cultivator/explain/gate1', {
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
    return this.request('POST', '/cultivator/explain/gate2', {
      decision,
      confidence,
      dominant_emotion: dominantEmotion,
      emotion_distribution: emotionDistribution,
      top_signals: topSignals,
      stats,
    });
  }

  async generateQuestions(
    jobTitle: string,
    plantationType: string,
    gate: 'gate1' | 'gate2',
    numQuestions: number = 5
  ): Promise<QuestionGenerationResponse> {
    return this.request('POST', '/cultivator/explain/questions', {
      job_title: jobTitle,
      plantation_type: plantationType,
      gate,
      num_questions: numQuestions,
    });
  }
}

export const cultivatorApi = new CultivatorApiService();
