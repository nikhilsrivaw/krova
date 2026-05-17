"""Fernet symmetric encryption for sensitive values stored in DB (API keys, tokens)."""

from cryptography.fernet import Fernet
from shared.config.settings import settings


def _fernet() -> Fernet:
    return Fernet(settings.encryption_key.encode())


def encrypt(plaintext: str) -> bytes:
    """Encrypt a plaintext string → encrypted bytes for DB storage."""
    return _fernet().encrypt(plaintext.encode())


def decrypt(ciphertext: bytes) -> str:
    """Decrypt stored bytes → original plaintext string."""
    return _fernet().decrypt(ciphertext).decode()
