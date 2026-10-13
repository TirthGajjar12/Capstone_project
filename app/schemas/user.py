from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, model_validator
from typing import Optional
from datetime import datetime

ALLOWED_DOMAIN = "company.com"

# 1. Base schema
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "EMPLOYEE"

    # Enforce company domain
    @field_validator("email")
    @classmethod
    def validate_company_email(cls, value: str) -> str:
        domain = value.split("@")[-1].lower()
        if domain != ALLOWED_DOMAIN:
            raise ValueError(f"Registration allowed only with company email domain (@{ALLOWED_DOMAIN})")
        return value

# 2. Signup Schema
class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value

    # Automatically derive the role based on email pattern
    # Uses model_validator so it always runs even when 'role' is not in the input
    @model_validator(mode="before")
    @classmethod
    def determine_role(cls, data: dict) -> dict:
        # Prevent self-registering as ADMIN
        email = data.get("email", "")
        username_part = email.split("@")[0].lower() if "@" in email else ""

        if username_part.startswith("support."):
            data["role"] = "SUPPORT"
        else:
            data["role"] = "EMPLOYEE"
        return data

# 3. Login Schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# 4. Safe User Response (no passwords!)
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True) #does not create the values or fetch them from the database. The values are already on the SQLAlchemy object. It simply enables Pydantic to read those values by attribute name and build its own validated response object.

# 5. Token Response Schema
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
