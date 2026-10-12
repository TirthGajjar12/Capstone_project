from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
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
    @field_validator("role", mode="before") #It tells Pydantic to run this validator before it performs its normal validation of the role field.
    @classmethod
    def determine_role(cls, value: Optional[str], info) -> str: #here info means getting info from the userBase class that we are inhriting from
        # Prevent self-registering as ADMIN
        email = info.data.get("email", "")
        username_part = email.split("@")[0].lower() if "@" in email else ""

        if username_part.startswith("support."):
            return "SUPPORT"
        return "EMPLOYEE"

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
