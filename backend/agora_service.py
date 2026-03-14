"""
Standalone Agora token endpoint for frontend token refresh.

Exposes:
- POST /api/agora/generate-token
"""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException

from auth_utils import require_auth
from cultivator.services.agora import generate_agora_token, get_agora_app_id, RtcTokenRole


router = APIRouter(prefix="/api/agora", tags=["agora"])


class AgoraTokenRequest(BaseModel):
    channelName: str = Field(..., min_length=1)
    uid: int = Field(..., ge=1)
    role: str = Field(default="publisher")


class AgoraTokenResponse(BaseModel):
    token: str
    appId: str
    uid: int
    channelName: str
    expiresIn: int


@router.post("/generate-token", response_model=AgoraTokenResponse)
async def generate_token(
    body: AgoraTokenRequest,
    user_id: str = Depends(require_auth),
) -> AgoraTokenResponse:
    """
    Generate an Agora RTC token for an existing channel and uid.

    This endpoint is used by the mobile frontend to refresh/obtain tokens
    before joining a call channel.
    """
    _ = user_id

    role = body.role.lower().strip()
    if role not in {"publisher", "subscriber"}:
        raise HTTPException(status_code=400, detail="role must be 'publisher' or 'subscriber'")

    mapped_role = RtcTokenRole.PUBLISHER if role == "publisher" else RtcTokenRole.SUBSCRIBER
    expires_in = 3600

    try:
        token = generate_agora_token(
            channel_name=body.channelName,
            uid=body.uid,
            role=mapped_role,
            expire_seconds=expires_in,
        )
        app_id = get_agora_app_id()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return AgoraTokenResponse(
        token=token,
        appId=app_id,
        uid=body.uid,
        channelName=body.channelName,
        expiresIn=expires_in,
    )
