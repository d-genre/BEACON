import os
import uuid
import math
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from google import genai

from database import get_db
from models import User, CongruenceProfile
from auth import get_current_user

router = APIRouter(prefix="/congruence", tags=["Congruence Skill Matching"])

# --- Schemas ---

class ProofOfSkillsSchema(BaseModel):
    github_url: Optional[str] = Field(None, example="https://github.com/johndoe")
    portfolio_url: Optional[str] = Field(None, example="https://johndoe.dev")
    certificate_links: Optional[str] = Field(None, example="https://coursera.org/verify/123")

class ProfileSubmitRequest(BaseModel):
    opt_in_status: bool = Field(True, example=True)
    skills: List[str] = Field(default_factory=list, example=["React", "Python", "FastAPI"])
    proof_of_skills: ProofOfSkillsSchema
    past_achievements_summary: Optional[str] = Field(None, example="Won 2nd place in Saranathan Hackathon 2025")

class ProfileResponse(BaseModel):
    id: Optional[uuid.UUID]
    user_id: uuid.UUID
    opt_in_status: bool
    skills: List[str]
    proof_of_skills: Dict[str, Any]
    past_achievements_summary: Optional[str]
    name: str
    email: str
    department: str
    role: str

    class Config:
        from_attributes = True

class MatchRequest(BaseModel):
    query: str = Field(..., example="React developer with Python backend experience")

class MatchResponseItem(BaseModel):
    profile: ProfileResponse
    match_percentage: float
    matching_skills: List[str]


# --- Helper Functions ---

def get_gemini_client() -> Optional[genai.Client]:
    """Resolves and loads the Gemini client using env variables."""
    # Find absolute path of .env relative to this file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(base_dir, ".env")
    
    if os.path.exists(env_path):
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_path, override=True)
        
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key:
        try:
            return genai.Client(api_key=api_key)
        except Exception as e:
            print("[CONGRUENCE AI] Client init error:", e)
    return None

def generate_embedding(text: str) -> List[float]:
    """Generates embedding vector for a given text using gemini-embedding-2."""
    client = get_gemini_client()
    if not client:
        print("[CONGRUENCE AI] Gemini client not available, returning zero vector.")
        return [0.0] * 3072
    try:
        response = client.models.embed_content(
            model="models/gemini-embedding-2",
            contents=text
        )
        if response.embeddings and len(response.embeddings) > 0:
            return response.embeddings[0].values
    except Exception as e:
        print("[CONGRUENCE AI] Embedding generation failed:", e)
    return [0.0] * 3072

def dot_product(v1: List[float], v2: List[float]) -> float:
    return sum(x * y for x, y in zip(v1, v2))

def magnitude(v: List[float]) -> float:
    return math.sqrt(sum(x * x for x in v))

def calculate_cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2:
        return 0.0
    mag1 = magnitude(v1)
    mag2 = magnitude(v2)
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
    # Guard against precision floating point issues
    val = dot_product(v1, v2) / (mag1 * mag2)
    return max(-1.0, min(1.0, val))


# --- Endpoints ---

@router.post("/profile", response_model=ProfileResponse)
def create_or_update_profile(
    req: ProfileSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates or updates the logged-in student's Congruence profile.
    Automatically generates a Gemini text embedding based on the profile details.
    """
    # 1. Check if profile already exists
    profile = db.query(CongruenceProfile).filter(CongruenceProfile.user_id == current_user.id).first()
    
    # 2. Build profile text representation to embed
    proof_text_parts = []
    if req.proof_of_skills.github_url:
        proof_text_parts.append(f"GitHub: {req.proof_of_skills.github_url}")
    if req.proof_of_skills.portfolio_url:
        proof_text_parts.append(f"Portfolio: {req.proof_of_skills.portfolio_url}")
    if req.proof_of_skills.certificate_links:
        proof_text_parts.append(f"Certificates: {req.proof_of_skills.certificate_links}")
    proof_text = " | ".join(proof_text_parts)

    profile_text = (
        f"Skills: {', '.join(req.skills)}\n"
        f"Achievements: {req.past_achievements_summary or ''}\n"
        f"Proof: {proof_text}"
    )

    # 3. Generate embedding
    embedding = generate_embedding(profile_text)

    proof_dict = {
        "github_url": req.proof_of_skills.github_url or "",
        "portfolio_url": req.proof_of_skills.portfolio_url or "",
        "certificate_links": req.proof_of_skills.certificate_links or ""
    }

    if profile:
        profile.opt_in_status = req.opt_in_status
        profile.skills = req.skills
        profile.proof_of_skills = proof_dict
        profile.past_achievements_summary = req.past_achievements_summary
        profile.embedding_vector = embedding
    else:
        profile = CongruenceProfile(
            id=uuid.uuid4(),
            user_id=current_user.id,
            opt_in_status=req.opt_in_status,
            skills=req.skills,
            proof_of_skills=proof_dict,
            past_achievements_summary=req.past_achievements_summary,
            embedding_vector=embedding
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        opt_in_status=profile.opt_in_status,
        skills=profile.skills,
        proof_of_skills=profile.proof_of_skills,
        past_achievements_summary=profile.past_achievements_summary,
        name=current_user.name,
        email=current_user.email,
        department=current_user.department,
        role=current_user.role.value
    )


@router.get("/profile/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the logged-in student's Congruence profile.
    If none exists, returns a pre-populated default object.
    """
    profile = db.query(CongruenceProfile).filter(CongruenceProfile.user_id == current_user.id).first()
    if not profile:
        return ProfileResponse(
            id=None,
            user_id=current_user.id,
            opt_in_status=True,
            skills=[],
            proof_of_skills={"github_url": "", "portfolio_url": "", "certificate_links": ""},
            past_achievements_summary="",
            name=current_user.name,
            email=current_user.email,
            department=current_user.department,
            role=current_user.role.value
        )

    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        opt_in_status=profile.opt_in_status,
        skills=profile.skills,
        proof_of_skills=profile.proof_of_skills,
        past_achievements_summary=profile.past_achievements_summary,
        name=profile.user.name,
        email=profile.user.email,
        department=profile.user.department,
        role=profile.user.role.value
    )


@router.post("/match", response_model=List[MatchResponseItem])
def match_candidates(
    req: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ranks opted-in Congruence profiles using cosine similarity against the search query embedding.
    Highlights matching skills and returns match scores.
    """
    query_text = req.query.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty."
        )

    # 1. Generate query embedding
    query_emb = generate_embedding(query_text)

    # 2. Fetch all opted-in profiles (regardless of account moderation status) excluding the searcher
    profiles = db.query(CongruenceProfile).filter(
        CongruenceProfile.opt_in_status == True,
        CongruenceProfile.user_id != current_user.id
    ).all()

    results = []
    query_words = set(query_text.lower().replace(",", " ").replace(";", " ").split())

    for p in profiles:
        # Calculate cosine similarity
        sim = calculate_cosine_similarity(query_emb, p.embedding_vector)
        # Convert similarity to standard percentage (0 to 100)
        match_pct = max(0.0, min(100.0, sim * 100.0))

        # Check matching skills (simple case-insensitive match)
        matching_skills = []
        for skill in p.skills:
            skill_clean = skill.strip().lower()
            if skill_clean in query_text.lower():
                matching_skills.append(skill)
            else:
                skill_words = set(skill_clean.split())
                if skill_words.intersection(query_words):
                    matching_skills.append(skill)

        # Build response item
        profile_res = ProfileResponse(
            id=p.id,
            user_id=p.user_id,
            opt_in_status=p.opt_in_status,
            skills=p.skills,
            proof_of_skills=p.proof_of_skills,
            past_achievements_summary=p.past_achievements_summary,
            name=p.user.name,
            email=p.user.email,
            department=p.user.department,
            role=p.user.role.value
        )
        
        results.append(MatchResponseItem(
            profile=profile_res,
            match_percentage=round(match_pct, 1),
            matching_skills=matching_skills
        ))

    # 3. Sort by match percentage descending
    results.sort(key=lambda x: x.match_percentage, reverse=True)

    return results
