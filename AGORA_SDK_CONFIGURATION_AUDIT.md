# AGORA SDK Configuration Audit

## Scope

Audit of frontend Agora SDK initialization and `joinChannel` usage for token-auth mode correctness.

Files audited:

- `frontend/package.json`
- `frontend/src/hooks/useAgora.ts`
- `frontend/app/cultivator/admin/call.tsx`
- `frontend/app/cultivator/call.tsx`
- `frontend/src/config.ts`
- `frontend/node_modules/react-native-agora/lib/typescript/src/IAgoraRtcEngine.d.ts`

## 1. SDK Package + Version

From `frontend/package.json`:

- Package: `react-native-agora`
- Version: `^4.6.2`

## 2. Engine Initialization Code

From `frontend/src/hooks/useAgora.ts`:

```ts
const agoraModule = require('react-native-agora');
createAgoraRtcEngine = agoraModule.createAgoraRtcEngine;
...
const engine = createAgoraRtcEngine();
engine.initialize({
  appId: config.appId,
  channelProfile: ChannelProfileType.ChannelProfileCommunication,
});
engine.enableAudio();
engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
```

Initialization parameter used for App ID:

- `config.appId`

Where `config.appId` comes from:

- Admin call screen: `frontend/app/cultivator/admin/call.tsx`
- Client call screen: `frontend/app/cultivator/call.tsx`

Both construct:

```ts
appId: agora.appId || EXPO_PUBLIC_AGORA_APP_ID,
channelName: agora.channelName,
token: agora.token,
uid: agora.uid,
```

## 3. joinChannel Invocation

From `frontend/src/hooks/useAgora.ts`:

```ts
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
```

Runtime diagnostics immediately before call:

```ts
console.log('[AGORA-JOIN] AppID:', config.appId);
console.log('[AGORA-JOIN] Channel:', config.channelName);
console.log('[AGORA-JOIN] UID:', config.uid);
console.log('[AGORA-JOIN] Token length:', config.token.length);
console.log('[AGORA-JOIN] Token preview:', config.token.substring(0, 20) + '...');
```

## 4. API Signature Compatibility Check

From installed typings (`react-native-agora`):

`frontend/node_modules/react-native-agora/lib/typescript/src/IAgoraRtcEngine.d.ts`

```ts
joinChannel(token: string, channelId: string, uid: number, options: ChannelMediaOptions): number;
```

Conclusion:

- Frontend invocation matches SDK v4.x signature exactly:
  - `token: string`
  - `channelId: string`
  - `uid: number`
  - `options: ChannelMediaOptions`

## 5. Token / UID / Channel Inputs to SDK

From admin and client screen config assembly:

- `token` passed to hook: `agora.token` (backend payload, or refreshed token from `/api/agora/generate-token`)
- `uid` passed to hook: `agora.uid`
- `channelName` passed to hook: `agora.channelName`
- `appId` passed to hook: `agora.appId` with fallback `EXPO_PUBLIC_AGORA_APP_ID`

Validation guards before join:

- `!agora.appId` -> reject
- `!agora.token` -> reject
- `!agora.channelName` -> reject
- invalid `uid` -> reject

## 6. Check for Incorrect AppID-Only Mode

Searched frontend for any join without token:

- No `joinChannel(null, ...)`
- No `joinChannel("", ...)`
- No AppID-only join invocation found

Therefore frontend is not using AppID-only mode in active code path.

## 7. Risk Observation

Although join is token-mode correct, there is one configuration risk:

- AppID in call screens uses fallback: `agora.appId || EXPO_PUBLIC_AGORA_APP_ID`.
- If backend `agora.appId` were absent and env fallback differed from backend signing context, this could cause rejection.
- In your verified runs, backend `agora.appId` is present and consistent.

## 8. Determination

SDK configuration is token-auth mode correct and API-compatible for `react-native-agora@^4.6.2`.

No frontend SDK misuse was found that would itself explain `INVALID_TOKEN`:

- Engine is initialized with an App ID.
- `joinChannel` uses non-empty token, channel, uid, and proper options.
- Parameter order matches SDK signature.
- No AppID-only join path detected.

Given prior runtime parity checks (AppID/channel/uid/token length/prefix), this audit does not identify a frontend SDK configuration defect likely to cause `CONNECTION_CHANGED_INVALID_TOKEN (8)`.

