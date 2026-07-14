import json
import re
from dataclasses import dataclass
from pathlib import Path
from app.adapters.base import LLMClient
from app.sources.base import Article
from app.store.models import Preferences

_PROMPT = (Path(__file__).parent.parent / "prompts" / "scriptwriter.txt").read_text(encoding="utf-8")


# Delivery energies the narrator understands. Anything else from the model
# degrades to "warm" so a creative label can never break narration.
_ENERGIES = ("calm", "warm", "high")


@dataclass
class Segment:
    kind: str
    speaker: str
    text: str
    energy: str = "warm"


@dataclass
class ScriptResult:
    segments: list[Segment]
    tokens_in: int
    tokens_out: int
    title: str


def _user_message(articles: list[Article], prefs: Preferences) -> str:
    interests = json.loads(prefs.interests_json)
    items = [{"title": a.title, "summary": a.snippet} for a in articles]
    payload = {
        "preferences": {
            "interests": interests,
            "tone": prefs.tone,
            "target_minutes": prefs.target_minutes,
            "host_mode": prefs.host_mode,
        },
        "news_items": items,
    }
    return json.dumps(payload)


def _segments_from(text: str) -> list[dict]:
    # OpenAI's response_format={"type": "json_object"} forces a top-level object,
    # so the model returns {"segments": [...]}. Accept that and a bare [...] array
    # so the parser does not depend on which shape the provider hands back.
    data = json.loads(text)
    if isinstance(data, dict):
        data = data.get("segments", data.get("script", []))
    if not isinstance(data, list):
        raise ValueError('script must be a JSON array or {"segments": [...]}')
    return data


def _title_from(segments: list[Segment]) -> str:
    for s in segments:
        if s.kind == "intro":
            # The intro's first clause (up to a comma or sentence end), capped so
            # a title is a complete phrase, not a hard word-count cut mid-thought.
            # Clause punctuation, or a period only where it ends a sentence: not
            # inside "3.5" (no space after) and not after an initial as in "U.S."
            # (single capital before), so news-style intros keep their titles.
            head = re.split(r"[,;:]|(?<![A-Z])\.(?=\s|$)", s.text.strip(), maxsplit=1)[0]
            words = head.split()[:12]
            return " ".join(words).rstrip(".,;:") or "Rundown episode"
    return "Rundown episode"


def write_script(llm: LLMClient, articles: list[Article], prefs: Preferences) -> ScriptResult:
    res = llm.complete(_PROMPT, _user_message(articles, prefs), model=prefs.llm_model_script)
    raw = _segments_from(res.text)
    segments = [
        Segment(
            kind=s["kind"],
            speaker=s.get("speaker", "host"),
            text=s["text"],
            energy=s.get("energy") if s.get("energy") in _ENERGIES else "warm",
        )
        for s in raw
    ]
    if not segments or segments[0].kind != "intro" or segments[-1].kind != "outro":
        raise ValueError("script must start with intro and end with outro")
    return ScriptResult(segments=segments, tokens_in=res.tokens_in, tokens_out=res.tokens_out, title=_title_from(segments))
