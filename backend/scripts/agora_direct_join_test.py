"""
Agora Direct Join Test Script
Purpose: Test generated token directly using Agora SDK logic to confirm
         whether Agora infrastructure accepts the token.

This script loads credentials using the same backend settings loader and
generates a diagnostic token that can be used in the Agora Console Web Tester.
"""

import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from cultivator.core.config import get_settings
from cultivator.services.agora import generate_agora_token


def main():
    """Load credentials and generate diagnostic token."""
    try:
        # Load settings
        settings = get_settings()
        
        # Test parameters
        channel = "diagnostic_direct_join"
        uid = 1001
        
        # Generate token using backend settings
        token = generate_agora_token(
            channel_name=channel,
            uid=uid,
            expire_seconds=3600
        )
        
        # Extract AppID from settings
        app_id = settings.agora_app_id
        
        print("\n" + "="*70)
        print("AGORA DIRECT JOIN TEST - TOKEN GENERATION")
        print("="*70)
        
        print("\n[CREDENTIALS LOADED]")
        print(f"AppID Length:          {len(app_id)} chars")
        print(f"AppID (first 16):      {app_id[:16]}...")
        
        print("\n[DIAGNOSTIC TEST PARAMETERS]")
        print(f"Channel:               {channel}")
        print(f"UID:                   {uid}")
        
        print("\n[TOKEN GENERATED]")
        print(f"Token Length:          {len(token)} chars")
        print(f"Token Prefix:          {token[:20]}...")
        print(f"Token Suffix:          ...{token[-20:]}")
        
        # Parse token structure (standard Agora format)
        # Token format: 006<appid>IA<hmac_content>
        if token.startswith("006"):
            print(f"Token Format:          Valid (starts with 006)")
            print(f"Token Expiration:      3600 seconds")
        else:
            print(f"Token Format:          ERROR - does not start with 006")
        
        print("\n" + "="*70)
        print("COPY-PASTE CREDENTIALS FOR AGORA WEB TESTER")
        print("="*70)
        
        print(f"\nAppID:\n{app_id}\n")
        print(f"Channel:\n{channel}\n")
        print(f"UID:\n{uid}\n")
        print(f"Token:\n{token}\n")
        
        print("="*70)
        print("NEXT STEP: Visit https://webdemo.agora.io/basicVideoCall/index.html")
        print("           Enter the above credentials and click 'Join'")
        print("="*70 + "\n")
        
        return 0
        
    except Exception as e:
        print(f"\n[ERROR] Failed to generate diagnostic token: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
