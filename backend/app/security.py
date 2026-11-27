import base64
import hashlib
import hmac
import secrets
from typing import Optional, Tuple
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

PBKDF2_PREFIX = "pbkdf2_sha256$"
PBKDF2_ITERATIONS = 260_000


def _get_admin_fernet() -> Fernet:
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt_password_for_admin(raw_password: str) -> str:
    """Encrypt a password reversibly for Admin-only on-demand reveal."""
    cleaned = (raw_password or "").strip()
    if not cleaned:
        raise ValueError("Password cannot be empty")
    return _get_admin_fernet().encrypt(cleaned.encode("utf-8")).decode("utf-8")


def decrypt_password_for_admin(encrypted_password: Optional[str]) -> Optional[str]:
    """Decrypt a stored admin-reveal password blob, returning None if absent or invalid."""
    if not encrypted_password or not encrypted_password.strip():
        return None
    try:
        return _get_admin_fernet().decrypt(encrypted_password.strip().encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        return None


def hash_password(raw_password: str) -> str:
    """Hash a plaintext password using PBKDF2-HMAC-SHA256 with a random 16-byte salt."""
    cleaned = (raw_password or "").strip()
    if not cleaned:
        raise ValueError("Password cannot be empty")
    if cleaned.startswith(PBKDF2_PREFIX):
        return cleaned
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", cleaned.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"{PBKDF2_PREFIX}{PBKDF2_ITERATIONS}${salt}${dk.hex()}"


def verify_password(plain_password: str, stored_password: Optional[str]) -> Tuple[bool, bool]:
    """
    Verify a login password against stored credentials.
    Returns (is_valid, needs_rehash). Rejects missing/blank stored passwords.
    """
    if not stored_password or not stored_password.strip():
        return False, False

    candidate = (plain_password or "").strip()
    if not candidate:
        return False, False

    stored = stored_password.strip()
    if stored.startswith(PBKDF2_PREFIX):
        parts = stored.split("$")
        if len(parts) != 4:
            return False, False
        _, iter_str, salt, expected_hex = parts
        try:
            iterations = int(iter_str)
        except ValueError:
            return False, False
        dk = hashlib.pbkdf2_hmac("sha256", candidate.encode("utf-8"), salt.encode("utf-8"), iterations)
        return hmac.compare_digest(dk.hex(), expected_hex), False

    # Legacy plaintext row support: verify constant-time and signal caller to upgrade hash
    return hmac.compare_digest(candidate, stored), True
