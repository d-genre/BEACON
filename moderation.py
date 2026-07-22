import re
from typing import Set, Tuple
from sqlalchemy.orm import Session

from models import RestrictedWord, User, UserAccountStatus

# Hardcoded core restricted words set for high-speed memory lookup
HARDCODED_RESTRICTED_WORDS: Set[str] = {
    "abuse", "harass", "hate", "racist", "scam",
    "slur", "spam", "threat", "violence", "vulgar"
}

PROFANITY_MUTE_THRESHOLD = 20  # 20 profane words = MUTED
MUTE_BAN_THRESHOLD = 3        # 3 mutes = BANNED


def get_all_restricted_words(db: Session) -> Set[str]:
    """Combines hardcoded restricted words with dynamic DB entries."""
    db_words = db.query(RestrictedWord.word).all()
    dynamic_set = {w[0].lower() for w in db_words}
    return HARDCODED_RESTRICTED_WORDS.union(dynamic_set)


def process_message_moderation(
    content: str, user: User, db: Session
) -> Tuple[str, int, UserAccountStatus, bool]:
    """
    Scans a message for restricted words, updates user profanity/mute counts,
    and applies tiered escalation logic.

    Returns:
        (censored_content, profane_word_count, updated_account_status, is_status_changed)
    """
    restricted_words = get_all_restricted_words(db)
    
    # Tokenize message content to check against restricted set
    words = re.findall(r'\b\w+\b', content.lower())
    profane_word_count = sum(1 for w in words if w in restricted_words)

    censored_content = content
    if profane_word_count > 0:
        # Censor restricted words with asterisks
        pattern = re.compile(
            r'\b(' + '|'.join(re.escape(w) for w in restricted_words) + r')\b',
            re.IGNORECASE
        )
        censored_content = pattern.sub("****", content)

        # Increment user profanity counter
        user.profanity_count += profane_word_count
        initial_status = user.account_status

        # Escalation Check 1: 20 profane words -> MUTE
        if user.profanity_count >= PROFANITY_MUTE_THRESHOLD:
            user.mute_count += 1
            user.profanity_count = 0  # Reset counter for next cycle

            # Escalation Check 2: 3 Mutes -> BAN
            if user.mute_count >= MUTE_BAN_THRESHOLD:
                user.account_status = UserAccountStatus.BANNED
            else:
                user.account_status = UserAccountStatus.MUTED

        db.commit()
        db.refresh(user)

        status_changed = (user.account_status != initial_status)
        return censored_content, profane_word_count, user.account_status, status_changed

    return content, 0, user.account_status, False
