import base64
import json
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, Request, status


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: uuid.UUID
    username: str
    email: str | None
    display_name: str


def _decode_jwt_payload(token: str) -> dict:
    try:
        payload_segment = token.split(".")[1]
        padding = "=" * (-len(payload_segment) % 4)
        decoded = base64.urlsafe_b64decode(payload_segment + padding)
        return json.loads(decoded)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Keycloak invalide.",
        ) from exc


def _coerce_user_uuid(raw_value: str) -> uuid.UUID:
    candidate = (raw_value or "").strip()
    if not candidate:
        return uuid.uuid5(uuid.NAMESPACE_URL, "anonymous")

    try:
        return uuid.UUID(candidate)
    except ValueError:
        return uuid.uuid5(uuid.NAMESPACE_URL, candidate)


def get_optional_current_user(request: Request) -> AuthenticatedUser | None:
    authorization = request.headers.get("Authorization", "").strip()
    if not authorization:
        return None

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization Bearer attendue.",
        )

    token = authorization[7:].strip()
    payload = _decode_jwt_payload(token)

    preferred_username = str(payload.get("preferred_username") or "").strip()
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip() or None

    display_name = name or preferred_username or email or "Utilisateur"
    username = preferred_username or name or (email or "utilisateur")

    return AuthenticatedUser(
        user_id=_coerce_user_uuid(str(payload.get("sub") or username)),
        username=username,
        email=email,
        display_name=display_name,
    )


def get_current_user(request: Request) -> AuthenticatedUser:
    user = get_optional_current_user(request)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session Keycloak requise.",
        )
    return user
