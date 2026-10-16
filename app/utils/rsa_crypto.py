import os
import base64
from fastapi import HTTPException, status
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from app.config import settings

def _load_or_create_rsa_key():
    """
    Loads persistent RSA private key:
    1. From settings.RSA_PRIVATE_KEY_PEM if provided via environment variable.
    2. From disk file settings.RSA_PRIVATE_KEY_PATH (keys/rsa_private.pem).
    3. If neither exists, generates and writes a persistent key to disk so all workers
       and future server restarts share the exact same key.
    """
    # 1. Environment variable
    if settings.RSA_PRIVATE_KEY_PEM and settings.RSA_PRIVATE_KEY_PEM.strip():
        pem_data = settings.RSA_PRIVATE_KEY_PEM.strip().encode("utf-8")
        return serialization.load_pem_private_key(pem_data, password=None)

    # 2. File path on disk (relative to project root if relative)
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    key_path = settings.RSA_PRIVATE_KEY_PATH
    if not os.path.isabs(key_path):
        key_path = os.path.join(root_dir, key_path)

    if os.path.exists(key_path):
        with open(key_path, "rb") as f:
            return serialization.load_pem_private_key(f.read(), password=None)

    # 3. Generate once and save to disk
    os.makedirs(os.path.dirname(key_path), exist_ok=True)
    new_private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    pem_bytes = new_private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    with open(key_path, "wb") as f:
        f.write(pem_bytes)

    try:
        os.chmod(key_path, 0o600)
    except Exception:
        pass

    return new_private_key

_private_key = _load_or_create_rsa_key()
_public_key = _private_key.public_key()

def get_public_key_pem() -> str:
    """Returns the RSA public key in standard PEM (SubjectPublicKeyInfo) format."""
    pem_bytes = _public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem_bytes.decode("utf-8")

def decrypt_password(encrypted_text: str) -> str:
    """
    Decrypts an RSA-OAEP encrypted password prefixed with 'RSA:'.
    Fails closed:
    - If prefixed with 'RSA:' and decryption fails, raises HTTPException 400.
    - If not prefixed with 'RSA:' in production (with DEBUG=False), rejects plaintext transmission.
    - In non-production/debug environments (automated tests, Swagger /docs), permits plaintext.
    """
    if not encrypted_text or not isinstance(encrypted_text, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password credential is required."
        )

    if encrypted_text.startswith("RSA:"):
        try:
            raw_b64 = encrypted_text[4:]
            ciphertext = base64.b64decode(raw_b64)
            decrypted_bytes = _private_key.decrypt(
                ciphertext,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            return decrypted_bytes.decode("utf-8")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or undecryptable RSA credential payload."
            )

    # Fail closed for plaintext in strict production mode unless debugging is enabled
    is_prod = settings.APP_ENV.lower() in ("production", "prod")
    if is_prod and not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plaintext credential transmission is forbidden in production. Please use client-side RSA encryption."
        )

    # In development/testing, explicitly allow plaintext (for Swagger /docs and local scripts)
    return encrypted_text
