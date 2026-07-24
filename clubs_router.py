import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Club, Event, User, UserRole
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/clubs", tags=["Clubs & Competitions"])

# --- Pydantic Schemas ---

class CompetitionResponse(BaseModel):
    id: str
    club_id: str
    title: str
    description: str
    event_date: datetime
    registration_link: Optional[str] = None

    class Config:
        from_attributes = True

class ClubResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None
    competitions: List[CompetitionResponse] = []

    class Config:
        from_attributes = True

class ClubCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None

class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None

class CompetitionCreate(BaseModel):
    title: str
    description: str
    event_date: datetime
    registration_link: Optional[str] = None

class CompetitionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    registration_link: Optional[str] = None

# --- Endpoints ---

@router.get("", response_model=List[ClubResponse])
def get_clubs(db: Session = Depends(get_db)):
    clubs = db.query(Club).all()
    result = []
    for c in clubs:
        # Filter nested upcoming competitions (event_date >= current time)
        upcoming_events = [
            e for e in c.events if e.event_date >= datetime.utcnow()
        ]
        # Sort by date ascending
        upcoming_events.sort(key=lambda x: x.event_date)
        
        comps = [
            CompetitionResponse(
                id=str(e.id),
                club_id=str(e.club_id),
                title=e.title,
                description=e.description,
                event_date=e.event_date,
                registration_link=e.registration_link
            )
            for e in upcoming_events
        ]
        
        result.append(
            ClubResponse(
                id=str(c.id),
                name=c.name,
                description=c.description,
                logo=c.logo,
                competitions=comps
            )
        )
    return result

@router.post("", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
def create_club(
    payload: ClubCreate,
    current_user: User = Depends(require_roles([UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    existing = db.query(Club).filter(Club.name == payload.name.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A club with this name already exists."
        )
    
    new_club = Club(
        name=payload.name.strip(),
        description=payload.description,
        logo=payload.logo
    )
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    return ClubResponse(
        id=str(new_club.id),
        name=new_club.name,
        description=new_club.description,
        logo=new_club.logo,
        competitions=[]
    )

@router.put("/{id}", response_model=ClubResponse)
def update_club(
    id: str,
    payload: ClubUpdate,
    current_user: User = Depends(require_roles([UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        club_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID")
        
    club = db.query(Club).filter(Club.id == club_uuid).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    if payload.name is not None:
        club.name = payload.name.strip()
    if payload.description is not None:
        club.description = payload.description
    if payload.logo is not None:
        club.logo = payload.logo
        
    db.commit()
    db.refresh(club)
    
    # Return sorted upcoming competitions
    upcoming_events = [e for e in club.events if e.event_date >= datetime.utcnow()]
    upcoming_events.sort(key=lambda x: x.event_date)
    
    return ClubResponse(
        id=str(club.id),
        name=club.name,
        description=club.description,
        logo=club.logo,
        competitions=[
            CompetitionResponse(
                id=str(e.id),
                club_id=str(e.club_id),
                title=e.title,
                description=e.description,
                event_date=e.event_date,
                registration_link=e.registration_link
            )
            for e in upcoming_events
        ]
    )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_club(
    id: str,
    current_user: User = Depends(require_roles([UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        club_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID")
        
    club = db.query(Club).filter(Club.id == club_uuid).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    db.delete(club)
    db.commit()
    return {"message": "Club and all nested competitions deleted successfully."}

@router.post("/{id}/competitions", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
def add_competition(
    id: str,
    payload: CompetitionCreate,
    current_user: User = Depends(require_roles([UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        club_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID")
        
    club = db.query(Club).filter(Club.id == club_uuid).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
        
    new_event = Event(
        club_id=club_uuid,
        title=payload.title.strip(),
        description=payload.description.strip(),
        event_date=payload.event_date,
        registration_link=payload.registration_link
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return CompetitionResponse(
        id=str(new_event.id),
        club_id=str(new_event.club_id),
        title=new_event.title,
        description=new_event.description,
        event_date=new_event.event_date,
        registration_link=new_event.registration_link
    )

@router.put("/{id}/competitions/{comp_id}", response_model=CompetitionResponse)
def update_competition(
    id: str,
    comp_id: str,
    payload: CompetitionUpdate,
    current_user: User = Depends(require_roles([UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        club_uuid = uuid.UUID(id)
        comp_uuid = uuid.UUID(comp_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club or competition ID")
        
    event = db.query(Event).filter(Event.id == comp_uuid, Event.club_id == club_uuid).first()
    if not event:
        raise HTTPException(status_code=404, detail="Competition not found for this club")
        
    if payload.title is not None:
        event.title = payload.title.strip()
    if payload.description is not None:
        event.description = payload.description.strip()
    if payload.event_date is not None:
        event.event_date = payload.event_date
    if payload.registration_link is not None:
        event.registration_link = payload.registration_link
        
    db.commit()
    db.refresh(event)
    return CompetitionResponse(
        id=str(event.id),
        club_id=str(event.club_id),
        title=event.title,
        description=event.description,
        event_date=event.event_date,
        registration_link=event.registration_link
    )


@router.delete("/{id}/competitions/{comp_id}", status_code=status.HTTP_200_OK)
def delete_competition(
    id: str,
    comp_id: str,
    current_user: User = Depends(require_roles([UserRole.CLUB_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    try:
        club_uuid = uuid.UUID(id)
        comp_uuid = uuid.UUID(comp_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club or competition ID")
        
    event = db.query(Event).filter(Event.id == comp_uuid, Event.club_id == club_uuid).first()
    if not event:
        raise HTTPException(status_code=404, detail="Competition not found for this club")
        
    db.delete(event)
    db.commit()
    return {"message": "Competition deleted successfully."}
