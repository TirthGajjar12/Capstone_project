from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from app.config import settings

def hash_password(password: str) -> str:
    """Takes a plain-text password and returns its salted bcrypt hash."""
    # Convert string to bytes, generate salt and hash, then decode back to string for DB storage
    pwd_bytes = password.encode("utf-8")[:72]  # bcrypt standard maximum 72 bytes
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against the stored bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hash_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Encodes user identity into a signed JWT token with an expiration time."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
