/**
 * Agora RTC Hook for voice calling
 *
 * Manages Agora RTC engine lifecycle, audio streaming, and recording.
 * Uses Agora's native audio recording to capture both sides of the conversation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AGORA_DEBUG } from '@/config';

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

let agoraModuleAvailable = false;
let agoraModuleError: string | null = null;

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
    
    agoraModuleAvailable = true;
    
    if (AGORA_DEBUG) {
      console.log('[AGORA-MODULE] Successfully loaded react-native-agora');
      console.log('[AGORA-MODULE] createAgoraRtcEngine available:', !!createAgoraRtcEngine);
      console.log('[AGORA-MODULE] ChannelProfileType available:', !!ChannelProfileType);
      console.log('[AGORA-MODULE] ConnectionStateType available:', !!ConnectionStateType);
    }
  } catch (error: any) {
    agoraModuleError = error.message || String(error);
    console.error('[AGORA-MODULE] CRITICAL: Failed to load react-native-agora:', agoraModuleError);
    console.error('[AGORA-MODULE] This likely means the native module is not properly linked');
  }
} else {
  if (AGORA_DEBUG) {
    console.log('[AGORA-MODULE] Running on web platform, Agora SDK not loaded');
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
    // Phase 2: Verify native module availability
    if (!agoraModuleAvailable) {
      console.error('[AGORA] CRITICAL: Native module not available');
      console.error('[AGORA] Module load error:', agoraModuleError || 'Unknown');
      console.error('[AGORA] This means react-native-agora is not properly installed or linked');
      setState(prev => ({
        ...prev,
        error: 'Agora native module not found. Please reinstall the app.',
      }));
      return null;
    }

    if (!createAgoraRtcEngine) {
      console.error('[AGORA] CRITICAL: createAgoraRtcEngine function not available');
      setState(prev => ({
        ...prev,
        error: 'Agora SDK initialization function missing',
      }));
      return null;
    }

    // Validate appId before initialization
    if (!config?.appId) {
      console.error('[AGORA] VALIDATION ERROR: Missing Agora App ID');
      console.log('[AGORA] Config:', { appId: config?.appId, hasConfig: !!config });
      setState(prev => ({
        ...prev,
        error: 'Missing Agora App ID configuration',
      }));
      return null;
    }

    console.log('[AGORA] Initializing engine with appId:', config.appId.substring(0, 10) + '...');
    
    if (AGORA_DEBUG) {
      console.log('[AGORA-DEBUG] Full initialization details:');
      console.log('[AGORA-DEBUG] - Platform:', Platform.OS);
      console.log('[AGORA-DEBUG] - App ID length:', config.appId.length);
      console.log('[AGORA-DEBUG] - Module available:', agoraModuleAvailable);
      console.log('[AGORA-DEBUG] - createAgoraRtcEngine type:', typeof createAgoraRtcEngine);
    }

    // Check if Agora is available on this platform
    if (!createAgoraRtcEngine) {
      console.warn('[AGORA] Native module unavailable (expected on web)');
      setState(prev => ({
        ...prev,
        error: 'Voice calling not available on this platform. Please use a mobile device.',
      }));
      return null;
    }

    try {
      console.log('[AGORA] Creating RTC engine instance...');
      const engine = createAgoraRtcEngine();
      
      if (AGORA_DEBUG) {
        console.log('[AGORA-DEBUG] Engine instance created:', !!engine);
        console.log('[AGORA-DEBUG] Engine type:', typeof engine);
      }
      
      console.log('[AGORA] Initializing engine with appId...');
      engine.initialize({
        appId: config.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      console.log('[AGORA] Enabling audio stream...');
      engine.enableAudio();
      
      console.log('[AGORA] Setting client role to broadcaster...');
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      console.log('[AGORA] Setting audio profile...');
      engine.setAudioProfile(0, 0);

      console.log('[AGORA] Engine initialization successful');
      return engine;
    } catch (error: any) {
      console.error('[AGORA] Engine initialization error:', error.message || error);
      console.error('[AGORA] Error stack:', error.stack);
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
        // PHASE 7: Join success logging
        console.log('[AGORA-JOIN-SUCCESS]');
        console.log('[AGORA-CONNECTED]');
        console.log('[AGORA-CONNECTED] Channel:', connection.channelId);
        console.log('[AGORA-CONNECTED] UID:', connection.localUid);
        console.log('[AGORA-CONNECTED] Elapsed:', elapsed, 'ms');
        console.log('[AGORA-CONNECTED] ✓ SUCCESSFULLY JOINED CHANNEL AND CONNECTED TO AGORA SERVICE');
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
        const stateNames: Record<number, string> = {
          1: 'CONNECTING',
          2: 'CONNECTED',
          3: 'RECONNECTING',
          4: 'DISCONNECTED',
          5: 'FAILED',
        };
        const stateName = stateNames[state] || `UNKNOWN(${state})`;
        console.log('[AGORA] Connection state changed:', stateName, '(code: ' + state + ')', 'reason:', reason);
        
        let connectionState = 'unknown';
        switch (state) {
          case ConnectionStateType.ConnectionStateConnecting:
            connectionState = 'connecting';
            break;
          case ConnectionStateType.ConnectionStateConnected:
            connectionState = 'connected';
            console.log('[AGORA] ✓ SUCCESSFULLY CONNECTED TO CHANNEL');
            break;
          case ConnectionStateType.ConnectionStateReconnecting:
            connectionState = 'reconnecting';
            console.log('[AGORA] Reconnecting to channel...');
            break;
          case ConnectionStateType.ConnectionStateDisconnected:
            connectionState = 'disconnected';
            console.log('[AGORA] Disconnected from channel');
            break;
          case ConnectionStateType.ConnectionStateFailed:
            connectionState = 'failed';
            console.error('[AGORA] CONNECTION FAILED - reason:', reason);
            break;
        }
        setState(prev => ({
          ...prev,
          connectionState,
          isConnected: state === ConnectionStateType.ConnectionStateConnected,
        }));
      },

      onError: (err: number, msg: string) => {
        // PHASE 7: Join failure logging
        console.error(`[AGORA-JOIN-FAILED] error=${msg} code=${err}`);
        console.error('[AGORA] ===== SDK ERROR DETECTED =====');
        console.error('[AGORA] Error Code:', err);
        console.error('[AGORA] Error Message:', msg);
        
        // Phase 6: Enhanced error code detection with human-readable messages
        let errorMessage = `Call error: ${msg} (code: ${err})`;
        let errorCategory = 'UNKNOWN';
        let userGuidance = 'Please try again or contact support.';
        
        // Token/Authentication Errors (100-119)
        if (err === 110) {
          console.error('[AGORA] ERROR 110: Invalid or expired token');
          errorCategory = 'TOKEN_ERROR';
          errorMessage = 'Your call session has expired. Please try starting the call again.';
          userGuidance = 'The authentication token is invalid or expired.';
        } 
        // App ID Errors
        else if (err === 2 || err === 101) {
          console.error('[AGORA] ERROR 2/101: Invalid App ID');
          errorCategory = 'APP_ID_ERROR';
          errorMessage = 'Call configuration error. Please contact support.';
          userGuidance = 'The Agora App ID is invalid or doesn\'t match the certificate.';
        } 
        // Channel Name Errors
        else if (err === 102) {
          console.error('[AGORA] ERROR 102: Invalid channel name');
          errorCategory = 'CHANNEL_ERROR';
          errorMessage = 'Invalid call channel. Please try again.';
          userGuidance = 'The channel name contains invalid characters or format.';
        }
        // Join Channel Errors
        else if (err === 17) {
          console.error('[AGORA] ERROR 17: Join channel rejected by server');
          errorCategory = 'JOIN_REJECTED';
          errorMessage = 'Unable to join call. Please try again.';
          userGuidance = 'The Agora server rejected the join request. Check token privileges.';
        }
        else if (err === 18) {
          console.error('[AGORA] ERROR 18: Already joined channel');
          errorCategory = 'ALREADY_JOINED';
          errorMessage = 'You are already in this call.';
          userGuidance = 'Attempted to join a channel that is already joined.';
        }
        // Failed to Initialize
        else if (err === 1) {
          console.error('[AGORA] ERROR 1: General SDK failure');
          errorCategory = 'SDK_FAILURE';
          errorMessage = 'Call system initialization failed. Please restart the app.';
          userGuidance = 'The Agora SDK encountered a general failure.';
        }
        // Network Errors (10xx range)
        else if (err >= 1000 && err < 2000) {
          console.error('[AGORA] ERROR', err, ': Network-related error');
          errorCategory = 'NETWORK_ERROR';
          errorMessage = 'Network connection problem. Please check your internet.';
          userGuidance = 'Network connectivity issue detected.';
        }
        // Audio Device Errors
        else if (err === 1008) {
          console.error('[AGORA] ERROR 1008: Audio device module not initialized');
          errorCategory = 'AUDIO_DEVICE_ERROR';
          errorMessage = 'Microphone not available. Please check permissions.';
          userGuidance = 'Audio device module failed to initialize.';
        }
        else if (err === 1501) {
          console.error('[AGORA] ERROR 1501: Audio recording device error');
          errorCategory = 'RECORDING_ERROR';
          errorMessage = 'Microphone error. Please check if another app is using it.';
          userGuidance = 'Audio recording device is unavailable or in use.';
        }
        // Permission Errors
        else if (err === 16) {
          console.error('[AGORA] ERROR 16: Not initialized');
          errorCategory = 'INIT_ERROR';
          errorMessage = 'Call system not ready. Please try again.';
          userGuidance = 'Attempted to call SDK function before initialization.';
        }
        
        console.error('[AGORA] Error Category:', errorCategory);
        console.error('[AGORA] User Message:', errorMessage);
        console.error('[AGORA] Technical Guidance:', userGuidance);
        console.error('[AGORA] ===== END ERROR REPORT =====');
        
        if (AGORA_DEBUG) {
          console.log('[AGORA-DEBUG] Full error context:', {
            code: err,
            message: msg,
            category: errorCategory,
            timestamp: new Date().toISOString(),
            connectionState: 'check onConnectionStateChanged logs'
          });
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
   * Phase 3: Timeline logging with STEP markers for failure pinpointing
   */
  const joinChannel = useCallback(async (): Promise<boolean> => {
    console.log('[AGORA] ===== JOIN CHANNEL TIMELINE START =====');
    console.log('[AGORA] joinChannel() called with config:', !!config);
    
    if (AGORA_DEBUG) {
      console.log('[AGORA-DEBUG] Full config state:', {
        hasConfig: !!config,
        appId: config?.appId?.substring(0, 10) + '...',
        hasToken: !!config?.token,
        tokenLength: config?.token?.length,
        channelName: config?.channelName,
        uid: config?.uid,
        timestamp: new Date().toISOString()
      });
    }
    
    // ========== STEP 1: VALIDATE CONFIG ==========
    console.log('[AGORA] STEP 1: Validating configuration...');
    
    if (!config) {
      console.error('[AGORA] STEP 1 FAILED: No Agora configuration provided');
      setState(prev => ({ ...prev, error: 'No call configuration received' }));
      return false;
    }

    // Validate all required config fields
    console.log('[AGORA] STEP 1: Checking required fields - appId:', !!config.appId, 'token:', !!config.token, 'channelName:', !!config.channelName, 'uid:', typeof config.uid);
    
    if (!config.appId) {
      console.error('[AGORA] STEP 1 FAILED: Missing appId');
      setState(prev => ({ ...prev, error: 'Missing Agora App ID' }));
      return false;
    }

    if (!config.token) {
      console.error('[AGORA] STEP 1 FAILED: Missing token');
      setState(prev => ({ ...prev, error: 'Missing Agora authentication token' }));
      return false;
    }

    if (typeof config.token !== 'string') {
      console.error('[AGORA] STEP 1B FAILED: Token is not a string', typeof config.token);
      setState(prev => ({ ...prev, error: 'Invalid token format: token is not a string' }));
      return false;
    }

    const normalizedToken = config.token.trim();
    if (!normalizedToken) {
      console.error('[AGORA] STEP 1B FAILED: Token is empty after trim');
      setState(prev => ({ ...prev, error: 'Invalid token format: empty token' }));
      return false;
    }

    // ========== STEP 1B: VALIDATE TOKEN FORMAT ==========
    console.log('[AGORA-JOIN-VALIDATION] Validating token format...');
    console.log('[AGORA-JOIN-VALIDATION] Token length:', normalizedToken.length);
    console.log('[AGORA-JOIN-VALIDATION] Token prefix:', normalizedToken.substring(0, 10) + '...');

    if (normalizedToken.length < 50) {
      console.error('[AGORA] STEP 1B FAILED: Token too short - length:', normalizedToken.length);
      setState(prev => ({ ...prev, error: `Invalid token: length ${normalizedToken.length} (expected >= 50)` }));
      return false;
    }

    if (!normalizedToken.startsWith('006')) {
      console.error('[AGORA] STEP 1B FAILED: Token invalid prefix - does not start with 006');
      setState(prev => ({ ...prev, error: 'Invalid token format: invalid prefix' }));
      return false;
    }

    console.log('[AGORA-JOIN-VALIDATION] Token validation PASSED');
    console.log('[AGORA-JOIN-VALIDATION] Token length: ' + normalizedToken.length + ' (valid)');
    console.log('[AGORA-JOIN-VALIDATION] Token format: valid (starts with 006)');

    if (!config.channelName) {
      console.error('[AGORA] STEP 1 FAILED: Missing channelName');
      setState(prev => ({ ...prev, error: 'Missing channel name' }));
      return false;
    }

    if (typeof config.uid !== 'number' || config.uid <= 0) {
      console.error('[AGORA] STEP 1 FAILED: Invalid UID', config.uid);
      setState(prev => ({ ...prev, error: 'Invalid user ID for call' }));
      return false;
    }

    console.log('[AGORA] STEP 1 SUCCESS: All config fields validated');
    console.log('[AGORA] STEP 1: Config summary - Channel:', config.channelName, 'UID:', config.uid, 'Token length:', normalizedToken.length);

    try {
      // ========== STEP 2: REQUEST MICROPHONE PERMISSION ==========
      console.log('[AGORA] STEP 2: Requesting microphone permission...');
      const hasPermission = await requestAndroidPermissions();
      
      if (!hasPermission) {
        console.error('[AGORA] STEP 2 FAILED: Microphone access not granted');
        setState(prev => ({
          ...prev,
          error: 'Microphone permission denied. Please enable it in settings.',
        }));
        return false;
      }
      
      console.log('[AGORA] STEP 2 SUCCESS: Microphone permission granted');

      // ========== STEP 3: INITIALIZE AGORA ENGINE ==========
      console.log('[AGORA] STEP 3: Initializing Agora engine...');
      
      if (!engineRef.current) {
        console.log('[AGORA] STEP 3: Engine not initialized, calling initEngine()...');
        const engine = await initEngine();
        
        if (!engine) {
          console.error('[AGORA] STEP 3 FAILED: initEngine() returned null');
          console.error('[AGORA] STEP 3 FAILED: Check module availability and appId validity');
          return false;
        }
        
        console.log('[AGORA] STEP 3: Engine instance created, setting up event handlers...');
        engineRef.current = engine;
        setupEventHandlers(engine);
        console.log('[AGORA] STEP 3 SUCCESS: Engine initialized and event handlers registered');
      } else {
        console.log('[AGORA] STEP 3 SUCCESS: Engine already initialized, reusing existing instance');
      }

      // ========== STEP 4: JOIN CHANNEL ==========
      console.log('[AGORA] STEP 4: Joining channel...');
      console.log('[AGORA] STEP 4: Setting connection state to connecting...');
      
      setState(prev => ({
        ...prev,
        connectionState: 'connecting',
        error: null,
      }));

      console.log('[AGORA] STEP 4: Calling engine.joinChannel() with parameters:');
      console.log('[AGORA] STEP 4:   - Channel:', config.channelName);
      console.log('[AGORA] STEP 4:   - UID:', config.uid);
      console.log('[AGORA] STEP 4:   - Token length:', normalizedToken.length);
      console.log('[AGORA] STEP 4:   - Token preview:', normalizedToken.substring(0, 20) + '...');

      // PHASE 6: Before joinChannel logging
      const startsWithOo6 = normalizedToken.startsWith('006');
      console.log(`[AGORA-FRONTEND-JOIN] channel=${config.channelName} uid=${config.uid} prefix=${normalizedToken.substring(0, 10)} length=${normalizedToken.length} starts_with_006=${startsWithOo6}`);

      console.log('[AGORA-JOIN]');
      console.log('[AGORA-JOIN] AppID:', config.appId);
      console.log('[AGORA-JOIN] Channel:', config.channelName);
      console.log('[AGORA-JOIN] UID:', config.uid);
      console.log('[AGORA-JOIN] Token length:', normalizedToken.length);
      console.log('[AGORA-JOIN] Token preview:', normalizedToken.substring(0, 20) + '...');
      
      if (AGORA_DEBUG) {
        console.log('[AGORA-DEBUG] Full join parameters:', {
          token: normalizedToken,
          channelName: config.channelName,
          uid: config.uid,
          options: {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
            publishMicrophoneTrack: true,
            autoSubscribeAudio: true,
          }
        });
      }
      
      try {
        engineRef.current.joinChannel(
          normalizedToken,
          config.channelName,
          config.uid,
          {
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
            publishMicrophoneTrack: true,
            autoSubscribeAudio: true,
          }
        );
        
        console.log('[AGORA] STEP 4 SUCCESS: engine.joinChannel() executed without throwing');
        
        // ========== STEP 5: WAIT FOR CONNECTION CALLBACK ==========
        console.log('[AGORA] STEP 5: Waiting for onJoinChannelSuccess callback from Agora SDK...');
        console.log('[AGORA] STEP 5: If this step hangs, check:');
        console.log('[AGORA] STEP 5:   - Token validity and expiration');
        console.log('[AGORA] STEP 5:   - App ID matches certificate');
        console.log('[AGORA] STEP 5:   - Channel name format');
        console.log('[AGORA] STEP 5:   - Network connectivity');
        console.log('[AGORA] STEP 5:   - onError callback for error codes');
        console.log('[AGORA] ===== JOIN CHANNEL TIMELINE: AWAITING CALLBACK =====');
        
        return true;
      } catch (joinError: any) {
        console.error('[AGORA] STEP 4 FAILED: engine.joinChannel() threw exception');
        console.error('[AGORA] STEP 4 ERROR:', joinError.message || joinError);
        console.error('[AGORA] STEP 4 STACK:', joinError.stack);
        setState(prev => ({
          ...prev,
          error: `Failed to execute join: ${joinError.message || joinError}`,
          connectionState: 'failed',
        }));
        return false;
      }
      
    } catch (error: any) {
      console.error('[AGORA] TIMELINE EXCEPTION (outer try-catch):', error.message || error);
      console.error('[AGORA] EXCEPTION STACK:', error.stack);
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
   * Start Agora audio recording
   * Records to FileSystem.cacheDirectory with reliable cross-platform access
   */
  const startLocalRecording = useCallback(async (): Promise<boolean> => {
    if (!engineRef.current) {
      console.error('Engine not initialized for recording');
      console.error('[GATE1] Recording start failed: engine not initialized');
      return false;
    }

    if (!AudioRecordingQualityType || !AudioFileRecordingType) {
      console.warn('Agora recording not available on this platform');
      setState(prev => ({
        ...prev,
        error: 'Audio recording not available on web.',
      }));
      return false;
    }

    try {
      // ALWAYS require FileSystem.cacheDirectory - fail gracefully if unavailable
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
        console.error('[GATE1] Recording start failed: FileSystem.cacheDirectory is null');
        console.error('[GATE1] Recording cannot proceed without cache directory access');
        setState(prev => ({
          ...prev,
          error: 'Cannot access device storage for recording.',
        }));
        return false;
      }

      const recordingUri = `${cacheDir}call_recording_${Date.now()}.wav`;
      const agoraFilePath = recordingUri.replace('file://', '');

      console.log(`[GATE1] Recording URI created: ${recordingUri}`);
      console.log(`[GATE1] Agora path used: ${agoraFilePath}`);

      const result = engineRef.current.startAudioRecording({
        filePath: agoraFilePath,
        sampleRate: 16000,
        recordingChannel: 1,
        quality: AudioRecordingQualityType.AudioRecordingQualityMedium,
        fileRecordingType: AudioFileRecordingType.AudioFileRecordingMixed,
      });

      if (result === 0) {
        // Store upload URI format as source of truth.
        recordingPathRef.current = recordingUri;
        setIsRecording(true);
        console.log('Agora recording started:', agoraFilePath);
        console.log(`[GATE1] Recording started successfully path=${agoraFilePath}`);
        return true;
      } else {
        console.error('Failed to start Agora recording, error code:', result);
        console.error(`[GATE1] Recording start failed code=${result}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      console.error(`[GATE1] Recording start exception=${String(error)}`);
      return false;
    }
  }, []);

  /**
   * Stop Agora audio recording
   * Returns file:// URI format for upload (Expo FileSystem APIs require this)
   */
  const stopLocalRecording = useCallback(async (): Promise<string | null> => {
    const recordingUri = recordingPathRef.current;

    if (!engineRef.current) {
      console.error('[GATE1] Recording stop failed: engine not initialized');
      if (recordingUri) {
        console.warn(`[GATE1] Recording stop fallback - returning URI=${recordingUri}`);
        console.log(`[GATE1] Upload URI used: ${recordingUri}`);
        recordingPathRef.current = null;
        setIsRecording(false);
        return recordingUri;
      }
      return null;
    }

    try {
      const result = engineRef.current.stopAudioRecording();
      
      if (result === 0) {
        recordingPathRef.current = null;
        setIsRecording(false);
        
        if (recordingUri) {
          const agoraPath = recordingUri.replace('file://', '');
          console.log('Agora recording stopped:', agoraPath);
          console.log(`[GATE1] Recording stopped successfully - Agora path=${agoraPath} - Upload URI=${recordingUri}`);
          console.log(`[GATE1] Upload URI used: ${recordingUri}`);
          return recordingUri;
        } else {
          console.warn('[GATE1] Recording stopped but no path was stored');
          return null;
        }
      } else {
        console.error('Failed to stop Agora recording, error code:', result);
        console.error(`[GATE1] Recording stop failed code=${result}`);
        
        if (recordingUri) {
          // Return URI even on SDK error - file might still exist
          console.warn(`[GATE1] Recording stop SDK error but returning URI=${recordingUri}`);
          console.log(`[GATE1] Upload URI used: ${recordingUri}`);
          recordingPathRef.current = null;
          setIsRecording(false);
          return recordingUri;
        }
        return null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      console.error(`[GATE1] Recording stop exception=${String(error)}`);
      
      if (recordingUri) {
        // Return URI even on exception - file might still exist
        console.warn(`[GATE1] Recording stop exception but returning URI=${recordingUri}`);
        console.log(`[GATE1] Upload URI used: ${recordingUri}`);
        recordingPathRef.current = null;
        setIsRecording(false);
        return recordingUri;
      }
      return null;
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (engineRef.current) {
          try {
            engineRef.current.stopAudioRecording();
          } catch (e) {
            // Ignore
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
