import json
from dataclasses import dataclass
from pathlib import Path
from app.adapters.base import LLMClient
from app.sources.base import Article
from app.store.models import Preferences

_PROMPT = (Path(__file__).parent.parent / "prompts" / "scriptwriter.txt").read_text(encoding="utf-8")


@dataclass
class Segment:
    kind: str
    speaker: str
    text: str


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


def _title_from(segments: list[Segment]) -> str:
    for s in segments:
        if s.kind == "intro":
            words = s.text.split()
            return " ".join(words[:8]).rstrip(".,") or "Rundown episode"
    return "Rundown episode"


def write_script(llm: LLMClient, articles: list[Article], prefs: Preferences) -> ScriptResult:
    res = llm.complete(_PROMPT, _user_message(articles, prefs), model=prefs.llm_model_script)
    raw = json.loads(res.text)
    segments = [Segment(kind=s["kind"], speaker=s.get("speaker", "host"), text=s["text"]) for s in raw]
    if not segments or segments[0].kind != "intro" or segments[-1].kind != "outro":
        raise ValueError("script must start with intro and end with outro")
    return ScriptResult(segments=segments, tokens_in=res.tokens_in, tokens_out=res.tokens_out, title=_title_from(segments))
