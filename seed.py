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
    db = SessionLocal()
    try:
        # 1. Seed Faculty if table is empty
        if db.query(Faculty).count() == 0:
            faculty_members = [
                Faculty(
                    name="Dr. C. Krishnakumar",
                    designation="Head of Department & Professor",
                    department="Electrical & Electronics Engineering",
                    email="hod_eee@saranathan.ac.in",
                    office_location="Main Block - Room 102",
                    office_hours="10:00 AM - 12:00 PM",
                    status="Available"
                ),
                Faculty(
                    name="Dr. S. M. Girirajkumar",
                    designation="Head of Department & Professor",
                    department="Instrumentation & Control Engineering",
                    email="hod_ice@saranathan.ac.in",
                    office_location="ICE Block - Room 204",
                    office_hours="02:00 PM - 04:00 PM",
                    status="In Class"
                ),
                Faculty(
                    name="Dr. R. Sumathi",
                    designation="Associate Professor",
                    department="Computer Science & Engineering",
                    email="sumathi_cse@saranathan.ac.in",
                    office_location="IT Block - Floor 2, Room 210",
                    office_hours="11:00 AM - 01:00 PM",
                    status="Available"
                ),
                Faculty(
                    name="Prof. K. Rajkumar",
                    designation="Assistant Professor",
                    department="Information Technology",
                    email="rajkumar_it@saranathan.ac.in",
                    office_location="IT Block - Lab Annex 1",
                    office_hours="09:30 AM - 11:30 AM",
                    status="In Meeting"
                ),
                Faculty(
                    name="Dr. P. L. Rajarajeswari",
                    designation="Head of Department",
                    department="Artificial Intelligence & Data Science",
                    email="hod_aids@saranathan.ac.in",
                    office_location="Main Block - 3rd Floor",
                    office_hours="01:30 PM - 03:30 PM",
                    status="Available"
                ),
                Faculty(
                    name="Dr. M. Barathi",
                    designation="Professor & Dean",
                    department="Electronics & Communication Engineering",
                    email="barathi_ece@saranathan.ac.in",
                    office_location="ECE Annex - Room 301",
                    office_hours="10:30 AM - 12:30 PM",
                    status="Available"
                ),
            ]
            db.add_all(faculty_members)
            print("Seeded Faculty table with 6 members.")

        # 2. Seed Achievements if table is empty
        if db.query(Achievement).count() == 0:
            achievements = [
                Achievement(
                    title="Smart India Hackathon (SIH 2025) National Grand Champions",
                    category="Hackathons",
                    department="Artificial Intelligence & Data Science",
                    student_name="Divya & Team Apex",
                    description="Secured 1st Prize and ₹1,00,000 cash award at the Ministry of Education SIH Grand Finale for AI Crop Yield Vision System.",
                    date="March 2025",
                    badge_color="bg-amber-100 text-amber-800 border-amber-300"
                ),
                Achievement(
                    title="Anna University Gold Medal & Rank 1",
                    category="University Ranks",
                    department="Computer Science & Engineering",
                    student_name="Kavitha R (Class of 2024)",
                    description="Awarded State Gold Medal for securing University Rank 1 with 9.82 CGPA across all affiliated Anna University colleges.",
                    date="February 2025",
                    badge_color="bg-yellow-100 text-yellow-800 border-yellow-300"
                ),
                Achievement(
                    title="Indian Patent Granted for Solar IoT Irrigation Bot",
                    category="Research & Patents",
                    department="Electrical & Electronics Engineering",
                    student_name="Dr. S. Ramesh & Student Team",
                    description="Granted official patent (Grant No. 498210) for autonomous sensor-driven solar smart irrigation hardware system.",
                    date="January 2025",
                    badge_color="bg-emerald-100 text-emerald-800 border-emerald-300"
                ),
                Achievement(
                    title="IEEE International Conference Best Paper Award",
                    category="Research & Patents",
                    department="Information Technology",
                    student_name="Arun Kumar M",
                    description="Published and presented 'Multimodal Transformer Models in Early Diagnostic Radiology' at IEEE IC-AI 2024 in Singapore.",
                    date="December 2024",
                    badge_color="bg-indigo-100 text-indigo-800 border-indigo-300"
                ),
                Achievement(
                    title="Record 45 LPA Google Software Engineer Offer",
                    category="Placements",
                    department="Computer Science & Engineering",
                    student_name="Sanjay V",
                    description="Cracked Google India Software Development Engineer campus recruitment with a highest package of ₹45,00,000/annum.",
                    date="November 2024",
                    badge_color="bg-rose-100 text-rose-800 border-rose-300"
                ),
                Achievement(
                    title="Southern Region Autonomous Robotics League Champions",
                    category="Hackathons",
                    department="Instrumentation & Control Engineering",
                    student_name="Team Robohack",
                    description="Designed a 3D-printed LiDAR mapping rover that completed the indoor obstacle course in record 1 minute 42 seconds.",
                    date="October 2024",
                    badge_color="bg-blue-100 text-blue-800 border-blue-300"
                ),
                Achievement(
                    title="State Level Inter-College Cricket & Sports Trophy",
                    category="Sports & Culturals",
                    department="Mechanical Engineering",
                    student_name="Beacon Sports Squad",
                    description="Defeated 32 engineering colleges to lift the Tamil Nadu Inter-Engineering Sports Championship Cup 2024.",
                    date="September 2024",
                    badge_color="bg-purple-100 text-purple-800 border-purple-300"
                ),
                Achievement(
                    title="NAAC A+ Accreditation & 98.4% Placement Benchmark",
                    category="Institution",
                    department="All Departments",
                    student_name="Saranathan College of Engineering",
                    description="Awarded Grade A+ by NAAC accreditation committee celebrating 98.4% placement rate with top tier recruiters.",
                    date="August 2024",
                    badge_color="bg-slate-100 text-slate-800 border-slate-300"
                ),
            ]
            db.add_all(achievements)
            print("Seeded Achievements table with 8 entries.")

        # 3. Seed Senior Mentors if table is empty
        if db.query(SeniorMentor).count() == 0:
            mentors = [
                SeniorMentor(
                    name="Aravind Kumar S",
                    year="4th Year",
                    department="Computer Science & Engineering",
                    skills=["Smart India Hackathon Winner", "Full-Stack Web Dev", "DSA in C++"],
                    bio="Guided 15+ freshers in SIH hackathons and competitive programming. Happy to help 1st years settle into CSE!",
                    rating=4.9,
                    mentees_count=18,
                    is_available=True,
                    contact_email="aravind4th@saranathan.ac.in"
                ),
                SeniorMentor(
                    name="Priya Dharshini R",
                    year="3rd Year",
                    department="Information Technology",
                    skills=["AI/ML Projects", "Python", "Placement Core Prep"],
                    bio="Web dev enthusiast and AI intern. Ready to guide juniors on balancing academics, mini-projects, and GPA.",
                    rating=4.8,
                    mentees_count=12,
                    is_available=True,
                    contact_email="priya3rd@saranathan.ac.in"
                ),
                SeniorMentor(
                    name="Venkatesh Prasad M",
                    year="4th Year",
                    department="Electronics & Communication Engineering",
                    skills=["Robotics League Lead", "Embedded Systems", "IoT"],
                    bio="Captain of Saranathan Robotics Club. Looking to mentor 1st and 2nd year students in hardware and Microcontrollers.",
                    rating=5.0,
                    mentees_count=22,
                    is_available=True,
                    contact_email="venkat4th@saranathan.ac.in"
                ),
                SeniorMentor(
                    name="Kavitha S",
                    year="2nd Year",
                    department="Artificial Intelligence & Data Science",
                    skills=["Data Structures", "Python Data Science", "Campus Life Tips"],
                    bio="Just cleared 1st year with a 9.2 GPA! Here to share notes, lab tips, and exam preparation strategies.",
                    rating=4.7,
                    mentees_count=8,
                    is_available=True,
                    contact_email="kavitha2nd@saranathan.ac.in"
                ),
                SeniorMentor(
                    name="Karthik N",
                    year="3rd Year",
                    department="Electrical & Electronics Engineering",
                    skills=["Circuit Design", "MATLAB", "GATE Exam Prep"],
                    bio="EEE student coordinator. Assisting juniors in understanding tough core electrical subjects and lab experiments.",
                    rating=4.9,
                    mentees_count=14,
                    is_available=False,
                    contact_email="karthik3rd@saranathan.ac.in"
                ),
            ]
            db.add_all(mentors)
            print("Seeded Senior Mentors table with 5 entries.")

        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

if __name__ == "__main__":
    seed_database()
