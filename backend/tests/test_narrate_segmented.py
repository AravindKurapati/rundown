"""Segmented narration: one TTS call per segment, prosody stitched via request
ids, assembled locally into one MP3 with an exact duration and provider-billed
character accounting. Partial failures bill the segments that completed."""
import json

from app.config import settings
from app.adapters.fakes import FakeLLMClient, FakeTTSClient
from app.pipeline.scriptwriter import Segment
from app.pipeline.narrate import narrate_segmented, SegmentedNarrationError
from app.pipeline.generator import generate_episode
from app.sources.base import Article
from app.store import db as dbmod, repo
from app.store.metrics import episode_cost


def _segments():
    return [
        Segment(kind="intro", speaker="host", text="Here is your rundown.", energy="warm"),
        Segment(kind="story", speaker="host", text="Big news broke today.", energy="high"),
        Segment(kind="story", speaker="host", text="A quieter development.", energy="calm"),
        Segment(kind="outro", speaker="host", text="Back tomorrow.", energy="warm"),
    ]


class FakeSource:
    def fetch(self, query, limit=8):
        return [Article(title=f"{query} story", url=f"https://x/{query}", source="s",
                        published="", snippet="snip")]


def _db(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    monkeypatch.setattr(settings, "audio_dir", tmp_path)
    dbmod.init_db()


def test_one_call_per_segment_with_a_growing_stitch_chain():
    tts = FakeTTSClient()
    narrate_segmented(tts, _segments(), "v1", "m1")
    seg_calls = [c for c in tts.calls if "energy" in c]
    assert len(seg_calls) == 4
    assert seg_calls[0]["previous_request_ids"] == []
    assert seg_calls[1]["previous_request_ids"] == ["fake-1"]
    assert seg_calls[3]["previous_request_ids"] == ["fake-1", "fake-2", "fake-3"]
    assert [c["energy"] for c in seg_calls] == ["warm", "high", "calm", "warm"]


def test_result_is_mp3_with_exact_duration_and_billed_actuals():
    tts = FakeTTSClient()
    res = narrate_segmented(tts, _segments(), "v1", "m1")
    assert res.audio[0] == 0xFF  # lame frames, not raw PCM
    # Fake returns 300ms PCM per segment; gaps open before each of 2 stories.
    assert res.duration_seconds == round((4 * 0.3 + 2 * 0.5))
    assert res.characters == sum(len(s.text) for s in _segments())  # fake bills len(text)
    assert len(res.calls) == 4
    assert res.calls[1]["energy"] == "high"


def test_partial_failure_carries_the_spend_already_billed():
    tts = FakeTTSClient(fail_after=2)
    try:
        narrate_segmented(tts, _segments(), "v1", "m1")
        raise AssertionError("expected SegmentedNarrationError")
    except SegmentedNarrationError as e:
        segs = _segments()
        assert e.billed_chars == len(segs[0].text) + len(segs[1].text)


def test_generator_segmented_persists_exact_duration_and_call_detail(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    monkeypatch.setattr(settings, "narration_mode", "segmented")
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating")
    out = generate_episode(ep.id, FakeSource(), FakeLLMClient(), FakeTTSClient(), prefs)
    assert out.status == "ready"
    # Fake script: intro + 2 stories + outro at 300ms each, 2 gaps of 500ms.
    assert out.duration_seconds == round(4 * 0.3 + 2 * 0.5)
    with dbmod.get_session() as s:
        from app.store.models import GenerationEvent
        from sqlmodel import select
        events = list(s.exec(select(GenerationEvent).where(
            GenerationEvent.episode_id == ep.id, GenerationEvent.stage == "narrate")))
    assert len(events) == 1
    detail = json.loads(events[0].detail)
    assert len(detail["calls"]) == 4


def test_generator_bills_partially_narrated_failures(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    monkeypatch.setattr(settings, "narration_mode", "segmented")
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating")
    out = generate_episode(ep.id, FakeSource(), FakeLLMClient(), FakeTTSClient(fail_after=2), prefs)
    assert out.status == "failed"
    # The billed TTS chars are exactly the two segments that completed before the
    # failure, and the cost includes them on top of the LLM tokens.
    fake_script = FakeLLMClient().complete("s", "u", "m")
    texts = [seg["text"] for seg in json.loads(fake_script.text)["segments"]]
    assert out.tts_characters == len(texts[0]) + len(texts[1])
    assert out.est_cost_usd > episode_cost(0, out.openai_tokens, 0)


def test_narration_mode_single_still_makes_one_call(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    monkeypatch.setattr(settings, "narration_mode", "single")
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating")
    tts = FakeTTSClient()
    out = generate_episode(ep.id, FakeSource(), FakeLLMClient(), tts, prefs)
    assert out.status == "ready"
    assert len(tts.calls) == 1
    assert "energy" not in tts.calls[0]
