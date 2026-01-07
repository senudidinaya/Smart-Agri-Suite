/**
 * API Service for Smart Agri-Suite
 * Simple HTTP client for backend communication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use localhost for web, IP address for mobile devices
// Backend runs on port 8001
const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8001/api/v1' 
  : 'http://192.168.1.9:8001/api/v1';

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
  ratePerDay: number;
  phoneNumber?: string;
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
export interface CallInitiateResponse {
  callId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
}

export interface IncomingCallResponse {
  hasIncomingCall: boolean;
  callId?: string;
  jobId?: string;
  jobTitle?: string;
  roomName?: string;
  livekitUrl?: string;
  adminUsername?: string;
}

export interface CallAcceptResponse {
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

export interface CallStatusResponse {
  id: string;
  jobId: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  analysis?: AnalysisResult;
}

// Interview-related interfaces
export interface InterviewInviteResponse {
  success: boolean;
  message: string;
  interviewId: string;
  applicationStatus: string;
}

export interface InterviewAnalyzeResponse {
  success: boolean;
  interviewId: string;
  decision: 'APPROVE' | 'VERIFY' | 'REJECT';
  confidence: number;
  reasons: string[];
  applicationStatus: string;
  message: string;
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

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Request failed');
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
    ratePerDay: number;
    phoneNumber?: string;
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

  async uploadRecording(callId: string, audioUri: string): Promise<RecordingUploadResponse> {
    const formData = new FormData();
    
    // Get file name from URI
    const fileName = audioUri.split('/').pop() || 'recording.wav';
    
    // Append the file to FormData
    formData.append('file', {
      uri: audioUri,
      name: fileName,
      type: 'audio/wav',
    } as any);

    const response = await fetch(`${API_BASE_URL}/calls/${callId}/recording`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Upload failed');
    }

    return data;
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
}

export const api = new ApiService();
