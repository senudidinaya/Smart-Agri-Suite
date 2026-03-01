"""
Agora RTC Service for voice calling and cloud recording.

Provides:
- RTC token generation for voice/video calls
- Cloud recording management (start, query, stop)
- Recording file retrieval
"""

import time
import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from enum import IntEnum

import aiohttp

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RtcTokenRole(IntEnum):
    """RTC Token roles for Agora."""
    PUBLISHER = 1  # Can publish audio/video
    SUBSCRIBER = 2  # Can only subscribe (receive)


class AgoraTokenBuilder:
    """
    Builds Agora RTC tokens for authentication.
    Based on Agora's token generation algorithm.
    """
    
    VERSION = "007"
    VERSION_LENGTH = 3
    APP_ID_LENGTH = 32
    
    @staticmethod
    def build_token_with_uid(
        app_id: str,
        app_certificate: str,
        channel_name: str,
        uid: int,
        role: RtcTokenRole,
        privilege_expired_ts: int
    ) -> str:
        """
        Build an RTC token for a user with UID.
        
        Args:
            app_id: Agora App ID
            app_certificate: Agora App Certificate
            channel_name: Channel name for the call
            uid: User ID (0 for dynamic assignment)
            role: Publisher or Subscriber role
            privilege_expired_ts: Token expiration timestamp (Unix seconds)
            
        Returns:
            RTC token string
        """
        try:
            from agora_token_builder import RtcTokenBuilder
            
            token = RtcTokenBuilder.buildTokenWithUid(
                app_id,
                app_certificate,
                channel_name,
                uid,
                role,
                privilege_expired_ts
            )
            return token
        except ImportError:
            # Fallback: generate a simple token for development
            logger.warning("agora-token-builder not installed, using development token")
            return AgoraTokenBuilder._build_dev_token(
                app_id, channel_name, uid, privilege_expired_ts
            )
    
    @staticmethod
    def _build_dev_token(
        app_id: str,
        channel_name: str,
        uid: int,
        expired_ts: int
    ) -> str:
        """Build a development token (NOT for production)."""
        payload = {
            "appId": app_id,
            "channel": channel_name,
            "uid": uid,
            "exp": expired_ts,
            "ts": int(time.time())
        }
        token_json = json.dumps(payload)
        return base64.urlsafe_b64encode(token_json.encode()).decode()


class AgoraCloudRecording:
    """
    Manages Agora Cloud Recording for call recordings.
    
    Cloud Recording captures audio streams from Agora channels
    and stores them in cloud storage (S3, GCS, Azure, etc.).
    """
    
    # Agora Cloud Recording API base URLs by region
    API_REGIONS = {
        "us": "https://api.agora.io",
        "eu": "https://api.eu.agora.io",
        "ap": "https://api.ap.agora.io",
        "cn": "https://api.cn.agora.io",
    }
    
    def __init__(self):
        settings = get_settings()
        self.app_id = settings.agora_app_id
        self.customer_id = settings.agora_customer_id
        self.customer_secret = settings.agora_customer_secret
        self.api_base = self.API_REGIONS.get("us")
        
        # Storage configuration
        self.storage_config = {
            "vendor": settings.agora_recording_vendor,
            "region": settings.agora_recording_region,
            "bucket": settings.agora_recording_bucket,
            "accessKey": settings.agora_recording_access_key,
            "secretKey": settings.agora_recording_secret_key,
        }
    
    def _get_auth_header(self) -> str:
        """Generate Basic Auth header for Agora RESTful API."""
        credentials = f"{self.customer_id}:{self.customer_secret}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests."""
        return {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json",
        }
    
    async def acquire_resource(
        self,
        channel_name: str,
        uid: int,
        resource_expire_hour: int = 24
    ) -> Optional[str]:
        """
        Acquire a resource ID for cloud recording.
        
        This must be called before starting a recording session.
        
        Args:
            channel_name: Channel to record
            uid: Recording bot UID
            resource_expire_hour: How long the resource ID is valid
            
        Returns:
            Resource ID string, or None on failure
        """
        url = f"{self.api_base}/v1/apps/{self.app_id}/cloud_recording/acquire"
        
        payload = {
            "cname": channel_name,
            "uid": str(uid),
            "clientRequest": {
                "resourceExpiredHour": resource_expire_hour,
                "scene": 0,  # 0 = real-time communication
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        resource_id = data.get("resourceId")
                        logger.info(f"Acquired recording resource: {resource_id[:20]}...")
                        return resource_id
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to acquire resource: {response.status} - {error_text}")
                        return None
        except Exception as e:
            logger.error(f"Error acquiring recording resource: {e}")
            return None
    
    async def start_recording(
        self,
        resource_id: str,
        channel_name: str,
        uid: int,
        token: str,
        recording_mode: str = "mix"
    ) -> Optional[Tuple[str, str]]:
        """
        Start cloud recording for a channel.
        
        Args:
            resource_id: Resource ID from acquire
            channel_name: Channel to record
            uid: Recording bot UID
            token: RTC token for the recording bot
            recording_mode: "mix" (combined) or "individual" (per-user)
            
        Returns:
            Tuple of (recording_id, sid) or None on failure
        """
        url = f"{self.api_base}/v1/apps/{self.app_id}/cloud_recording/resourceid/{resource_id}/mode/{recording_mode}/start"
        
        # Configure recording
        recording_config = {
            "maxIdleTime": 30,  # Stop recording after 30s of silence
            "streamTypes": 0,  # 0 = audio only, 1 = video only, 2 = both
            "channelType": 1,  # 0 = communication, 1 = live broadcast
            "subscribeAudioUids": ["#allstream#"],  # Record all audio
            "subscribeUidGroup": 0,
        }
        
        # Audio transcoding config for ML analysis
        transcoding_config = {
            "audio": {
                "sampleRate": "16000",  # 16kHz for speech analysis
                "bitrate": "48000",
                "channels": "1",  # Mono
            }
        }
        
        payload = {
            "cname": channel_name,
            "uid": str(uid),
            "clientRequest": {
                "token": token,
                "recordingConfig": recording_config,
                "recordingFileConfig": {
                    "avFileType": ["hls", "mp4"]  # Generate both HLS and MP4
                },
                "storageConfig": self.storage_config,
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        sid = data.get("sid")
                        logger.info(f"Started cloud recording: {sid}")
                        return (resource_id, sid)
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to start recording: {response.status} - {error_text}")
                        return None
        except Exception as e:
            logger.error(f"Error starting cloud recording: {e}")
            return None
    
    async def query_recording(
        self,
        resource_id: str,
        sid: str,
        recording_mode: str = "mix"
    ) -> Optional[Dict[str, Any]]:
        """
        Query the status of a cloud recording.
        
        Args:
            resource_id: Resource ID
            sid: Recording session ID
            recording_mode: "mix" or "individual"
            
        Returns:
            Recording status dict or None
        """
        url = f"{self.api_base}/v1/apps/{self.app_id}/cloud_recording/resourceid/{resource_id}/sid/{sid}/mode/{recording_mode}/query"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    headers=self._get_headers()
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("serverResponse", {})
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to query recording: {response.status} - {error_text}")
                        return None
        except Exception as e:
            logger.error(f"Error querying cloud recording: {e}")
            return None
    
    async def stop_recording(
        self,
        resource_id: str,
        sid: str,
        channel_name: str,
        uid: int,
        recording_mode: str = "mix"
    ) -> Optional[Dict[str, Any]]:
        """
        Stop a cloud recording session.
        
        Args:
            resource_id: Resource ID
            sid: Recording session ID
            channel_name: Channel name
            uid: Recording bot UID
            recording_mode: "mix" or "individual"
            
        Returns:
            Recording result with file info, or None
        """
        url = f"{self.api_base}/v1/apps/{self.app_id}/cloud_recording/resourceid/{resource_id}/sid/{sid}/mode/{recording_mode}/stop"
        
        payload = {
            "cname": channel_name,
            "uid": str(uid),
            "clientRequest": {}
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=self._get_headers(),
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        server_response = data.get("serverResponse", {})
                        logger.info(f"Stopped cloud recording: {sid}")
                        return server_response
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to stop recording: {response.status} - {error_text}")
                        return None
        except Exception as e:
            logger.error(f"Error stopping cloud recording: {e}")
            return None


def generate_agora_token(
    channel_name: str,
    uid: int,
    role: RtcTokenRole = RtcTokenRole.PUBLISHER,
    expire_seconds: int = 3600
) -> str:
    """
    Generate an Agora RTC token for a user.
    
    Args:
        channel_name: The channel/room name
        uid: User ID (use 0 for dynamic assignment)
        role: Publisher or Subscriber
        expire_seconds: Token validity duration
        
    Returns:
        RTC token string
    """
    settings = get_settings()
    
    if not settings.agora_app_id or not settings.agora_app_certificate:
        logger.warning("Agora credentials not configured, using development mode")
        # Return a dev token for testing
        return AgoraTokenBuilder._build_dev_token(
            settings.agora_app_id or "dev_app_id",
            channel_name,
            uid,
            int(time.time()) + expire_seconds
        )
    
    privilege_expired_ts = int(time.time()) + expire_seconds
    
    token = AgoraTokenBuilder.build_token_with_uid(
        settings.agora_app_id,
        settings.agora_app_certificate,
        channel_name,
        uid,
        role,
        privilege_expired_ts
    )
    
    return token


def get_agora_app_id() -> str:
    """Get the Agora App ID from settings."""
    settings = get_settings()
    return settings.agora_app_id or "dev_app_id"


# Singleton cloud recording manager
_cloud_recording: Optional[AgoraCloudRecording] = None


def get_cloud_recording() -> AgoraCloudRecording:
    """Get the cloud recording service instance."""
    global _cloud_recording
    if _cloud_recording is None:
        _cloud_recording = AgoraCloudRecording()
    return _cloud_recording
