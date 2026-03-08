# Agora API Integration for Backend

This guide covers the server-side implementation needed to support the Agora voice calling feature.

## Overview

**What the backend needs to do:**
1. Generate RTC tokens securely
2. Track voice call metadata
3. Provide recording upload endpoint
4. Manage call history and analytics

## Core Endpoints

### 1. Generate RTC Token

**Endpoint:** `POST /api/agora/generate-token`

**Purpose:** Generate a secure RTC token for joining a channel

**Request Body:**
```json
{
  "channelName": "agricultural-support",
  "uid": 12345,
  "role": "host"
}
```

**Response:**
```json
{
  "token": "006...",
  "appId": "1234567890abcdef1234567890abcdef",
  "uid": 12345,
  "channelName": "agricultural-support",
  "expiresIn": 3600
}
```

**Error Responses:**
```json
// Missing parameters
{ "error": "Missing channelName or uid" }

// Invalid role
{ "error": "Invalid role. Use 'host' or 'guest'" }

// Server error
{ "error": "Failed to generate token" }
```

### Implementation (Node.js/Express)

```javascript
const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token-builder');
const router = express.Router();

// Middleware to verify authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Verify JWT token
  req.userId = verifyToken(token);
  next();
};

router.post('/generate-token', authMiddleware, (req, res) => {
  const { channelName, uid, role = 'host' } = req.body;

  // Validate inputs
  if (!channelName || uid === undefined) {
    return res.status(400).json({ error: 'Missing channelName or uid' });
  }

  if (!['host', 'guest'].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Use 'host' or 'guest'" });
  }

  try {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_CERT;

    if (!appId || !appCertificate) {
      console.error('Missing Agora credentials');
      return res.status(500).json({ error: 'Service configuration error' });
    }

    // Token valid for 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Map application role to Agora RTC role
    const agoraRole = role === 'host' 
      ? RtcRole.PUBLISHER    // Can send and receive
      : RtcRole.SUBSCRIBER;  // Only receive

    // Generate the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    // Log token generation for audit
    console.log(`Token generated for user ${req.userId} in channel ${channelName}`);

    res.json({
      token,
      appId,
      uid,
      channelName,
      expiresIn: expirationTimeInSeconds,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
```

## Additional Endpoints

### 2. Upload Recording

**Endpoint:** `POST /api/calls/upload-recording`

**Purpose:** Handle audio recording file uploads from completed calls

**Request (Multipart/FormData):**
```
Content-Type: multipart/form-data

recording: [WAV file]
callId: "call_123"
duration: 300
localUid: 12345
remoteUids: [67890, 11111]
channelName: "agricultural-support"
```

**Response:**
```json
{
  "recordingId": "rec_abc123def456",
  "uri": "/storage/recordings/rec_abc123def456.wav",
  "duration": 300,
  "size": 4800000,
  "transcriptionStatus": "queued"
}
```

**Implementation:**

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure upload storage
const upload = multer({
  dest: 'uploads/recordings/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/wav') {
      cb(null, true);
    } else {
      cb(new Error('Only WAV files are accepted'));
    }
  }
});

router.post('/upload-recording', authMiddleware, upload.single('recording'), async (req, res) => {
  const { callId, duration, localUid, remoteUids, channelName } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No recording file provided' });
  }

  try {
    // Generate recording ID
    const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Move file to permanent location
    const permanentPath = path.join('storage/recordings', `${recordingId}.wav`);
    await fs.rename(req.file.path, permanentPath);

    // Save metadata to database
    const recording = await db.Recording.create({
      id: recordingId,
      callId,
      fileSize: req.file.size,
      duration: parseInt(duration),
      localUid: parseInt(localUid),
      remoteUids: JSON.parse(remoteUids),
      channelName,
      uploadedBy: req.userId,
      uploadedAt: new Date(),
      path: permanentPath,
      status: 'ready',
    });

    // Queue for transcription
    queueTranscription(recordingId);

    res.status(201).json({
      recordingId,
      uri: `/api/recordings/${recordingId}/download`,
      duration: recording.duration,
      size: req.file.size,
      transcriptionStatus: 'queued',
    });

  } catch (error) {
    console.error('Recording upload error:', error);
    // Clean up uploaded file
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Failed to upload recording' });
  }
});
```

### 3. Log Call Metrics

**Endpoint:** `POST /api/calls/metrics`

**Purpose:** Track call quality and performance metrics

**Request Body:**
```json
{
  "channelName": "agricultural-support",
  "uid": 12345,
  "duration": 300,
  "bytesReceived": 1000000,
  "bytesSent": 950000,
  "audioQuality": "good",
  "recordingPath": "/recordings/rec_123.wav"
}
```

**Implementation:**

```javascript
router.post('/metrics', authMiddleware, async (req, res) => {
  const { channelName, uid, duration, bytesReceived, bytesSent, audioQuality, recordingPath } = req.body;

  try {
    // Save metrics to analytics database
    const metrics = await db.CallMetric.create({
      userId: req.userId,
      channelName,
      remoteUid: uid,
      duration: parseInt(duration),
      bytesReceived: parseInt(bytesReceived),
      bytesSent: parseInt(bytesSent),
      audioQuality,
      recordingPath,
      timestamp: new Date(),
    });

    // Calculate bandwidth
    const totalBytes = bytesReceived + bytesSent;
    const bandwidth = (totalBytes * 8) / duration / 1000; // kbps

    res.json({
      metricsId: metrics.id,
      bandwidth: bandwidth.toFixed(2),
      quality: audioQuality,
    });

  } catch (error) {
    console.error('Metrics logging error:', error);
    res.status(500).json({ error: 'Failed to log metrics' });
  }
});
```

### 4. Get Call History

**Endpoint:** `GET /api/calls/history?limit=20&offset=0`

**Purpose:** Retrieve user's call history

**Response:**
```json
{
  "calls": [
    {
      "id": "call_123",
      "channel": "agricultural-support",
      "participants": [12345, 67890],
      "duration": 300,
      "startTime": "2024-01-15T10:30:00Z",
      "endTime": "2024-01-15T10:35:00Z",
      "recordingId": "rec_abc123"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

**Implementation:**

```javascript
router.get('/history', authMiddleware, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const numLimit = Math.min(parseInt(limit), 100); // Max 100
  const numOffset = parseInt(offset);

  try {
    const calls = await db.Call.findAll({
      where: { userId: req.userId },
      order: [['startTime', 'DESC']],
      limit: numLimit,
      offset: numOffset,
      include: ['Recording'],
    });

    const total = await db.Call.count({
      where: { userId: req.userId }
    });

    res.json({
      calls: calls.map(call => ({
        id: call.id,
        channel: call.channelName,
        participants: call.remoteUids,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        recordingId: call.recordingId,
      })),
      total,
      limit: numLimit,
      offset: numOffset,
    });

  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});
```

## Database Schema

### Recordings Table

```sql
CREATE TABLE recordings (
  id VARCHAR(50) PRIMARY KEY,
  callId VARCHAR(50),
  fileSize BIGINT,
  duration INT,
  localUid INT,
  remoteUids JSON,
  channelName VARCHAR(255),
  uploadedBy INT,
  uploadedAt TIMESTAMP,
  path VARCHAR(500),
  status VARCHAR(20), -- 'ready', 'processing', 'transcribed'
  transcription TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (callId) REFERENCES calls(id)
);
```

### Call Metrics Table

```sql
CREATE TABLE call_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT,
  channelName VARCHAR(255),
  remoteUid INT,
  duration INT,
  bytesReceived BIGINT,
  bytesSent BIGINT,
  audioQuality VARCHAR(20), -- 'poor', 'fair', 'good', 'excellent'
  recordingPath VARCHAR(500),
  timestamp TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Calls Table

```sql
CREATE TABLE calls (
  id VARCHAR(50) PRIMARY KEY,
  userId INT,
  channelName VARCHAR(255),
  remoteUids JSON,
  duration INT,
  startTime TIMESTAMP,
  endTime TIMESTAMP,
  recordingId VARCHAR(50),
  status VARCHAR(20), -- 'active', 'completed', 'failed'
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (recordingId) REFERENCES recordings(id)
);
```

## Security Considerations

### 1. Token Generation Security

```javascript
// Rate limiting on token generation
const rateLimit = require('express-rate-limit');

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many token requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/generate-token', tokenLimiter, authMiddleware, (req, res) => {
  // ... implementation
});
```

### 2. File Upload Security

```javascript
// Validate file size and type
const validateRecording = (req, res, next) => {
  if (req.file.size > 500 * 1024 * 1024) {
    return res.status(413).json({ error: 'File too large' });
  }
  if (req.file.mimetype !== 'audio/wav') {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  next();
};

// Scan for malware (integrate with VirusTotal or similar)
const scanFile = async (filePath) => {
  // Implementation
};
```

### 3. Recording Privacy

- Encrypt recordings at rest
- Implement access control (who can download)
- Set retention policies (delete after X days)
- Audit access logs

## Transcription Integration

### Queue Transcription

```javascript
const amqp = require('amqplib');

async function queueTranscription(recordingId) {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'transcription_jobs';

    await channel.assertQueue(queue);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({
      recordingId,
      timestamp: Date.now(),
    })));

    await connection.close();
  } catch (error) {
    console.error('Queue transcription error:', error);
  }
}
```

### Transcription Worker

```javascript
// workers/transcription-worker.js
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

async function transcribeRecording(recordingPath) {
  const request = {
    audio: {
      content: fs.readFileSync(recordingPath),
    },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
    },
  };

  const [operation] = await client.longRunningRecognize(request);
  const [response] = await operation.promise();
  return response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
}
```

## Monitoring and Alerts

```javascript
// Monitor token generation failures
setInterval(async () => {
  const failureRate = await db.query(`
    SELECT COUNT(*) as total,
           COUNTIF(success = false) as failures
    FROM token_log
    WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
  `);

  if (failureRate.failures / failureRate.total > 0.05) {
    // Alert if >5% failure rate
    sendAlert('High token generation failure rate');
  }
}, 60000); // Check every minute
```

## Testing

```bash
# Test token generation
curl -X POST http://localhost:8000/api/agora/generate-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "channelName": "test-channel",
    "uid": 1,
    "role": "host"
  }'

# Test metrics logging
curl -X POST http://localhost:8000/api/calls/metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "channelName": "test-channel",
    "uid": 1,
    "duration": 300,
    "bytesReceived": 1000000,
    "bytesSent": 950000,
    "audioQuality": "good"
  }'
```

## Deployment Checklist

- [ ] Agora credentials stored in environment variables
- [ ] HTTPS enabled for all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Authentication middleware on all endpoints
- [ ] File upload disk quota enforced
- [ ] Backups configured for recording storage
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Security audit passed
