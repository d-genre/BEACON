import os
import re
import uuid
import jwt
import random
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole, UserAccountStatus
from email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "beacon-secret-key")
COLLEGE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@saranathan\.ac\.in$"


# --- Schemas ---

class UserRegisterRequest(BaseModel):
    user_id: Optional[uuid.UUID] = Field(None, description="Supabase auth user UUID")
    name: str = Field(..., example="John Doe")
    email: EmailStr = Field(..., example="john123@saranathan.ac.in")
    password: Optional[str] = Field(None, example="password123")
    department: str = Field(..., example="Computer Science & Engineering")
    role: Optional[UserRole] = UserRole.STUDENT

class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, example="John Doe")
    department: Optional[str] = Field(None, example="Computer Science & Engineering")

class DirectLoginRequest(BaseModel):
    email: str = Field(..., example="student123@saranathan.ac.in")
    password: Optional[str] = Field(None, example="password123")
    role: Optional[UserRole] = Field(UserRole.STUDENT, example="FACULTY_ADMIN")
    name: Optional[str] = Field(None, example="Divya Sri")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="student123@saranathan.ac.in")

class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="student123@saranathan.ac.in")
    new_password: str = Field(..., example="newpass123")
    reset_code: Optional[str] = Field(None, example="123456")

class UserResponse(BaseModel):
    id: uuid.UUID
    student_code: str
    name: str
    email: str
    department: str
    role: UserRole
    current_xp: int
    account_status: UserAccountStatus
    report_count: int

    class Config:
        from_attributes = True

class DirectLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Helpers ---

def hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256((password.strip() + "beacon-salt-2025").encode('utf-8')).hexdigest()

def validate_college_email(email: str) -> bool:
    """Enforce strict Saranathan College email domain guardrail (@saranathan.ac.in)."""
    if not email:
        return False
    email_clean = email.strip().lower()
    return email_clean.endswith("@saranathan.ac.in") or bool(re.match(COLLEGE_EMAIL_REGEX, email_clean))

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header format. Expected 'Bearer <token>'"
        )
    
    token = authorization.split(" ")[1]
    try:
        try:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        except jwt.PyJWTError:
            payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        
        user_id = uuid.UUID(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user_email = payload.get("email")
        if user_email:
            email_clean = user_email.strip().lower()
            user = db.query(User).filter(func.lower(User.email) == email_clean).first()
            if user:
                user.id = user_id
                db.commit()
                db.refresh(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found in campus database. Please register your account."
        )

    return user


def require_roles(allowed_roles: List[UserRole]):
    """Role-based access control dependency."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Insufficient permissions for role '{current_user.role.value}'."
            )
        return current_user
    return role_checker


# --- Auth Routes ---

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    req: UserRegisterRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not validate_college_email(req.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format. Must follow pattern: [a-zA-Z0-9._%+-]+@saranathan.ac.in"
        )

    email_clean = req.email.strip().lower()
    user_id = req.user_id or uuid.uuid4()
    existing = db.query(User).filter((User.id == user_id) | (func.lower(User.email) == email_clean)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this college email address is already registered. Please sign in instead."
        )

    new_user = User(
        id=user_id,
        student_code=f"BCN-{uuid.uuid4().hex[:6].upper()}",
        name=req.name.strip() if req.name else email_clean.split("@")[0].replace(".", " ").title(),
        email=email_clean,
        password_hash=hash_password(req.password) if req.password else None,
        department=req.department,
        role=req.role or UserRole.STUDENT,
        account_status=UserAccountStatus.ACTIVE,
        report_count=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/direct_login", response_model=DirectLoginResponse)
def direct_login(req: DirectLoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    if not validate_college_email(email_clean):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only valid college emails matching pattern '@saranathan.ac.in' are authorized."
        )

    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. This email is not registered. Please sign up on the registration page first."
        )

    if user.account_status in (UserAccountStatus.BANNED, UserAccountStatus.SUSPENDED):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Your account status is '{user.account_status.value}'."
        )

    if not req.password or not req.password.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is required to log in."
        )

    hashed_input = hash_password(req.password)
    if user.password_hash:
        if user.password_hash != hashed_input:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid login credentials. Incorrect password entered."
            )
    else:
        # For legacy / seeded accounts without initial password hash, bind their password on first login
        user.password_hash = hashed_input
        db.commit()

    if req.name and req.name.strip() and user.name != req.name.strip():
        user.name = req.name.strip()
    db.commit()
    db.refresh(user)

    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value
    }
    access_token = jwt.encode(token_payload, SUPABASE_JWT_SECRET, algorithm="HS256")

    return DirectLoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )


@router.post("/forgot_password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Verifies account existence for password reset and dispatches 6-digit OTP verification email."""
    email_clean = req.email.strip().lower()
    if not validate_college_email(email_clean):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only valid Saranathan College emails (@saranathan.ac.in) are authorized."
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user matching this college email address."
        )

    reset_code = f"{random.randint(100000, 999999)}"
    user.reset_code = reset_code
    db.commit()

    # Dispatch OTP Verification Email via SMTP
    email_sent, status_reason = send_otp_email(recipient_email=email_clean, reset_code=reset_code, user_name=user.name)

    res_data = {
        "message": f"6-digit OTP verification code sent to {email_clean}! Please check your email inbox." if email_sent else f"OTP generated. (SMTP Notice: {status_reason})",
        "email_sent": email_sent,
        "detail": status_reason
    }
    # For local dev fallback when SMTP credentials are unconfigured:
    if not email_sent:
        res_data["reset_code"] = reset_code

    return res_data


@router.post("/reset_password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Direct Zero-Setup Password Reset endpoint."""
    email_clean = req.email.strip().lower()
    if not validate_college_email(email_clean):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only valid Saranathan College emails (@saranathan.ac.in) are authorized."
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user matching this college email address."
        )

    if user.reset_code and user.reset_code.strip():
        if req.reset_code and req.reset_code.strip() != user.reset_code.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 6-digit OTP code. Please enter the valid verification code."
            )

    if len(req.new_password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    user.password_hash = hash_password(req.new_password)
    user.reset_code = None
    db.commit()
    db.refresh(user)

    return {
        "message": "Password updated successfully! You can now sign in with your new password."
    }


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)


@router.put("/me", response_model=UserResponse)
def update_my_profile(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.name and req.name.strip():
        current_user.name = req.name.strip()
    if req.department:
        current_user.department = req.department

    db.commit()
    db.refresh(current_user)
    return UserResponse.from_orm(current_user)
