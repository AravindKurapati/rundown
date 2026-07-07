from app.store import db as dbmod, repo
from app.adapters.fakes import FakeLLMClient, FakeTTSClient
from app.sources.base import Article
from app.pipeline.generator import generate_episode


class FakeSource:
    def fetch(self, query, limit=10):
        return [Article(title=f"{query} headline", url=f"http://x/{query}", source="s", published="", snippet="s")]


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
