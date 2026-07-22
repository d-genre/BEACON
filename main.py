from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from chat_router import router as chat_router
from dm_router import router as dm_router
from timetable_router import router as timetable_router
from ai_router import router as ai_router
from navigation_router import router as navigation_router
from campus_router import router as campus_router
from database import Base, engine
from sqlalchemy import text

# Create tables automatically (for dev / testing)
Base.metadata.create_all(bind=engine)

# Migration helper: ensure student_code column exists in SQLite table
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN student_code VARCHAR(20)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN reset_code VARCHAR(20)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE faculty ADD COLUMN office_hours VARCHAR(100) DEFAULT '10:00 AM - 12:00 PM'"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE faculty ADD COLUMN status VARCHAR(50) DEFAULT 'Available'"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title="Beacon - Centralized Campus API",
    description="Backend services for Beacon campus application (Auth, Moderation, Department Chat, DMs, Timetable AI Vision Parser, & AI Mentor).",
    version="3.0.0"
)

# Enable CORS for React frontend (allows all origins, localhost, 127.0.0.1, and ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(dm_router)
app.include_router(timetable_router)
app.include_router(ai_router)
app.include_router(navigation_router)
app.include_router(campus_router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "Beacon Centralized Campus API",
        "version": "3.0.0",
        "features": [
            "Supabase Auth & College Domain Guardrail",
            "Anti-Profanity Engine & Tiered Escalation",
            "Department WebSockets Chat Rooms",
            "DM Handshake Protocol & State Lock WebSockets",
            "Gemini 2.5 Flash Multimodal Timetable Vision Parser",
            "Floating AI Senior Mentor Chatbot (Dynamic RAG Context)"
        ]
    }
