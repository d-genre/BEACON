import os
import re
import uuid
import jwt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole, UserAccountStatus

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "beacon-secret-key")
COLLEGE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@saranathan\.ac\.in$"


# --- Schemas ---

class AddXPRequest(BaseModel):
    amount: int
    reason: str

class AwardXPRequest(BaseModel):
    student_id: uuid.UUID
    amount: int
    reason: str

class UserRegisterRequest(BaseModel):
    user_id: uuid.UUID = Field(..., description="Supabase auth user UUID")
    name: str = Field(..., example="John Doe")
    email: EmailStr = Field(..., example="john123@saranathan.ac.in")
    department: str = Field(..., example="Computer Science & Engineering")
    role: Optional[UserRole] = UserRole.STUDENT

class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, example="John Doe")
    department: Optional[str] = Field(None, example="Computer Science & Engineering")
    role: Optional[UserRole] = Field(None, example="CLUB_ADMIN")

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


# --- Helpers ---

def validate_college_email(email: str) -> bool:
    """Enforce strict Saranathan College email domain guardrail (@saranathan.ac.in)."""
    if not email:
        return False
    email_clean = email.strip().lower()
    return email_clean.endswith("@saranathan.ac.in") or bool(re.match(COLLEGE_EMAIL_REGEX, email_clean))

# JWKS cache and helper
JWKS_CACHE = {}

def get_supabase_url() -> str:
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    if url:
        return url.strip()
    
    # Try local frontend/.env
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        frontend_env = os.path.join(base_dir, "frontend", ".env")
        if os.path.exists(frontend_env):
            with open(frontend_env, "r") as f:
                for line in f:
                    if "VITE_SUPABASE_URL=" in line:
                        return line.split("VITE_SUPABASE_URL=")[1].strip()
    except Exception:
        pass

    # Try local root .env
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        root_env = os.path.join(base_dir, ".env")
        if os.path.exists(root_env):
            with open(root_env, "r") as f:
                for line in f:
                    if "VITE_SUPABASE_URL=" in line:
                        return line.split("VITE_SUPABASE_URL=")[1].strip()
                    if "SUPABASE_URL=" in line:
                        return line.split("SUPABASE_URL=")[1].strip()
    except Exception:
        pass

    return "https://nkurzookkcupkimtkwfr.supabase.co"

def get_jwk_key(kid: str, supabase_url: str) -> Optional[dict]:
    global JWKS_CACHE
    if kid in JWKS_CACHE:
        return JWKS_CACHE[kid]
    
    import urllib.request
    import json
    try:
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        req = urllib.request.Request(jwks_url, headers={"User-Agent": "FastAPI-Backend"})
        with urllib.request.urlopen(req, timeout=5) as response:
            jwks = json.loads(response.read().decode())
            for key in jwks.get("keys", []):
                JWKS_CACHE[key["kid"]] = key
    except Exception as e:
        print("[JWKS ERROR] Failed to fetch JWKS:", e)
        
    return JWKS_CACHE.get(kid)

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
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
        
        if alg == "ES256":
            kid = unverified_header.get("kid")
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token header: missing key identifier (kid)"
                )
            
            supabase_url = get_supabase_url()
            key_data = get_jwk_key(kid, supabase_url)
            if not key_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Public key '{kid}' could not be retrieved from Supabase JWKS."
                )
            
            public_key = jwt.algorithms.ECAlgorithm.from_jwk(key_data)
            payload = jwt.decode(token, public_key, algorithms=["ES256"], options={"verify_aud": False})
        else:
            # Fallback to HS256 using local secret (which can be base64 encoded)
            import base64
            try:
                padded_secret = SUPABASE_JWT_SECRET
                if len(padded_secret) % 4 != 0:
                    padded_secret += "=" * (4 - len(padded_secret) % 4)
                secret_bytes = base64.b64decode(padded_secret)
                payload = jwt.decode(token, secret_bytes, algorithms=["HS256"], options={"verify_aud": False})
            except Exception:
                payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
            
        user_id = uuid.UUID(payload["sub"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Fallback to sync email matching if UUID differs due to user re-creation in Supabase Auth
        user_email = payload.get("email")
        if user_email:
            email_clean = user_email.strip().lower()
            user = db.query(User).filter(func.lower(User.email) == email_clean).first()
            if user:
                user.id = user_id
                db.commit()
                db.refresh(user)

    if not user:
        # Auto-provision user from Supabase JWT payload if not in database
        user_email = payload.get("email")
        if user_email:
            metadata = payload.get("user_metadata", {}) or {}
            name = metadata.get("name") or metadata.get("full_name") or user_email.split("@")[0].replace(".", " ").title()
            department = metadata.get("department") or "General"
            
            raw_role = metadata.get("role")
            role = UserRole.STUDENT
            if raw_role:
                try:
                    role = UserRole(raw_role)
                except ValueError:
                    pass

            user = User(
                id=user_id,
                student_code=f"BCN-{uuid.uuid4().hex[:6].upper()}",
                name=name.strip(),
                email=user_email.strip().lower(),
                password_hash=None,
                reset_code=None,
                department=department,
                role=role,
                account_status=UserAccountStatus.ACTIVE,
                report_count=0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in campus database. Please register your account."
            )

    if user.account_status == UserAccountStatus.BANNED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your account has been suspended."
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
    db: Session = Depends(get_db)
):
    if not validate_college_email(req.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format. Must follow pattern: [a-zA-Z0-9._%+-]+@saranathan.ac.in"
        )

    email_clean = req.email.strip().lower()
    user_id = req.user_id

    # Check database existence by email
    existing_by_email = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if existing_by_email:
        if existing_by_email.id != user_id:
            existing_by_email.id = user_id
            db.commit()
            db.refresh(existing_by_email)
        return existing_by_email

    new_user = User(
        id=user_id,
        student_code=f"BCN-{uuid.uuid4().hex[:6].upper()}",
        name=req.name.strip() if req.name else email_clean.split("@")[0].replace(".", " ").title(),
        email=email_clean,
        password_hash=None,
        reset_code=None,
        department=req.department,
        role=req.role or UserRole.STUDENT,
        account_status=UserAccountStatus.ACTIVE,
        report_count=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


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
    if req.role:
        current_user.role = req.role

    db.commit()
    db.refresh(current_user)
    return UserResponse.from_orm(current_user)


@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes the current user profile from the database and cascades deletion."""
    db.delete(current_user)
    db.commit()
    return {"message": "User profile and all associated data deleted successfully."}


@router.post("/xp", response_model=UserResponse)
def add_user_xp(
    req: AddXPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Saves earned XP to database."""
    current_user.current_xp += req.amount
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/tasks")
def get_user_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dynamic checks for user quests & tasks status."""
    from models import StudentTimetable, CongruenceProfile, ChatMessage, DMRequest
    
    # 1. Timetable uploaded
    timetable_count = db.query(StudentTimetable).filter(StudentTimetable.student_id == current_user.id).count()
    
    # 2. Congruence Profile completed
    congruence_exists = db.query(CongruenceProfile).filter(CongruenceProfile.user_id == current_user.id).first() is not None
    
    # 3. Chat messages sent
    chat_count = db.query(ChatMessage).filter(ChatMessage.sender_id == current_user.id).count()
    
    # 4. DM Handshakes accepted
    dm_count = db.query(DMRequest).filter(
        ((DMRequest.sender_id == current_user.id) | (DMRequest.receiver_id == current_user.id)),
        DMRequest.status == "ACCEPTED"
    ).count()
    
    return {
        "timetable_uploaded": timetable_count > 0,
        "congruence_profile_setup": congruence_exists,
        "chat_messages_count": chat_count,
        "dm_connections_count": dm_count
    }


@router.post("/award-xp")
def award_student_xp(
    req: AwardXPRequest,
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN, UserRole.CLUB_ADMIN])),
    db: Session = Depends(get_db)
):
    """Allows Faculty/Club Admins to award custom XP to students."""
    student = db.query(User).filter(User.id == req.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found."
        )
    student.current_xp += req.amount
    db.commit()
    db.refresh(student)
    return {"message": f"Successfully awarded {req.amount} XP to {student.name}."}


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN, UserRole.CLUB_ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all registered users (students/admins) to manage or award XP."""
    return db.query(User).all()
