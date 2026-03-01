"""Test Agora configuration and token generation."""
import sys
sys.path.insert(0, ".")

from app.core.config import get_settings
from app.services.agora import generate_agora_token, get_agora_app_id, RtcTokenRole

settings = get_settings()
print(f"App ID: {settings.agora_app_id[:10]}..." if settings.agora_app_id else "App ID: MISSING!")
print(f"Certificate: {settings.agora_app_certificate[:10]}..." if settings.agora_app_certificate else "Certificate: MISSING!")

# Test token generation
try:
    token = generate_agora_token("test_channel", 1234, RtcTokenRole.PUBLISHER, 3600)
    if token:
        print(f"Token generated: {token[:50]}...")
    else:
        print("Token generation returned None!")
except Exception as e:
    print(f"Token generation FAILED: {e}")

app_id = get_agora_app_id()
print(f"App ID from getter: {app_id[:10]}..." if app_id else "App ID getter: MISSING!")
