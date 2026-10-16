from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.utils.security import hash_password, verify_password, create_access_token
from app.utils.rsa_crypto import get_public_key_pem, decrypt_password
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/public-key")
def get_public_key():
    """
    Returns the RSA public key in PEM format.
    Used by the frontend to encrypt passwords in the browser before sending over the network.
    """
    return {"public_key": get_public_key_pem()}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user:
    - Enforces @company.com email domain (via Pydantic schema)
    - Auto-assigns 'SUPPORT' if email starts with support., otherwise 'EMPLOYEE'
    - Hashes password before storing in PostgreSQL
    - Returns safe UserResponse (without password)
    """
    # 1. Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # 2. Decrypt if client-side encrypted, then hash
    raw_password = decrypt_password(user_in.password)
    hashed_pwd = hash_password(raw_password)

    # 3. Create the database record (role is already derived by UserCreate schema validator)
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pwd,
        role=user_in.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Authenticate a user:
    - form_data.username receives the user's email
    - form_data.password receives the raw or RSA-encrypted password
    - Issues a signed JWT access token containing user id, email, and role
    """
    # 1. Decrypt if client-side encrypted
    plain_password = decrypt_password(form_data.password)

    # 2. Find user by email (passed in form_data.username)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(plain_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Check if user account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact administrator."
        )

    # 3. Generate JWT Token with identity payload
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    }
    token = create_access_token(data=token_payload)

    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Protected endpoint:
    Returns the profile of the currently logged-in user.
    Requires Bearer Token in Authorization header.
    """
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """
    List active users for ticket assignments and asset allocation.
    Accessible only to Support Staff and Administrators.
    Supports on-demand search by name or email with pagination (skip/limit) and role filtering.
    """
    safe_limit = min(max(1, limit), 100)
    safe_skip = max(0, skip)

    query = db.query(User).filter(User.is_active == True)
    if role and role.strip():
        query = query.filter(User.role == role.strip().upper())
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    return query.offset(safe_skip).limit(safe_limit).all()


