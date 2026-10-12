from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.utils.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

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

    # 2. Hash the raw password
    hashed_pwd = hash_password(user_in.password)

    # Auto-assign SUPPORT role if email starts with support.
    role = "SUPPORT" if user_in.email.lower().startswith("support.") else "EMPLOYEE"

    # 3. Create the database record
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pwd,
        role=role
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
    - form_data.password receives the raw password
    - Issues a signed JWT access token containing user id, email, and role
    """
    # 1. Find user by email (passed in form_data.username)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
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
def get_current_user_profile(current_user: User = Depends(get_current_user)): #here the get_current_user will execute and provide the value to the current_user and it will only execute or any other dependecey will only work when it will have values it will be automatically excuted 
    """
    Protected endpoint:
    Returns the profile of the currently logged-in user.
    Requires Bearer Token in Authorization header.
    """
    return current_user
