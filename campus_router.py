import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Faculty, Achievement, SeniorMentor, User, UserAccountStatus, UserRole
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/v1", tags=["Campus Data"])

# --- Pydantic Schemas ---

class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    office_location: Optional[str] = None
    office_hours: Optional[str] = None
    status: Optional[str] = None

class FacultyCreate(BaseModel):
    name: str
    department: str
    designation: str
    email: EmailStr
    office_location: str
    office_hours: Optional[str] = "10:00 AM - 12:00 PM"
    status: Optional[str] = "Available"

class FacultyResponse(BaseModel):
    id: str
    name: str
    designation: str
    department: str
    email: str
    cabin: str
    officeHours: str
    status: str

    class Config:
        from_attributes = True


class AchievementCreate(BaseModel):
    title: str
    category: str
    department: str
    studentName: str
    description: str
    date: str
    badgeColor: Optional[str] = "bg-amber-100 text-amber-800 border-amber-300"
    user_id: Optional[str] = None

class AchievementResponse(BaseModel):
    id: str
    title: str
    category: str
    department: str
    studentName: str
    description: str
    date: str
    badgeColor: str

    class Config:
        from_attributes = True


class AchievementUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    studentName: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    badgeColor: Optional[str] = None


class MentorCreate(BaseModel):
    name: str
    year: str
    department: str
    skills: List[str]
    bio: str
    rating: Optional[float] = 5.0
    contactEmail: EmailStr
    isAvailable: Optional[bool] = True
    user_id: Optional[str] = None

class MentorResponse(BaseModel):
    id: str
    name: str
    year: str
    department: str
    skills: List[str]
    bio: str
    rating: float
    menteesCount: int
    isAvailable: bool
    contactEmail: str

    class Config:
        from_attributes = True


# --- Helper Guard Functions ---

def check_user_not_banned(user_id: Optional[str], db: Session):
    """Verifies that the user is not banned before permitting write operations."""
    if not user_id:
        return
    try:
        user_uuid = uuid.UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()
        if user and user.account_status == UserAccountStatus.BANNED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is BANNED due to community standard violations. Write operations are disabled."
            )
    except ValueError:
        pass


# --- Faculty Endpoints ---

@router.get("/faculty", response_model=List[FacultyResponse])
def get_faculty_members(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Faculty)
    if department and department != "All Departments":
        query = query.filter(Faculty.department == department)
    
    faculty_list = query.all()
    return [
        FacultyResponse(
            id=str(f.id),
            name=f.name,
            designation=f.designation,
            department=f.department,
            email=f.email,
            cabin=f.office_location,
            officeHours=f.office_hours or "10:00 AM - 12:00 PM",
            status=f.status or "Available"
        )
        for f in faculty_list
    ]


@router.post("/faculty", response_model=FacultyResponse, status_code=status.HTTP_201_CREATED)
def create_faculty_member(
    payload: FacultyCreate,
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN])),
    db: Session = Depends(get_db)
):
    if payload.email.strip().lower() != current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only create a faculty card matching your own registered email."
        )

    existing = db.query(Faculty).filter(func.lower(Faculty.email) == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A faculty member with this email already exists."
        )

    new_faculty = Faculty(
        name=payload.name,
        department=payload.department,
        designation=payload.designation,
        email=payload.email.strip().lower(),
        office_location=payload.office_location,
        office_hours=payload.office_hours,
        status=payload.status
    )
    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)
    return FacultyResponse(
        id=str(new_faculty.id),
        name=new_faculty.name,
        designation=new_faculty.designation,
        department=new_faculty.department,
        email=new_faculty.email,
        cabin=new_faculty.office_location,
        officeHours=new_faculty.office_hours or "10:00 AM - 12:00 PM",
        status=new_faculty.status or "Available"
    )


@router.put("/faculty/{faculty_id}", response_model=FacultyResponse)
def update_faculty_member(
    faculty_id: str,
    payload: FacultyUpdate,
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        f_uuid = uuid.UUID(faculty_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid faculty ID")

    faculty = db.query(Faculty).filter(Faculty.id == f_uuid).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found")

    if faculty.email.strip().lower() != current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only edit your own faculty card."
        )

    if payload.name is not None:
        faculty.name = payload.name
    if payload.department is not None:
        faculty.department = payload.department
    if payload.designation is not None:
        faculty.designation = payload.designation
    if payload.office_location is not None:
        faculty.office_location = payload.office_location
    if payload.office_hours is not None:
        faculty.office_hours = payload.office_hours
    if payload.status is not None:
        faculty.status = payload.status

    db.commit()
    db.refresh(faculty)
    return FacultyResponse(
        id=str(faculty.id),
        name=faculty.name,
        designation=faculty.designation,
        department=faculty.department,
        email=faculty.email,
        cabin=faculty.office_location,
        officeHours=faculty.office_hours or "10:00 AM - 12:00 PM",
        status=faculty.status or "Available"
    )


@router.delete("/faculty/{faculty_id}", status_code=status.HTTP_200_OK)
def delete_faculty_member(
    faculty_id: str,
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        f_uuid = uuid.UUID(faculty_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid faculty ID")

    faculty = db.query(Faculty).filter(Faculty.id == f_uuid).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found")

    if faculty.email.strip().lower() != current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only delete your own faculty card."
        )

    db.delete(faculty)
    db.commit()
    return {"message": "Faculty member card deleted successfully."}



# --- Achievements Endpoints ---

@router.get("/achievements", response_model=List[AchievementResponse])
def get_achievements(
    category: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Achievement)
    if category and category != "All":
        query = query.filter(Achievement.category == category)
    if department and department != "All Departments":
        query = query.filter(Achievement.department == department)
    
    achievements = query.order_by(Achievement.created_at.desc()).all()
    return [
        AchievementResponse(
            id=str(a.id),
            title=a.title,
            category=a.category,
            department=a.department,
            studentName=a.student_name,
            description=a.description,
            date=a.date,
            badgeColor=a.badge_color
        )
        for a in achievements
    ]


@router.post("/achievements", response_model=AchievementResponse, status_code=status.HTTP_201_CREATED)
def create_achievement(
    payload: AchievementCreate,
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN, UserRole.CLUB_ADMIN])),
    db: Session = Depends(get_db)
):
    # Enforce BANNED account status check
    if current_user.account_status == UserAccountStatus.BANNED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is BANNED due to community standard violations. Write operations are disabled."
        )

    new_achievement = Achievement(
        title=payload.title,
        category=payload.category,
        department=payload.department,
        student_name=payload.studentName,
        description=payload.description,
        date=payload.date,
        badge_color=payload.badgeColor or "bg-amber-100 text-amber-800 border-amber-300"
    )
    db.add(new_achievement)
    db.commit()
    db.refresh(new_achievement)
    return AchievementResponse(
        id=str(new_achievement.id),
        title=new_achievement.title,
        category=new_achievement.category,
        department=new_achievement.department,
        studentName=new_achievement.student_name,
        description=new_achievement.description,
        date=new_achievement.date,
        badgeColor=new_achievement.badge_color
    )


@router.put("/achievements/{achievement_id}", response_model=AchievementResponse)
def update_achievement(
    achievement_id: str,
    payload: AchievementUpdate,
    current_user: User = Depends(require_roles([UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        a_uuid = uuid.UUID(achievement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid achievement ID")

    achievement = db.query(Achievement).filter(Achievement.id == a_uuid).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")

    if payload.title is not None:
        achievement.title = payload.title
    if payload.category is not None:
        achievement.category = payload.category
    if payload.department is not None:
        achievement.department = payload.department
    if payload.studentName is not None:
        achievement.student_name = payload.studentName
    if payload.description is not None:
        achievement.description = payload.description
    if payload.date is not None:
        achievement.date = payload.date
    if payload.badgeColor is not None:
        achievement.badge_color = payload.badgeColor

    db.commit()
    db.refresh(achievement)
    return AchievementResponse(
        id=str(achievement.id),
        title=achievement.title,
        category=achievement.category,
        department=achievement.department,
        studentName=achievement.student_name,
        description=achievement.description,
        date=achievement.date,
        badgeColor=achievement.badge_color
    )


@router.delete("/achievements/{achievement_id}", status_code=status.HTTP_200_OK)
def delete_achievement(
    achievement_id: str,
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN, UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        a_uuid = uuid.UUID(achievement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid achievement ID")

    achievement = db.query(Achievement).filter(Achievement.id == a_uuid).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")

    db.delete(achievement)
    db.commit()
    return {"message": "Achievement deleted successfully."}


# --- Senior Mentors Endpoints ---

@router.get("/mentors", response_model=List[MentorResponse])
def get_senior_mentors(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(SeniorMentor)
    if department and department != "All Departments":
        query = query.filter(SeniorMentor.department == department)

    mentors = query.all()
    return [
        MentorResponse(
            id=str(m.id),
            name=m.name,
            year=m.year,
            department=m.department,
            skills=m.skills or [],
            bio=m.bio,
            rating=m.rating,
            menteesCount=m.mentees_count,
            isAvailable=m.is_available,
            contactEmail=m.contact_email
        )
        for m in mentors
    ]


@router.post("/mentors", response_model=MentorResponse, status_code=status.HTTP_201_CREATED)
def register_senior_mentor(
    payload: MentorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce BANNED account status check
    if current_user.account_status == UserAccountStatus.BANNED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is BANNED due to community standard violations. Write operations are disabled."
        )

    # Regular students can only register/update their own mentor profile
    if current_user.role == UserRole.STUDENT and payload.contactEmail.strip().lower() != current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only register or update a mentor profile with your own college email."
        )

    # Check if a mentor profile already exists for this contact email
    existing_mentor = db.query(SeniorMentor).filter(
        func.lower(SeniorMentor.contact_email) == payload.contactEmail.strip().lower()
    ).first()

    if existing_mentor:
        existing_mentor.name = payload.name
        existing_mentor.year = payload.year
        existing_mentor.department = payload.department
        existing_mentor.skills = payload.skills
        existing_mentor.bio = payload.bio
        if payload.isAvailable is not None:
            existing_mentor.is_available = payload.isAvailable
        db.commit()
        db.refresh(existing_mentor)
        return MentorResponse(
            id=str(existing_mentor.id),
            name=existing_mentor.name,
            year=existing_mentor.year,
            department=existing_mentor.department,
            skills=existing_mentor.skills or [],
            bio=existing_mentor.bio,
            rating=existing_mentor.rating,
            menteesCount=existing_mentor.mentees_count,
            isAvailable=existing_mentor.is_available,
            contactEmail=existing_mentor.contact_email
        )

    new_mentor = SeniorMentor(
        name=payload.name,
        year=payload.year,
        department=payload.department,
        skills=payload.skills,
        bio=payload.bio,
        rating=payload.rating or 5.0,
        mentees_count=0,
        is_available=payload.isAvailable if payload.isAvailable is not None else True,
        contact_email=payload.contactEmail.strip().lower()
    )
    db.add(new_mentor)
    db.commit()
    db.refresh(new_mentor)
    return MentorResponse(
        id=str(new_mentor.id),
        name=new_mentor.name,
        year=new_mentor.year,
        department=new_mentor.department,
        skills=new_mentor.skills or [],
        bio=new_mentor.bio,
        rating=new_mentor.rating,
        menteesCount=new_mentor.mentees_count,
        isAvailable=new_mentor.is_available,
        contactEmail=new_mentor.contact_email
    )


@router.patch("/mentors/{mentor_id}/toggle_availability", response_model=MentorResponse)
def toggle_mentor_availability(
    mentor_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.account_status == UserAccountStatus.BANNED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is BANNED due to community standard violations. Write operations are disabled."
        )

    try:
        m_uuid = uuid.UUID(mentor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mentor ID")

    mentor = db.query(SeniorMentor).filter(SeniorMentor.id == m_uuid).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Senior mentor not found")

    # Only FACULTY_ADMIN or the mentor themselves (matching email) can toggle availability
    is_owner = mentor.contact_email.strip().lower() == current_user.email.strip().lower()
    is_admin = current_user.role == UserRole.FACULTY_ADMIN

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only toggle availability for your own mentor profile."
        )

    mentor.is_available = not mentor.is_available
    db.commit()
    db.refresh(mentor)
    return MentorResponse(
        id=str(mentor.id),
        name=mentor.name,
        year=mentor.year,
        department=mentor.department,
        skills=mentor.skills or [],
        bio=mentor.bio,
        rating=mentor.rating,
        menteesCount=mentor.mentees_count,
        isAvailable=mentor.is_available,
        contactEmail=mentor.contact_email
    )


@router.delete("/mentors/{mentor_id}", status_code=status.HTTP_200_OK)
def delete_senior_mentor(
    mentor_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        m_uuid = uuid.UUID(mentor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mentor ID")

    mentor = db.query(SeniorMentor).filter(SeniorMentor.id == m_uuid).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Senior mentor not found")

    # Only FACULTY_ADMIN or the mentor themselves (matching email) can delete
    is_owner = mentor.contact_email.strip().lower() == current_user.email.strip().lower()
    is_admin = current_user.role == UserRole.FACULTY_ADMIN

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only delete your own mentor profile."
        )

    db.delete(mentor)
    db.commit()
    return {"message": "Senior mentor profile deleted successfully."}

