import base64
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes

# Generate persistent 2048-bit RSA keypair on server module load
_private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048
)
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
    If the text is unencrypted (e.g., from Swagger /docs, seed scripts, or automated tests),
    it safely returns the text as-is for backward compatibility.
    """
    if not encrypted_text or not isinstance(encrypted_text, str) or not encrypted_text.startswith("RSA:"):
        return encrypted_text

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
        # If decryption fails for any unexpected reason, fallback to original string
        return encrypted_text
