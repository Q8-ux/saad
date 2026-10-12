"""The Last Line Path — reusable, offline dialogue ending reviewer."""
from dataclasses import dataclass, asdict
import re

@dataclass
class Review:
    score: int
    criteria: dict
    warnings: list
    suggestions: list

def review_dialogue(dialogue: str, theme: str = "", opening: str = "") -> dict:
    """Heuristic editorial review; does not invent AI-generated lines."""
    lines = [x.strip() for x in dialogue.splitlines() if x.strip()]
    if not lines:
        raise ValueError("Dialogue is empty")
    last = re.sub(r"^[^:]{1,35}:\s*", "", lines[-1]).strip()
    words = re.findall(r"\w+", last, flags=re.UNICODE)
    length = len(words)
    theme_words = set(re.findall(r"\w{4,}", theme.lower()))
    last_words = set(re.findall(r"\w{4,}", last.lower()))
    opening_words = set(re.findall(r"\w{4,}", opening.lower()))
    criteria = {
        "brevity": 20 if 2 <= length <= 12 else 10 if length <= 20 else 0,
        "theme_echo": 25 if theme_words and theme_words & last_words else 0,
        "opening_callback": 20 if opening_words and opening_words & last_words else 0,
        "open_question": 10 if last.endswith(("?", "؟")) else 0,
        "pause_space": 10 if any(p in dialogue.lower() for p in ("(pause)", "(beat)", "صمت", "وقفة")) else 0,
    }
    warnings = []
    if length > 20: warnings.append("Final line may be too explanatory")
    if not theme.strip(): warnings.append("Theme not provided; thematic score is provisional")
    if not opening.strip(): warnings.append("Opening not provided; callback score is provisional")
    suggestions = [
        "Test a quieter, shorter version of the final line.",
        "Consider an echo of an earlier image or phrase.",
        "Verify that the ending changes the scene's emotional direction.",
        "Keep the author's voice; human review is required."
    ]
    return asdict(Review(sum(criteria.values()), criteria, warnings, suggestions))

if __name__ == "__main__":
    import json, sys
    print(json.dumps(review_dialogue(sys.stdin.read()), ensure_ascii=False, indent=2))

