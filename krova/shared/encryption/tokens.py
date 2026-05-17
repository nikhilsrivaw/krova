"""
KROVA — Fernet Encryption for API Tokens
WhatsApp, Instagram, Gmail, and Outlook access tokens are stored encrypted in the DB.
If the database is ever compromised, tokens remain useless without the encryption key.
Uses symmetric Fernet encryption (AES-128-CBC + HMAC-SHA256).
"""

from cryptography.fernet import Fernet, InvalidToken

from shared.config.settings import settings
from shared.utils.errors import EncryptionError


def _get_fernet() -> Fernet:
    """
    Build Fernet from the encryption key in settings.
    Key must be a URL-safe base64-encoded 32-byte value.
    Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    """
    try:
        return Fernet(settings.encryption_key.encode())
    except Exception as exc:
        raise EncryptionError(
            "Invalid ENCRYPTION_KEY — must be a Fernet key (32 bytes, base64-encoded)",
            error=str(exc),
        ) from exc


def encrypt_token(plaintext: str) -> str:
    """
    Encrypt an API token for safe storage in the database.
    Returns a URL-safe base64-encoded ciphertext string.
    """
    try:
        fernet = _get_fernet()
        return fernet.encrypt(plaintext.encode()).decode()
    except EncryptionError:
        raise
    except Exception as exc:
        raise EncryptionError("Failed to encrypt token", error=str(exc)) from exc


def decrypt_token(ciphertext: str) -> str:
    """
    Decrypt an API token retrieved from the database.
    Raises EncryptionError if the ciphertext is invalid or the key has changed.
    """
    try:
        fernet = _get_fernet()
        return fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise EncryptionError(
            "Failed to decrypt token — key may have rotated or ciphertext is corrupt"
        ) from exc
    except EncryptionError:
        raise
    except Exception as exc:
        raise EncryptionError("Failed to decrypt token", error=str(exc)) from exc
