"""Runtime verifier for Agora credentials and token generation.

This script uses the same settings loader as the backend to:
1. Read AGORA_APP_ID / AGORA_CERT.
2. Generate a diagnostic token.
3. Print credential and token diagnostics.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure backend root is importable when running this script directly.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from cultivator.core.config import get_settings
from cultivator.services.agora import RtcTokenRole, generate_agora_token


def _preview(value: str, prefix_len: int = 8) -> str:
    if not value:
        return "<empty>"
    return f"{value[:prefix_len]}..."


def main() -> None:
    settings = get_settings()
    app_id = settings.agora_app_id or ""
    cert = settings.agora_app_certificate or ""

    channel = "diagnostic_test_channel"
    uid = 1001

    token = generate_agora_token(
        channel_name=channel,
        uid=uid,
        role=RtcTokenRole.PUBLISHER,
        expire_seconds=3600,
    )

    print("[AGORA-CREDENTIAL-VERIFY] Runtime credential check")
    print(f"AppID: {app_id}")
    print(f"AppID length: {len(app_id)}")
    print(f"AppID preview: {_preview(app_id)}")
    print(f"Certificate length: {len(cert)}")
    print(f"Certificate preview: {_preview(cert)}")
    print(f"Channel: {channel}")
    print(f"UID: {uid}")
    print(f"Token prefix: {token[:20]}...")
    print(f"Token length: {len(token)}")


if __name__ == "__main__":
    main()
