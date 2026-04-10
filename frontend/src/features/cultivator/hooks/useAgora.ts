import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

let createAgoraRtcEngine: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let ConnectionStateType: any = null;
let AudioRecordingQualityType: any = null;
let AudioFileRecordingType: any = null;
let RecorderState: any = null;
let RecorderReasonCode: any = null;

if (Platform.OS !== "web") {
  try {
    const agoraModule = require("react-native-agora");
    createAgoraRtcEngine = agoraModule.createAgoraRtcEngine;
    ChannelProfileType = agoraModule.ChannelProfileType;
    ClientRoleType = agoraModule.ClientRoleType;
    ConnectionStateType = agoraModule.ConnectionStateType;
    AudioRecordingQualityType = agoraModule.AudioRecordingQualityType;
    AudioFileRecordingType = agoraModule.AudioFileRecordingType;
    RecorderState = agoraModule.RecorderState;
    RecorderReasonCode = agoraModule.RecorderReasonCode;
  } catch (error) {
    console.warn("Agora SDK not available on this platform:", error);
  }
}

export interface AgoraConfig {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
}

export interface AgoraState {
  isConnected: boolean;
  isJoined: boolean;
  isMuted: boolean;
  remoteUsers: number[];
  connectionState: string;
  error: string | null;
}

export interface UseAgoraReturn {
  state: AgoraState;
  joinChannel: () => Promise<boolean>;
  leaveChannel: () => Promise<void>;
  toggleMute: () => void;
  isRecording: boolean;
  isRecordingStarting: boolean;
  startLocalRecording: () => Promise<boolean>;
  stopLocalRecording: () => Promise<string | null>;
}

async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: "Microphone Permission",
      message: "This app needs access to your microphone for voice calls.",
      buttonNeutral: "Ask Me Later",
      buttonNegative: "Cancel",
      buttonPositive: "OK",
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn("Android permission error:", error);
    return false;
  }
}

export function useAgora(config: AgoraConfig | null): UseAgoraReturn {
  const engineRef = useRef<any>(null);
  const recordingPathRef = useRef<string | null>(null);
  const nativeRecordingPathRef = useRef<string | null>(null);

  const [state, setState] = useState<AgoraState>({
    isConnected: false,
    isJoined: false,
    isMuted: false,
    remoteUsers: [],
    connectionState: "disconnected",
    error: null,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingStarting, setIsRecordingStarting] = useState(false);

  const initEngine = useCallback(async () => {
    if (!config?.appId) return null;
    if (!createAgoraRtcEngine) {
      setState((prev) => ({
        ...prev,
        error: "Voice calling not available on this platform. Please use a mobile build.",
      }));
      return null;
    }

    try {
      const engine = createAgoraRtcEngine();
      engine.initialize({
        appId: config.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
      engine.enableAudio();
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      engine.setAudioProfile(0, 0);
      return engine;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: `Failed to initialize voice call engine: ${error.message || error}`,
      }));
      return null;
    }
  }, [config?.appId]);

  const setupEventHandlers = useCallback((engine: any) => {
    const eventHandler: any = {
      onJoinChannelSuccess: () => {
        setState((prev) => ({
          ...prev,
          isJoined: true,
          isConnected: true,
          connectionState: "connected",
          error: null,
        }));
      },
      onLeaveChannel: () => {
        setState((prev) => ({
          ...prev,
          isJoined: false,
          isConnected: false,
          remoteUsers: [],
          connectionState: "disconnected",
        }));
      },
      onUserJoined: (_connection: any, remoteUid: number) => {
        setState((prev) => ({
          ...prev,
          remoteUsers: [...prev.remoteUsers.filter((userId) => userId !== remoteUid), remoteUid],
        }));
      },
      onUserOffline: (_connection: any, remoteUid: number) => {
        setState((prev) => ({
          ...prev,
          remoteUsers: prev.remoteUsers.filter((userId) => userId !== remoteUid),
        }));
      },
      onConnectionStateChanged: (_connection: any, nextState: any) => {
        let connectionState = "unknown";
        switch (nextState) {
          case ConnectionStateType.ConnectionStateConnecting:
            connectionState = "connecting";
            break;
          case ConnectionStateType.ConnectionStateConnected:
            connectionState = "connected";
            break;
          case ConnectionStateType.ConnectionStateReconnecting:
            connectionState = "reconnecting";
            break;
          case ConnectionStateType.ConnectionStateDisconnected:
            connectionState = "disconnected";
            break;
          case ConnectionStateType.ConnectionStateFailed:
            connectionState = "failed";
            break;
        }
        setState((prev) => ({
          ...prev,
          connectionState,
          isConnected: nextState === ConnectionStateType.ConnectionStateConnected,
        }));
      },
      onError: (errorCode: number, message: string) => {
        let errorMessage = `Call error: ${message} (code: ${errorCode})`;
        if (errorCode === 110) errorMessage = "Invalid token. Please try again.";
        if (errorCode === 2 || errorCode === 101) errorMessage = "Invalid App ID configuration.";
        if (errorCode === 102) errorMessage = "Invalid channel name.";
        if (errorCode === 1011) errorMessage = "Failed to initialize the recording device.";
        if (errorCode === 1012) errorMessage = "Failed to start the recording device.";
        if (errorCode === 1013) errorMessage = "Failed to stop the recording device.";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      },
      onRecorderStateChanged: (channelId: string, uid: number, nextState: number, reason: number) => {
        console.log("[CultivatorRecording] Recorder state changed:", {
          channelId,
          uid,
          state: nextState,
          stateName:
            nextState === RecorderState?.RecorderStateStart
              ? "start"
              : nextState === RecorderState?.RecorderStateStop
                ? "stop"
                : nextState === RecorderState?.RecorderStateError
                  ? "error"
                  : "unknown",
          reason,
          reasonName:
            reason === RecorderReasonCode?.RecorderReasonNone
              ? "none"
              : reason === RecorderReasonCode?.RecorderReasonWriteFailed
                ? "write_failed"
                : reason === RecorderReasonCode?.RecorderReasonNoStream
                  ? "no_stream"
                  : reason === RecorderReasonCode?.RecorderReasonOverMaxDuration
                    ? "over_max_duration"
                    : reason === RecorderReasonCode?.RecorderReasonConfigChanged
                      ? "config_changed"
                      : "unknown",
        });
      },
    };

    engine.registerEventHandler(eventHandler);
    return eventHandler;
  }, []);

  const joinChannel = useCallback(async (): Promise<boolean> => {
    if (!config) {
      setState((prev) => ({ ...prev, error: "No Agora configuration provided" }));
      return false;
    }

    const hasPermission = await requestAndroidPermissions();
    if (!hasPermission) {
      setState((prev) => ({ ...prev, error: "Microphone permission denied" }));
      return false;
    }

    try {
      if (!engineRef.current) {
        const engine = await initEngine();
        if (!engine) return false;
        engineRef.current = engine;
        setupEventHandlers(engine);
      }

      setState((prev) => ({ ...prev, connectionState: "connecting", error: null }));
      engineRef.current.joinChannel(config.token, config.channelName, config.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      });
      return true;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to join call",
        connectionState: "failed",
      }));
      return false;
    }
  }, [config, initEngine, setupEventHandlers]);

  const leaveChannel = useCallback(async () => {
    try {
      if (isRecording && engineRef.current) {
        engineRef.current.stopAudioRecording();
        setIsRecording(false);
      }
      if (engineRef.current) {
        engineRef.current.leaveChannel();
      }
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  }, [isRecording]);

  const toggleMute = useCallback(() => {
    if (!engineRef.current) return;
    const newMuteState = !state.isMuted;
    engineRef.current.muteLocalAudioStream(newMuteState);
    setState((prev) => ({ ...prev, isMuted: newMuteState }));
  }, [state.isMuted]);

  const startLocalRecording = useCallback(async (): Promise<boolean> => {
    if (!engineRef.current || !AudioRecordingQualityType || !AudioFileRecordingType) {
      return false;
    }

    try {
      setIsRecordingStarting(true);
      const filename = `call_recording_${Date.now()}.wav`;
      const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!baseDirectory) {
        console.error("[CultivatorRecording] No writable FileSystem directory is available for local recording");
        return false;
      }
      const recordingUri = `${baseDirectory}${filename}`;
      const nativeFilePath =
        Platform.OS === "android" && recordingUri.startsWith("file://")
          ? recordingUri.replace("file://", "")
          : recordingUri;
      console.log("[CultivatorRecording] Starting local recording:", {
        api: "startAudioRecording",
        recordingUri,
        nativeFilePath,
        sampleRate: 16000,
        recordingChannel: 1,
        quality: AudioRecordingQualityType.AudioRecordingQualityMedium,
        fileRecordingType: AudioFileRecordingType.AudioFileRecordingMixed,
      });

      const result = engineRef.current.startAudioRecording({
        filePath: nativeFilePath,
        sampleRate: 16000,
        recordingChannel: 1,
        quality: AudioRecordingQualityType.AudioRecordingQualityMedium,
        fileRecordingType: AudioFileRecordingType.AudioFileRecordingMixed,
      });

      console.log("[CultivatorRecording] startAudioRecording result:", result);

      if (result === 0) {
        recordingPathRef.current = recordingUri;
        nativeRecordingPathRef.current = nativeFilePath;
        setIsRecordingStarting(false);
        setIsRecording(true);
        return true;
      }

      setIsRecordingStarting(false);
      return false;
    } catch (error) {
      setIsRecordingStarting(false);
      console.error("Failed to start recording:", error);
      return false;
    }
  }, []);

  const stopLocalRecording = useCallback(async (): Promise<string | null> => {
    if (!engineRef.current) return null;

    try {
      setIsRecordingStarting(false);
      const result = engineRef.current.stopAudioRecording();
      console.log("[CultivatorRecording] stopAudioRecording result:", result);
      if (result === 0) {
        const filePath = recordingPathRef.current;
        const nativeFilePath = nativeRecordingPathRef.current;
        recordingPathRef.current = null;
        nativeRecordingPathRef.current = null;
        setIsRecording(false);
        if (filePath) {
          for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(filePath);
              console.log("[CultivatorRecording] Stopped local recording:", {
                uri: filePath,
                nativeFilePath,
                exists: fileInfo.exists,
                size: fileInfo.exists ? fileInfo.size ?? 0 : 0,
                attempt: attempt + 1,
              });
              if (fileInfo.exists && (fileInfo.size ?? 0) > 0) {
                break;
              }
            } catch (fileInfoError) {
              console.warn("[CultivatorRecording] Failed to inspect recorded file:", fileInfoError);
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
        return filePath;
      }
      return null;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log("[CultivatorRecording] Recording lifecycle state:", {
      isRecordingStarting,
      isRecording,
    });
  }, [isRecordingStarting, isRecording]);

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (engineRef.current) {
          try {
            engineRef.current.stopAudioRecording();
          } catch {
            // ignore cleanup errors
          }
          engineRef.current.leaveChannel();
          engineRef.current.release();
          engineRef.current = null;
        }
        recordingPathRef.current = null;
        nativeRecordingPathRef.current = null;
      };
      cleanup();
    };
  }, []);

  return {
    state,
    joinChannel,
    leaveChannel,
    toggleMute,
    isRecording,
    isRecordingStarting,
    startLocalRecording,
    stopLocalRecording,
  };
}
