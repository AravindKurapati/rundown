from app.store import db as dbmod, repo
from app.adapters.fakes import FakeLLMClient, FakeTTSClient
from app.sources.base import Article
from app.pipeline.generator import generate_episode


class FakeSource:
    def fetch(self, query, limit=10):
        return [Article(title=f"{query} headline", url=f"http://x/{query}", source="s", published="", snippet="s")]


class RaisingSource:
    def fetch(self, query, limit=10):
        raise RuntimeError("upstream feed is down")


def test_generate_episode_end_to_end(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating", host_mode="single")
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    out = generate_episode(ep.id, FakeSource(), FakeLLMClient(), FakeTTSClient(), prefs)
    assert out.status == "ready"
    assert out.mp3_path and (tmp_path / f"{ep.id}.mp3").exists()
    assert out.tts_characters > 0 and out.est_cost_usd is not None
    assert out.duration_seconds is not None


def test_generate_episode_persists_failed_on_stage_error(tmp_path, monkeypatch):
    # A stage that raises must never crash the caller: the episode must land in
    # "failed" with the error recorded, so the failed-path kwargs stay correct.
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating", host_mode="single")
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    out = generate_episode(ep.id, RaisingSource(), FakeLLMClient(), FakeTTSClient(), prefs)
    assert out.status == "failed"
    assert out.error and "upstream feed is down" in out.error
    assert out.latency_ms is not None


def test_generate_episode_persists_failed_on_bad_prefs(tmp_path, monkeypatch):
    # Malformed preferences must also be caught as a failed run, not raised out
    # of the orchestrator uncaught (interests_json is not valid JSON here).
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    prefs = repo.get_preferences()
    prefs.interests_json = "not valid json"
    ep = repo.create_episode(status="generating", host_mode="single")
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    out = generate_episode(ep.id, FakeSource(), FakeLLMClient(), FakeTTSClient(), prefs)
    assert out.status == "failed"
    assert out.error


def test_generate_blocked_when_over_budget(tmp_path, monkeypatch):
    # Prior ready spend already sits at the cap, so the next run's projected cost
    # crosses it: the run must fail before any TTS spend, with no audio written.
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    prefs = repo.get_preferences()
    monkeypatch.setattr("app.config.settings.budget_cap_usd", 1.0)
    repo.create_episode(status="ready", est_cost_usd=1.0)
    ep = repo.create_episode(status="generating", host_mode="single")
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)

    tts = FakeTTSClient()
    out = generate_episode(ep.id, FakeSource(), FakeLLMClient(), tts, prefs)

    assert out.status == "failed"
    assert out.error and "budget" in out.error.lower()
    assert len(tts.calls) == 0
    assert not (tmp_path / f"{ep.id}.mp3").exists()
