/**
 * Agora RTC Hook for voice calling
 *
 * Manages Agora RTC engine lifecycle, audio streaming, and recording.
 * Uses Agora's native audio recording to capture both sides of the conversation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

// Conditionally import Agora only on native platforms
let createAgoraRtcEngine: any = null;
let IRtcEngine: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let RtcConnection: any = null;
let IRtcEngineEventHandler: any = null;
let ConnectionStateType: any = null;
let ConnectionChangedReasonType: any = null;
let UserOfflineReasonType: any = null;
let AudioRecordingQualityType: any = null;
let AudioFileRecordingType: any = null;

// Only import on native platforms
if (Platform.OS !== 'web') {
  try {
    const agoraModule = require('react-native-agora');
    createAgoraRtcEngine = agoraModule.createAgoraRtcEngine;
    IRtcEngine = agoraModule.IRtcEngine;
    ChannelProfileType = agoraModule.ChannelProfileType;
    ClientRoleType = agoraModule.ClientRoleType;
    RtcConnection = agoraModule.RtcConnection;
    IRtcEngineEventHandler = agoraModule.IRtcEngineEventHandler;
    ConnectionStateType = agoraModule.ConnectionStateType;
    ConnectionChangedReasonType = agoraModule.ConnectionChangedReasonType;
    UserOfflineReasonType = agoraModule.UserOfflineReasonType;
    AudioRecordingQualityType = agoraModule.AudioRecordingQualityType;
    AudioFileRecordingType = agoraModule.AudioFileRecordingType;
  } catch (error) {
    console.warn('Agora SDK not available on this platform:', error);
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
  // returns boolean indicating success/failure
  startLocalRecording: () => Promise<boolean>;
  stopLocalRecording: () => Promise<string | null>;
}

/**
 * Request microphone permissions for Android
 */
async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'This app needs access to your microphone for voice calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Android permission error:', err);
    return false;
  }
}

/**
 * Hook for managing Agora RTC voice calls
 */
export function useAgora(config: AgoraConfig | null): UseAgoraReturn {
  const engineRef = useRef<any>(null);
  const recordingPathRef = useRef<string | null>(null);
  
  const [state, setState] = useState<AgoraState>({
    isConnected: false,
    isJoined: false,
    isMuted: false,
    remoteUsers: [],
    connectionState: 'disconnected',
    error: null,
  });
  
  const [isRecording, setIsRecording] = useState(false);

  /**
   * Initialize the Agora RTC engine
   */
  const initEngine = useCallback(async () => {
    if (!config?.appId) {
      console.warn('Agora App ID not provided');
      return null;
    }

    console.log('Initializing Agora with App ID:', config.appId.substring(0, 10) + '...');

    // Check if Agora is available on this platform
    if (!createAgoraRtcEngine) {
      console.warn('Agora SDK not available on this platform (web)');
      setState(prev => ({
        ...prev,
        error: 'Voice calling not available on web. Please use a mobile device.',
      }));
      return null;
    }

    try {
      console.log('Creating Agora RTC engine...');
      const engine = createAgoraRtcEngine();
      
      console.log('Initializing engine with appId...');
      engine.initialize({
        appId: config.appId,
        // For voice calls only
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      console.log('Enabling audio...');
      // Enable audio (voice call)
      engine.enableAudio();
      
      console.log('Setting client role...');
      // Set as broadcaster to both send and receive audio
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Set audio profile for clear voice
      engine.setAudioProfile(0, 0); // Default profile

      console.log('Agora engine initialized successfully');
      return engine;
    } catch (error: any) {
      console.error('Failed to initialize Agora engine:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to initialize voice call engine: ${error.message || error}`,
      }));
      return null;
    }
  }, [config?.appId]);

  /**
   * Set up event handlers for the Agora engine
   */
  const setupEventHandlers = useCallback((engine: any) => {
    const eventHandler: any = {
      onJoinChannelSuccess: (connection: any, elapsed: number) => {
        console.log('Joined channel successfully:', connection.channelId);
        setState(prev => ({
          ...prev,
          isJoined: true,
          isConnected: true,
          connectionState: 'connected',
          error: null,
        }));
      },

      onLeaveChannel: (connection: any, stats: any) => {
        console.log('Left channel:', connection.channelId);
        setState(prev => ({
          ...prev,
          isJoined: false,
          isConnected: false,
          remoteUsers: [],
          connectionState: 'disconnected',
        }));
      },

      onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
        console.log('Remote user joined:', remoteUid);
        setState(prev => ({
          ...prev,
          remoteUsers: [...prev.remoteUsers.filter(u => u !== remoteUid), remoteUid],
        }));
      },

      onUserOffline: (
        connection: any,
        remoteUid: number,
        reason: any
      ) => {
        console.log('Remote user offline:', remoteUid, 'reason:', reason);
        setState(prev => ({
          ...prev,
          remoteUsers: prev.remoteUsers.filter(u => u !== remoteUid),
        }));
      },

      onConnectionStateChanged: (
        connection: any,
        state: any,
        reason: any
      ) => {
        console.log('Connection state changed:', state, 'reason:', reason);
        let connectionState = 'unknown';
        switch (state) {
          case ConnectionStateType.ConnectionStateConnecting:
            connectionState = 'connecting';
            break;
          case ConnectionStateType.ConnectionStateConnected:
            connectionState = 'connected';
            break;
          case ConnectionStateType.ConnectionStateReconnecting:
            connectionState = 'reconnecting';
            break;
          case ConnectionStateType.ConnectionStateDisconnected:
            connectionState = 'disconnected';
            break;
          case ConnectionStateType.ConnectionStateFailed:
            connectionState = 'failed';
            break;
        }
        setState(prev => ({
          ...prev,
          connectionState,
          isConnected: state === ConnectionStateType.ConnectionStateConnected,
        }));
      },

      onError: (err: number, msg: string) => {
        console.error('Agora error code:', err, 'message:', msg);
        // Common Agora error codes:
        // 110 - Invalid token
        // 17 - Request to join channel is rejected (already in channel)
        // 2 - Invalid App ID
        // 101 - Not a valid App ID
        // 102 - Not a valid channel name
        let errorMessage = `Call error: ${msg} (code: ${err})`;
        if (err === 110) {
          errorMessage = 'Invalid token. Please try again.';
        } else if (err === 2 || err === 101) {
          errorMessage = 'Invalid App ID configuration.';
        } else if (err === 102) {
          errorMessage = 'Invalid channel name.';
        }
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      },

      onAudioVolumeIndication: (
        connection: any,
        speakers: any[],
        speakerNumber: number,
        totalVolume: number
      ) => {
        // Can be used to show speaking indicators
      },
    };

    engine.registerEventHandler(eventHandler);
    return eventHandler;
  }, []);

  /**
   * Join the Agora channel for voice call
   */
  const joinChannel = useCallback(async (): Promise<boolean> => {
    if (!config) {
      setState(prev => ({ ...prev, error: 'No Agora configuration provided' }));
      return false;
    }

    try {
      // Request permissions
      const hasPermission = await requestAndroidPermissions();
      if (!hasPermission) {
        setState(prev => ({
          ...prev,
          error: 'Microphone permission denied',
        }));
        return false;
      }

      // Initialize engine if needed
      if (!engineRef.current) {
        const engine = await initEngine();
        if (!engine) return false;
        engineRef.current = engine;
        setupEventHandlers(engine);
      }

      setState(prev => ({
        ...prev,
        connectionState: 'connecting',
        error: null,
      }));

      // Join the channel - v4.x API
      // joinChannel(token, channelId, uid, options)
      console.log('Joining Agora channel:', config.channelName, 'with UID:', config.uid);
      
      engineRef.current.joinChannel(
        config.token,
        config.channelName,
        config.uid,
        {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
        }
      );

      console.log('joinChannel called successfully');
      return true;
    } catch (error: any) {
      console.error('Failed to join channel:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to join call',
        connectionState: 'failed',
      }));
      return false;
    }
  }, [config, initEngine, setupEventHandlers]);

  /**
   * Leave the channel and clean up
   */
  const leaveChannel = useCallback(async () => {
    try {
      // Stop Agora recording if active
      if (isRecording && engineRef.current) {
        engineRef.current.stopAudioRecording();
        setIsRecording(false);
      }

      if (engineRef.current) {
        engineRef.current.leaveChannel();
      }
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  }, [isRecording]);

  /**
   * Toggle mute/unmute microphone
   */
  const toggleMute = useCallback(() => {
    if (!engineRef.current) return;

    const newMuteState = !state.isMuted;
    engineRef.current.muteLocalAudioStream(newMuteState);
    setState(prev => ({ ...prev, isMuted: newMuteState }));
  }, [state.isMuted]);

  /**
   * Start Agora audio recording (captures both local and remote audio)
   * This records both sides of the conversation directly from Agora
   * Returns true if recording started successfully, false otherwise
   */
  const startLocalRecording = useCallback(async (): Promise<boolean> => {
    if (!engineRef.current) {
      console.error('Engine not initialized for recording');
      return false;
    }

    // Check if Agora recording is available
    if (!AudioRecordingQualityType || !AudioFileRecordingType) {
      console.warn('Agora recording not available on this platform');
      setState(prev => ({
        ...prev,
        error: 'Audio recording not available on web. Please use a mobile device.',
      }));
      return false;
    }

    try {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const filename = `call_recording_${timestamp}.wav`;
      
      // Get proper path for the platform
      let filePath: string;
      if (Platform.OS === 'android') {
        // Use app's cache directory on Android
        filePath = `/data/user/0/${require('../../app.json').expo.android?.package || 'com.smartagri.mobile'}/cache/${filename}`;
      } else {
        // iOS uses Documents directory
        filePath = `${filename}`; // Agora will use default path on iOS
      }

      // Start Agora's native audio recording
      // This captures BOTH local microphone and remote audio (mixed)
      const result = engineRef.current.startAudioRecording({
        filePath: filePath,
        sampleRate: 16000,  // Good for voice/speech recognition
        recordingChannel: 1,  // Mono
        quality: AudioRecordingQualityType.AudioRecordingQualityMedium,
        // Record both local mic and remote audio mixed together
        fileRecordingType: AudioFileRecordingType.AudioFileRecordingMixed,
      });

      if (result === 0) {
        recordingPathRef.current = filePath;
        setIsRecording(true);
        console.log('Agora recording started successfully:', filePath);
        return true;
      } else {
        console.error('Failed to start Agora recording, error code:', result);
        return false;
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }, []);

  /**
   * Stop Agora audio recording and return the file URI
   */
  const stopLocalRecording = useCallback(async (): Promise<string | null> => {
    if (!engineRef.current) return null;

    try {
      // Stop Agora's audio recording
      const result = engineRef.current.stopAudioRecording();
      
      if (result === 0) {
        const filePath = recordingPathRef.current;
        recordingPathRef.current = null;
        setIsRecording(false);
        console.log('Agora recording stopped, saved to:', filePath);
        return filePath;
      } else {
        console.error('Failed to stop Agora recording, error code:', result);
        return null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }, []);

  /**
   * Cleanup on unmount or config change
   */
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (engineRef.current) {
          // Stop recording if active
          try {
            engineRef.current.stopAudioRecording();
          } catch (e) {
            // Ignore cleanup errors
          }
          engineRef.current.leaveChannel();
          engineRef.current.release();
          engineRef.current = null;
        }
        recordingPathRef.current = null;
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
    startLocalRecording,
    stopLocalRecording,
  };
}

export default useAgora;
