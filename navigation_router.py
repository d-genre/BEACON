from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel
from auth import get_current_user
from models import User

router = APIRouter(prefix="/navigation", tags=["Navigation"])

class LocationResponse(BaseModel):
    name: str
    category: str
    description: str
    latitude: Optional[float]
    longitude: Optional[float]

@router.get("/locations", response_model=List[LocationResponse])
def get_locations(current_user: User = Depends(get_current_user)):
    """Returns accurate campus locations for Saranathan College of Engineering."""
    return [
        {
            "name": "Main Block (Administrative)",
            "category": "Administration",
            "description": "Principal Office, Administrative Wing, Accounts Section & 1st Year Lecture Halls.",
            "latitude": 10.75706,
            "longitude": 78.65103
        },
        {
            "name": "IT & CSE Block (RV Block)",
            "category": "Department",
            "description": "Departments of IT, CSE & AI-DS, High-Performance Computer Labs & Server Infrastructure.",
            "latitude": 10.75745,
            "longitude": 78.65145
        },
        {
            "name": "Central Library & Digital Hub",
            "category": "Academic",
            "description": "2-Story Library with 50,000+ volumes, E-Journal Access & Quiet Study Zones.",
            "latitude": 10.75725,
            "longitude": 78.65080
        },
        {
            "name": "Mechanical & Civil Block",
            "category": "Department",
            "description": "Mechanical Workshops, CAD/CAM Center, Fluid Mechanics & Civil Structural Labs.",
            "latitude": 10.75665,
            "longitude": 78.65160
        },
        {
            "name": "ECE & EEE Block",
            "category": "Department",
            "description": "Electronics & Microcontroller Labs, Electrical Machines & Communication Systems Lab.",
            "latitude": 10.75650,
            "longitude": 78.65060
        },
        {
            "name": "Grand Auditorium",
            "category": "Events",
            "description": "1,500-seater Air-Conditioned Auditorium for Campus Symposiums, Cultural Fests & Graduation.",
            "latitude": 10.75760,
            "longitude": 78.65050
        },
        {
            "name": "Campus Food Court & Cafeteria",
            "category": "Amenities",
            "description": "Student Canteen, Beverage Counters, Freshers Lounge & Snack Hub.",
            "latitude": 10.75620,
            "longitude": 78.65120
        },
        {
            "name": "Sports Complex & Athletic Grounds",
            "category": "Sports",
            "description": "Football Field, Cricket Nets, Outdoor Basketball Courts & Athletic Track.",
            "latitude": 10.75800,
            "longitude": 78.65180
        }
    ]
