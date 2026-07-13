"""The budget cap must see money that was actually spent, including the OpenAI
tokens burned by a run that failed *after* writing its script (at the budget
gate, during narration, or on the audio write). Before the fix, failed runs
recorded no est_cost_usd and total_spent_usd() summed only ready episodes, so
that LLM spend was invisible to the cap.
"""
from app.store import db as dbmod, repo, metrics
from app.store.metrics import episode_cost
from app.adapters.base import LLMResult
from app.adapters.fakes import FakeLLMClient
from app.sources.base import Article
from app.pipeline.generator import generate_episode


def _db(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)


class FakeSource:
    def fetch(self, query, limit=10):
        return [Article(title=f"{query} headline", url=f"http://x/{query}", source="s", published="", snippet="s")]


class RaisingSource:
    def fetch(self, query, limit=10):
        raise RuntimeError("upstream feed is down")


class FixedTokenLLM(FakeLLMClient):
    """Same valid script as the fake, but fixed token counts for exact cost math."""
    def complete(self, system, user, model):
        base = super().complete(system, user, model)
        return LLMResult(text=base.text, tokens_in=2000, tokens_out=1000)


class RaisingTTS:
    def __init__(self):
        self.calls = []

    def synthesize(self, text, voice_id, model_id):
        raise RuntimeError("tts provider 503")


# --- accounting rule ------------------------------------------------------

def test_total_spent_usd_includes_failed_llm_spend(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    repo.create_episode(status="ready", est_cost_usd=1.0)
    repo.create_episode(status="failed", est_cost_usd=0.5)
    assert metrics.total_spent_usd() == 1.5


def test_budget_would_exceed_counts_prior_failed_spend(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    monkeypatch.setattr("app.config.settings.budget_cap_usd", 1.0)
    repo.create_episode(status="failed", est_cost_usd=1.0)
    assert metrics.budget_would_exceed(0.0) is False   # exactly at cap is allowed
    assert metrics.budget_would_exceed(0.01) is True   # one cent over is not


def test_overview_cost_reflects_total_committed_spend(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    repo.create_episode(status="ready", est_cost_usd=1.0)
    repo.create_episode(status="failed", est_cost_usd=0.5)
    ov = metrics.overview()
    assert ov["est_cost_total_usd"] == 1.5


# --- generator failure path -----------------------------------------------

def test_failed_after_script_records_llm_only_cost(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating", host_mode="single")
    tts = RaisingTTS()

    out = generate_episode(ep.id, FakeSource(), FixedTokenLLM(), tts, prefs)

    assert out.status == "failed"
    # Script was written (2000 in / 1000 out) then TTS failed: record LLM-only
    # cost (tts_chars=0), not the full episode cost.
    assert out.est_cost_usd == episode_cost(0, 2000, 1000)
    assert out.openai_tokens == 3000
    assert not (tmp_path / f"{ep.id}.mp3").exists()
    # And that spend is now visible to the cap.
    assert metrics.total_spent_usd() == out.est_cost_usd


def test_failed_before_script_records_no_llm_cost(tmp_path, monkeypatch):
    _db(tmp_path, monkeypatch)
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating", host_mode="single")

    out = generate_episode(ep.id, RaisingSource(), FixedTokenLLM(), None, prefs)

    assert out.status == "failed"
    # Gather failed before any LLM call: nothing was spent.
    assert (out.est_cost_usd or 0.0) == 0.0
    assert out.openai_tokens is None
    assert metrics.total_spent_usd() == 0.0
