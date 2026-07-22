import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Faculty, Achievement, SeniorMentor, User, UserAccountStatus

router = APIRouter(prefix="/api/v1", tags=["Campus Data"])

# --- Pydantic Schemas ---

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
    db: Session = Depends(get_db)
):
    new_faculty = Faculty(
        name=payload.name,
        department=payload.department,
        designation=payload.designation,
        email=payload.email,
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
    db: Session = Depends(get_db)
):
    # Enforce BANNED account status check
    check_user_not_banned(payload.user_id, db)

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
    db: Session = Depends(get_db)
):
    # Enforce BANNED account status check
    check_user_not_banned(payload.user_id, db)

    # Check if a mentor profile already exists for this contact email
    existing_mentor = db.query(SeniorMentor).filter(
        func.lower(SeniorMentor.contact_email) == payload.contactEmail.lower()
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
        contact_email=payload.contactEmail
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
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    check_user_not_banned(user_id, db)

    try:
        m_uuid = uuid.UUID(mentor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mentor ID")

    mentor = db.query(SeniorMentor).filter(SeniorMentor.id == m_uuid).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Senior mentor not found")

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
