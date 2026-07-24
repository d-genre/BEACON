import uuid
from database import SessionLocal, engine, Base
from models import Faculty, Achievement, SeniorMentor

from sqlalchemy import text

# Ensure tables exist before seeding
Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
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

def seed_database():
    print("Database seeding is disabled.")


if __name__ == "__main__":
    seed_database()

if __name__ == "__main__":
    seed_database()
