import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ai_service import parse_timetable_with_gemini
from auth import get_current_user
from database import get_db
from models import StudentTimetable, User, UserAccountStatus

router = APIRouter(prefix="/timetable", tags=["Student Timetable Management"])


# --- Schemas ---

class TimetableSlotResponse(BaseModel):
    id: uuid.UUID
    day_of_week: str
    time_slot: str
    subject_name: str
    room_number: str
    is_active: bool
    uploaded_at: str

    class Config:
        from_attributes = True


class TimetableSlotRequest(BaseModel):
    id: Optional[uuid.UUID] = None
    day_of_week: str = Field(..., example="Monday")
    time_slot: str = Field(..., example="09:00 AM - 10:00 AM")
    subject_name: str = Field(..., example="Data Structures")
    room_number: str = Field(..., example="Main Block 204")


class TimetableUploadSummary(BaseModel):
    total_slots_parsed: int
    message: str
    schedule: List[TimetableSlotResponse]


# --- Endpoints ---

@router.post("/upload", response_model=TimetableUploadSummary, status_code=status.HTTP_201_CREATED)
async def upload_and_parse_timetable(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads an image or PDF timetable.
    Parses complex schedule via gemini vision model, archives older schedules,
    and bulk-inserts new structured records.
    """
    if current_user.account_status == UserAccountStatus.BANNED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS REVOKED: BANNED users cannot upload or update timetables."
        )

    content_type = file.content_type or "image/jpeg"
    filename = (file.filename or "").lower()
    is_valid = (
        content_type.startswith("image/") or 
        content_type == "application/pdf" or 
        any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff", ".heic", ".heif", ".svg", ".pdf", ".doc", ".docx"])
    )
    if not is_valid:
        content_type = "image/jpeg"

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        parsed_slots = parse_timetable_with_gemini(file_bytes, content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Vision Parser Error: {str(e)}"
        )

    if not parsed_slots:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract schedule slots from document. Please ensure text is clear."
        )

    # Check if this is the first upload to reward +50 XP
    existing_timetable_count = db.query(StudentTimetable).filter(
        StudentTimetable.student_id == current_user.id
    ).count()
    if existing_timetable_count == 0:
        current_user.current_xp += 50

    # Archive existing active timetables for this user
    db.query(StudentTimetable).filter(
        StudentTimetable.student_id == current_user.id,
        StudentTimetable.is_active == True
    ).update({"is_active": False}, synchronize_session=False)

    new_db_slots: List[StudentTimetable] = []
    for slot in parsed_slots:
        db_slot = StudentTimetable(
            student_id=current_user.id,
            day_of_week=slot.get("day_of_week", "Monday"),
            time_slot=slot.get("time_slot", "09:00 AM - 10:00 AM"),
            subject_name=slot.get("subject_name", "Unspecified Subject"),
            room_number=slot.get("room_number", "Room 101"),
            is_active=True
        )
        db.add(db_slot)
        new_db_slots.append(db_slot)

    db.commit()

    for db_slot in new_db_slots:
        db.refresh(db_slot)

    formatted_schedule = [
        TimetableSlotResponse(
            id=s.id,
            day_of_week=s.day_of_week,
            time_slot=s.time_slot,
            subject_name=s.subject_name,
            room_number=s.room_number,
            is_active=s.is_active,
            uploaded_at=s.uploaded_at.isoformat()
        )
        for s in new_db_slots
    ]

    return TimetableUploadSummary(
        total_slots_parsed=len(formatted_schedule),
        message="Timetable successfully parsed and saved to profile. You can edit any class slot below!",
        schedule=formatted_schedule
    )


@router.get("/my", response_model=List[TimetableSlotResponse])
def get_my_active_timetable(
    include_history: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves active timetable schedule for currently authenticated student."""
    query = db.query(StudentTimetable).filter(StudentTimetable.student_id == current_user.id)
    if not include_history:
        query = query.filter(StudentTimetable.is_active == True)

    slots = query.order_by(StudentTimetable.uploaded_at.desc(), StudentTimetable.day_of_week).all()

    return [
        TimetableSlotResponse(
            id=s.id,
            day_of_week=s.day_of_week,
            time_slot=s.time_slot,
            subject_name=s.subject_name,
            room_number=s.room_number,
            is_active=s.is_active,
            uploaded_at=s.uploaded_at.isoformat()
        )
        for s in slots
    ]


@router.post("/slot", response_model=TimetableSlotResponse)
def save_or_update_slot(
    req: TimetableSlotRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new class slot or edit an existing one."""
    if req.id:
        slot = db.query(StudentTimetable).filter(
            StudentTimetable.id == req.id,
            StudentTimetable.student_id == current_user.id
        ).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Slot not found.")
        slot.day_of_week = req.day_of_week
        slot.time_slot = req.time_slot
        slot.subject_name = req.subject_name
        slot.room_number = req.room_number
    else:
        slot = StudentTimetable(
            student_id=current_user.id,
            day_of_week=req.day_of_week,
            time_slot=req.time_slot,
            subject_name=req.subject_name,
            room_number=req.room_number,
            is_active=True
        )
        db.add(slot)

    db.commit()
    db.refresh(slot)
    return TimetableSlotResponse(
        id=slot.id,
        day_of_week=slot.day_of_week,
        time_slot=slot.time_slot,
        subject_name=slot.subject_name,
        room_number=slot.room_number,
        is_active=slot.is_active,
        uploaded_at=slot.uploaded_at.isoformat()
    )


@router.delete("/slot/{slot_id}")
def delete_slot(
    slot_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a class slot from active timetable."""
    slot = db.query(StudentTimetable).filter(
        StudentTimetable.id == slot_id,
        StudentTimetable.student_id == current_user.id
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    db.delete(slot)
    db.commit()
    return {"message": "Slot deleted successfully"}
