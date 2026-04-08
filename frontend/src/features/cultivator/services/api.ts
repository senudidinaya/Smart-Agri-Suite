import * as FileSystem from "expo-file-system/legacy";
import { resolveBackendBaseUrl } from "../../../shared/backendUrl";

const cultivatorBackend = resolveBackendBaseUrl({
  explicitUrlEnvName: "EXPO_PUBLIC_CULTIVATOR_API_BASE_URL",
  fallbackHostEnvName: "EXPO_PUBLIC_CULTIVATOR_DEV_MACHINE_IP",
  fallbackHost: "172.20.10.14",
  port: 8002,
});

const API_BASE_URL = cultivatorBackend.baseUrl;

if (__DEV__) {
  console.info(`[CultivatorAPI] Base URL resolved to ${API_BASE_URL} via ${cultivatorBackend.source}`);
  if (cultivatorBackend.warning) {
    console.warn(`[CultivatorAPI] ${cultivatorBackend.warning}`);
  }
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

export interface CallInitiateResponse {
  callId: string;
  agora: AgoraTokenInfo;
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
  roomName?: string;
  livekitUrl?: string;
}

export interface CallAcceptResponse {
  agora: AgoraTokenInfo;
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
  status: "ringing" | "accepted" | "rejected" | "ended" | "missed";
  analysis?: AnalysisResult;
  cloudRecording?: CloudRecordingInfo;
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

export interface InterviewInviteResponse {
  success: boolean;
  message: string;
  interviewId: string;
  applicationStatus: string;
}

export interface Gate2AnalysisStats {
  frames_used: number;
  faces_detected: number;
  face_detection_rate: number;
  stability: number;
  avg_model_confidence: number;
  predictions_count: number;
}

export interface DeceptionAnalysis {
  deception_label: string;
  deception_confidence: number;
  deception_scores?: Record<string, number>;
  deception_signals: string[];
  deception_model_type?: string;
}

export interface SafetyAssessment {
  safety_score: number;
  primary_signals: string[];
  risk_flags: string[];
  admin_action: "PROCEED" | "VERIFY" | "REJECT" | "APPROVE";
  admin_recommendation: string;
}

export interface Gate2RawEmotion {
  decision: "APPROVE" | "VERIFY" | "REJECT";
  confidence: number;
  dominantEmotion: string;
  emotionDistribution: Record<string, number>;
  topSignals: string[];
  stats: Record<string, any>;
  modelVersion?: string;
  fallbackReason?: string;
  healthy: boolean;
  degraded: boolean;
}

export interface Gate2RawDeception {
  label: string;
  confidence: number;
  scores: Record<string, number>;
  topSignals: string[];
  stats: Record<string, any>;
  modelVersion?: string;
  modelType?: string;
  fallbackReason?: string;
  healthy: boolean;
  degraded: boolean;
}

export interface Gate2CombinedAssessment {
  finalDecision: "APPROVE" | "VERIFY" | "REJECT";
  recommendation: string;
  overallConfidence: number;
  trustScore: number;
  reasoning: string[];
  riskLevel: "low" | "medium" | "high" | "unknown";
  degradedBranches: string[];
  rulePath: string;
  aggregationVersion: string;
}

export interface InterviewAnalyzeResponse {
  success: boolean;
  interviewId: string;
  decision: "APPROVE" | "VERIFY" | "REJECT";
  confidence: number;
  reasons: string[];
  applicationStatus: string;
  message: string;
  emotion_distribution?: Record<string, number>;
  dominant_emotion?: string;
  top_signals?: string[];
  stats?: Gate2AnalysisStats;
  model_version?: string;
  gate1_deception?: DeceptionAnalysis;
  gate2_deception?: DeceptionAnalysis;
  rawEmotion?: Gate2RawEmotion;
  rawDeception?: Gate2RawDeception;
  combinedAssessment?: Gate2CombinedAssessment;
  safety_assessment?: SafetyAssessment;
}

export interface CallAssessment {
  id: string;
  jobId: string;
  clientId: string;
  adminId: string;
  callStartedAt?: string;
  callEndedAt?: string;
  decision: string;
  recommendation?: string;
  confidence: number;
  trustScore?: number;
  riskLevel?: string;
  reasoning?: string;
  reasons: string[];
  scores?: Record<string, number>;
  deceptionLabel?: string;
  deceptionConfidence?: number;
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
  analysisDecision?: "APPROVE" | "VERIFY" | "REJECT";
  confidence?: number;
  reasons: string[];
  status: string;
  createdAt: string;
  emotion_distribution?: Record<string, number>;
  dominant_emotion?: string;
  top_signals?: string[];
  stats?: Gate2AnalysisStats;
  model_version?: string;
  gate1_deception?: DeceptionAnalysis;
  gate2_deception?: DeceptionAnalysis;
  rawEmotion?: Gate2RawEmotion;
  rawDeception?: Gate2RawDeception;
  combinedAssessment?: Gate2CombinedAssessment;
  safety_assessment?: SafetyAssessment;
}

export interface InterviewStatusResponse {
  hasInterview: boolean;
  interview?: Interview;
  callAssessment?: CallAssessment;
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

class ApiService {
  private token: string | null = null;
  private lastTokenPresence: "yes" | "no" = "no";

  setAuthToken(token: string | null) {
    this.token = token;
    const presence = token ? "yes" : "no";
    if (__DEV__ && presence !== this.lastTokenPresence) {
      this.lastTokenPresence = presence;
      console.info(`[CultivatorAPI] Merged auth token ${presence === "yes" ? "attached" : "cleared"}`);
    }
  }

  hasAuthToken(): boolean {
    return Boolean(this.token);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.token) {
      throw new Error("Merged sign-in session is not ready yet.");
    }
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  private toErrorMessage(response: Response, data: any): string {
    const backendMessage = data?.error?.message || data?.detail;

    if (response.status === 401) {
      return backendMessage || "Your merged sign-in session expired. Please sign in again.";
    }

    if (response.status === 403) {
      return backendMessage || "You do not have permission to use this cultivator action.";
    }

    if (response.status === 404) {
      return backendMessage || "Cultivator endpoint not found.";
    }

    if (response.status === 503) {
      return backendMessage || "Cultivator service is temporarily unavailable.";
    }

    if (response.status >= 500) {
      return backendMessage || "Cultivator service hit a server error. Please try again later.";
    }

    return backendMessage || `Request failed (status ${response.status})`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    auth: boolean = true,
    timeoutMs: number = 45000
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth) {
      Object.assign(headers, this.getAuthHeaders());
    }

    const url = `${API_BASE_URL}${path}`;

    if (__DEV__) {
      console.info(`[CultivatorAPI] ${method.toUpperCase()} ${url} auth=${auth ? (this.token ? "yes" : "no") : "n/a"}`);
    }

    const makeFetch = async (attempt: number): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      } catch (networkError: any) {
        if (networkError?.name === "AbortError" && method.toUpperCase() === "GET" && attempt === 1) {
          return makeFetch(2);
        }

        if (networkError?.name === "AbortError") {
          throw new Error(`Request timeout after ${Math.round(timeoutMs / 1000)}s`);
        }

        throw new Error(`Network error: ${networkError.message || "Unable to connect to server"}`);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const response = await makeFetch(1);

    if (__DEV__) {
      console.info(`[CultivatorAPI] ${method.toUpperCase()} ${url} -> ${response.status}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server error (status ${response.status})`);
    }

    if (!response.ok) {
      const message = this.toErrorMessage(response, data);
      if (__DEV__) {
        console.warn(`[CultivatorAPI] Request failed ${method.toUpperCase()} ${url}`, {
          status: response.status,
          message,
          payload: data,
        });
      }
      throw new Error(message);
    }

    return data;
  }

  async getJobs(status?: string): Promise<{ jobs: Job[]; total: number }> {
    const query = status ? `?status=${status}` : "";
    return this.request("GET", `/jobs/${query}`, undefined, true, 60000);
  }

  async getMyJobs(): Promise<{ jobs: Job[]; total: number }> {
    return this.request("GET", "/jobs/my", undefined, true, 60000);
  }

  async createJob(data: {
    title: string;
    districtOrLocation: string;
    startsOnText?: string;
    priorExperience: string;
  }): Promise<Job> {
    return this.request("POST", "/jobs/", data);
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    return this.request("PATCH", `/jobs/${jobId}/status?status=${status}`);
  }

  async getApplications(status?: string): Promise<{ applications: Application[]; total: number }> {
    const query = status ? `?status=${status}` : "";
    return this.request("GET", `/applications/${query}`, undefined, true, 60000);
  }

  async applyToJob(jobId: string): Promise<Application> {
    return this.request("POST", "/applications/", { jobId });
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<void> {
    return this.request("PATCH", `/applications/${applicationId}/status`, { status });
  }

  async initiateCall(jobId: string): Promise<CallInitiateResponse> {
    return this.request("POST", "/calls/initiate", { jobId });
  }

  async checkIncomingCall(): Promise<IncomingCallResponse> {
    return this.request("GET", "/calls/incoming");
  }

  async acceptCall(callId: string): Promise<CallAcceptResponse> {
    return this.request("POST", `/calls/${callId}/accept`);
  }

  async rejectCall(callId: string): Promise<{ success: boolean; message: string }> {
    return this.request("POST", `/calls/${callId}/reject`);
  }

  async endCall(callId: string): Promise<{ success: boolean; message: string }> {
    return this.request("POST", `/calls/${callId}/end`);
  }

  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    return this.request("GET", `/calls/${callId}`);
  }

  async startCloudRecording(callId: string): Promise<StartRecordingResponse> {
    return this.request("POST", `/calls/${callId}/recording/start`);
  }

  async stopCloudRecording(callId: string): Promise<StopRecordingResponse> {
    return this.request("POST", `/calls/${callId}/recording/stop`);
  }

  async uploadRecording(callId: string, audioUri: string, retryCount: number = 0): Promise<RecordingUploadResponse> {
    const formData = new FormData();
    const fileName = audioUri.split("/").pop() || "recording.wav";
    const fileUri = audioUri.startsWith("file://") ? audioUri : `file://${audioUri}`;

    let fileInfo: { exists: boolean; size?: number | null } | null = null;
    try {
      fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
    } catch (fileInfoError) {
      console.warn("[CultivatorAPI] Failed to inspect upload file before request", {
        callId,
        rawUri: audioUri,
        normalizedUri: fileUri,
        error: fileInfoError,
      });
    }

    if (__DEV__) {
      console.info("[CultivatorAPI] POST upload /calls/{callId}/recording", {
        callId,
        rawUri: audioUri,
        normalizedUri: fileUri,
        fileName,
        fileExists: fileInfo?.exists ?? "unknown",
        fileSize: fileInfo?.size ?? "unknown",
      });
    }

    if (fileInfo && !fileInfo.exists) {
      throw new Error("Recorded audio file is missing before upload starts.");
    }

    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: "audio/wav",
    } as any);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch(`${API_BASE_URL}/calls/${callId}/recording`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (__DEV__) {
        console.info(`[CultivatorAPI] POST ${API_BASE_URL}/calls/${callId}/recording -> ${response.status}`);
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(this.toErrorMessage(response, data));
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (__DEV__) {
        console.warn("[CultivatorAPI] Upload request failed", {
          callId,
          rawUri: audioUri,
          normalizedUri: fileUri,
          fileExists: fileInfo?.exists ?? "unknown",
          fileSize: fileInfo?.size ?? "unknown",
          retryCount,
          name: error?.name,
          message: error?.message,
        });
      }

      if (
        retryCount < 2 &&
        (error.name === "AbortError" || error.message?.includes("Network") || error.message?.includes("Failed to fetch"))
      ) {
        await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 2000));
        return this.uploadRecording(callId, audioUri, retryCount + 1);
      }

      if (error.name === "AbortError") {
        throw new Error("Upload timeout after 5 minutes. Try a faster connection and retry.");
      }

      throw error;
    }
  }

  async inviteForInterview(jobId: string, clientId: string, scheduledAt?: string): Promise<InterviewInviteResponse> {
    const body = scheduledAt ? { scheduledAt } : {};
    return this.request("POST", `/admin/interviews/${jobId}/${clientId}/invite`, body);
  }

  async analyzeInterviewVideo(
    jobId: string,
    clientId: string,
    videoUri: string,
    durationSeconds: number
  ): Promise<InterviewAnalyzeResponse> {
    const formData = new FormData();
    const fileName = videoUri.split("/").pop() || "interview.mp4";

    formData.append("file", {
      uri: videoUri,
      name: fileName,
      type: "video/mp4",
    } as any);
    formData.append("duration_seconds", durationSeconds.toString());

    const response = await fetch(`${API_BASE_URL}/admin/interviews/${jobId}/${clientId}/analyze-video`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(this.toErrorMessage(response, data));
    }
    return data;
  }

  async getInterviewStatus(jobId: string, clientId: string): Promise<InterviewStatusResponse> {
    return this.request("GET", `/admin/interviews/${jobId}/${clientId}`);
  }

  async rejectApplication(jobId: string, clientId: string): Promise<{ success: boolean; message: string; applicationStatus: string }> {
    return this.request("POST", `/admin/interviews/${jobId}/${clientId}/reject`);
  }

  async getNotifications(unreadOnly: boolean = false): Promise<NotificationListResponse> {
    const query = unreadOnly ? "?unread_only=true" : "";
    return this.request("GET", `/notifications/${query}`);
  }

  async markNotificationsRead(notificationIds?: string[]): Promise<{ success: boolean; markedCount: number }> {
    const body = notificationIds ? { notificationIds } : {};
    return this.request("POST", "/notifications/mark-read", body);
  }

  async getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
    return this.request("GET", "/notifications/unread-count");
  }

  async getGate1Insight(intentLabel: string, confidence: number, scores: Record<string, number>): Promise<InsightResponse> {
    return this.request("POST", "/explain/gate1", {
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
    return this.request("POST", "/explain/gate2", {
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
    gate: "gate1" | "gate2",
    numQuestions: number = 5
  ): Promise<QuestionGenerationResponse> {
    return this.request("POST", "/explain/questions", {
      job_title: jobTitle,
      plantation_type: plantationType,
      gate,
      num_questions: numQuestions,
    });
  }

  async getJobCallAnalyses(jobId: string): Promise<{ analyses: CallStatusResponse[] }> {
    return this.request("GET", `/jobs/${jobId}/call-analyses`);
  }

  async getJobInterviewAnalyses(jobId: string): Promise<{ analyses: Interview[] }> {
    return this.request("GET", `/jobs/${jobId}/interview-analyses`);
  }
}

export const api = new ApiService();
export const CULTIVATOR_API_BASE_URL = API_BASE_URL;
export const CULTIVATOR_API_BASE_URL_SOURCE = cultivatorBackend.source;
