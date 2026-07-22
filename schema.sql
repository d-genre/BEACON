-- Beacon Database Schema - Complete (Phases 1, 2, & 3)

-- Enums
CREATE TYPE user_account_status AS ENUM ('ACTIVE', 'MUTED', 'BANNED');
CREATE TYPE user_role AS ENUM ('STUDENT', 'CLUB_ADMIN', 'FACULTY_ADMIN');
CREATE TYPE dm_request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Users / Students Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- Matches Supabase Auth user UUID
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    current_xp INT NOT NULL DEFAULT 0,
    account_status user_account_status NOT NULL DEFAULT 'ACTIVE',
    report_count INT NOT NULL DEFAULT 0,
    profanity_count INT NOT NULL DEFAULT 0,
    mute_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_email_domain CHECK (email ~* '^[a-zA-Z]+[0-9]+@saranathan\.ac\.in$')
);

-- Clubs Table
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Club Memberships
CREATE TABLE IF NOT EXISTS club_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    role_in_club VARCHAR(100) NOT NULL DEFAULT 'Member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, club_id)
);

-- Faculty Table
CREATE TABLE IF NOT EXISTS faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    office_location VARCHAR(255) NOT NULL,
    office_hours VARCHAR(100) DEFAULT '10:00 AM - 12:00 PM',
    status VARCHAR(50) DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date VARCHAR(100) NOT NULL,
    badge_color VARCHAR(100) NOT NULL DEFAULT 'bg-amber-100 text-amber-800 border-amber-300',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Senior Mentors Table
CREATE TABLE IF NOT EXISTS senior_mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    year VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    bio TEXT NOT NULL,
    rating FLOAT NOT NULL DEFAULT 5.0,
    mentees_count INT NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Events / Competitions Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_link VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event Registrations Table
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, event_id)
);

-- Restricted Words Table (Dynamic Profanity Engine)
CREATE TABLE IF NOT EXISTS restricted_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(100) UNIQUE NOT NULL,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Department Chat Rooms Table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Department Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Direct Message Requests
CREATE TABLE IF NOT EXISTS dm_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status dm_request_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sender_receiver UNIQUE (sender_id, receiver_id)
);

-- Direct Messages Table
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- PHASE 3: AI INFRASTRUCTURE & MENTOR TABLES
-- ==========================================

-- Student Timetables (Parsed via Gemini Vision, retains version history)
CREATE TABLE IF NOT EXISTS student_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL, -- e.g., Monday, Tuesday
    time_slot VARCHAR(50) NOT NULL,    -- e.g., 09:00 AM - 10:00 AM
    subject_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campus Knowledge Base (Dynamic RAG context for AI Mentor)
CREATE TABLE IF NOT EXISTS campus_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL, -- e.g., 'DEPARTMENTS', 'CLUBS', 'SUPPORT', 'FAQS'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Chat Conversation History (Persistent sessions)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'model'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automatic Report Count Enforcement Trigger (Phase 1)
CREATE OR REPLACE FUNCTION enforce_user_ban_threshold()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_count >= 3 THEN
        NEW.account_status := 'BANNED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_user_ban
BEFORE INSERT OR UPDATE OF report_count ON users
FOR EACH ROW
EXECUTE FUNCTION enforce_user_ban_threshold();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department);
CREATE INDEX IF NOT EXISTS idx_timetables_student ON student_timetables(student_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_chat_student ON ai_chat_messages(student_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_campus_knowledge_cat ON campus_knowledge(category);

-- Seed Seeded Department Chat Rooms
INSERT INTO chat_rooms (department_name, description) VALUES
    ('Computer Science & Engineering', 'Official chat for CSE students'),
    ('Computer Science & Engineering (AI&ML)', 'Official chat for CSE (AI&ML) students'),
    ('Computer Science & Business Systems', 'Official chat for CSBS students'),
    ('Information Technology', 'Official chat for IT students'),
    ('Electronics & Communication Engineering', 'Official chat for ECE students'),
    ('Electrical & Electronics Engineering', 'Official chat for EEE students'),
    ('Instrumentation & Control Engineering', 'Official chat for ICE students'),
    ('Mechanical Engineering', 'Official chat for Mechanical Engineering students'),
    ('Civil Engineering', 'Official chat for Civil Engineering students'),
    ('Artificial Intelligence & Data Science', 'Official chat for AI&DS students')
ON CONFLICT (department_name) DO NOTHING;

-- Seed Campus Knowledge Base for Saranathan College of Engineering AI Mentor
INSERT INTO campus_knowledge (category, title, content) VALUES
    ('GENERAL', 'College Overview', 'Saranathan College of Engineering is located in Venkateswara Nagar, Panjappur, Tiruchirappalli, Tamil Nadu. Founded in 1998.'),
    ('DEPARTMENTS', 'CSE Department Profile', 'CSE Department is located in the Main Block 2nd Floor. HOD: Dr. SA Sahaaya Arul Mary. Labs: AI Lab, Data Structures Lab, Web Tech Lab.'),
    ('DEPARTMENTS', 'IT Department Profile', 'IT Department is located in the IT Block 1st Floor. Labs: Cloud Computing Lab, Software Engineering Lab.'),
    ('CLUBS', 'Tech & Cultural Clubs', 'Clubs include: Coding Club (Hackathons & Competitive Programming), Robotics Club, Fine Arts Club, Literary Club, and NSS/NCC.'),
    ('SUPPORT', 'Freshers Support Protocols', 'Freshers Helpdesk is located at the Administrative Block Room 102. Anti-ragging helpline: toll-free 1800-180-5522 or email support@saranathan.ac.in.'),
    ('FAQS', 'Library & Timings', 'Central Library operates from 8:30 AM to 6:30 PM on weekdays. Digital library access is available to all students using college Wi-Fi.')
ON CONFLICT DO NOTHING;
