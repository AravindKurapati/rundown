import json

from app.adapters.base import LLMResult
from app.adapters.fakes import FakeLLMClient
from app.sources.base import Article
from app.store.models import Preferences
from app.pipeline.scriptwriter import write_script

_SEGMENTS = [
    {"kind": "intro", "speaker": "host", "text": "Here is your rundown for today."},
    {"kind": "story", "speaker": "host", "text": "A notable development happened in tech."},
    {"kind": "outro", "speaker": "host", "text": "That is the rundown. Back tomorrow."},
]


class _ShapeLLM:
    """Returns whatever raw JSON text it is given, to exercise parser tolerance."""

    def __init__(self, text: str) -> None:
        self._text = text

    def complete(self, system: str, user: str, model: str) -> LLMResult:
        return LLMResult(text=self._text, tokens_in=1, tokens_out=1)


def _articles():
    return [Article(title="AI news", url="u", source="s", published="", snippet="x")]


def test_write_script_parses_segments():
    res = write_script(FakeLLMClient(), _articles(), Preferences(id=1))
    kinds = [s.kind for s in res.segments]
    assert kinds[0] == "intro" and kinds[-1] == "outro"
    assert all(s.speaker == "host" for s in res.segments)
    assert res.title


def test_write_script_parses_wrapped_object():
    # OpenAI response_format=json_object forces a top-level object, so the real
    # model returns {"segments": [...]}, not a bare array. The parser must accept it.
    llm = _ShapeLLM(json.dumps({"segments": _SEGMENTS}))
    res = write_script(llm, _articles(), Preferences(id=1))
    assert [s.kind for s in res.segments] == ["intro", "story", "outro"]


def test_write_script_parses_bare_array():
    # Backward tolerance: a bare top-level array must still parse.
    llm = _ShapeLLM(json.dumps(_SEGMENTS))
    res = write_script(llm, _articles(), Preferences(id=1))
    assert [s.kind for s in res.segments] == ["intro", "story", "outro"]


def test_title_is_the_intros_first_clause_not_a_hard_cut():
    intro = "Four football giants are staring at the World Cup semi-finals, and much more."
    segs = [
        {"kind": "intro", "speaker": "host", "text": intro},
        {"kind": "outro", "speaker": "host", "text": "That is the rundown."},
    ]
    res = write_script(_ShapeLLM(json.dumps(segs)), _articles(), Preferences(id=1))
    # A complete phrase (to the comma), not "...staring at the World".
    assert res.title == "Four football giants are staring at the World Cup semi-finals"
