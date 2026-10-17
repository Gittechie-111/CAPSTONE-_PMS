SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your primary school?",
    "In what town were you born?",
    "What was the make of your first phone?",
]


def normalize_answer(answer):
    """Case and spacing don't matter when answering."""
    return ' '.join((answer or '').lower().split())