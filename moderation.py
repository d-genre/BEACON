import os
import json
from typing import Tuple
from sqlalchemy.orm import Session
from better_profanity import profanity
from google import genai
from google.genai import types
from pydantic import BaseModel

from models import User, UserAccountStatus

PROFANITY_MUTE_THRESHOLD = 20  # 20 profane words/messages = MUTED
MUTE_BAN_THRESHOLD = 3        # 3 mutes = BANNED

# Load default profanity word list
profanity.load_censor_words()

class ToxicityCheck(BaseModel):
    is_toxic: bool

def is_toxic_with_gemini(text: str) -> bool:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("Warning: GEMINI_API_KEY is not set. Gemini toxicity check is bypassed.")
        return False
    
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"]
    
    for model_name in models_to_try:
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=(
                    "Analyze the following user chat message. Identify if it contains profanity, toxicity, hate speech, "
                    "harassment, slurs, threats of violence, or vulgar/inappropriate language. "
                    "Provide the result in structured JSON format matching the schema.\n\n"
                    f"Message: '{text}'"
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ToxicityCheck,
                    temperature=0.0,
                )
            )
            data = json.loads(response.text)
            return bool(data.get("is_toxic", False))
        except Exception as e:
            print(f"Gemini moderation check failed with model {model_name}: {e}")
            continue
    return False

def process_message_moderation(
    content: str, user: User, db: Session
) -> Tuple[bool, UserAccountStatus, bool]:
    """
    Scans message content for profanity and toxicity using better-profanity and Gemini 2.5 Flash.
    If blocked:
      - Increments user's profanity_count by 1
      - Handles escalation (MUTED / BANNED status updates)
      - Resets profanity_count if mute is triggered
      - Persists changes to the DB
    
    Returns:
      (is_blocked, current_status, status_changed)
    """
    # 1. Fast local check
    is_blocked = profanity.contains_profanity(content)
    
    # 2. Advanced AI check
    if not is_blocked:
        is_blocked = is_toxic_with_gemini(content)
        
    if is_blocked:
        initial_status = user.account_status
        user.profanity_count += 1
        
        status_changed = False
        
        # Escalation Check 1: profanity_count reaches 20 -> MUTED, increment mute_count, reset profanity_count
        if user.profanity_count >= PROFANITY_MUTE_THRESHOLD:
            user.mute_count += 1
            user.profanity_count = 0
            
            # Escalation Check 2: mute_count reaches 3 -> BANNED
            if user.mute_count >= MUTE_BAN_THRESHOLD:
                user.account_status = UserAccountStatus.BANNED
            else:
                user.account_status = UserAccountStatus.MUTED
                
            status_changed = True
            
        db.commit()
        db.refresh(user)
        
        return True, user.account_status, status_changed
        
    return False, user.account_status, False

