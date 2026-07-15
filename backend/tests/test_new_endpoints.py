"""Tests for the endpoints added alongside the pre-flight estimate + pipeline
strip: GET /episodes/estimate, GET /metrics/pipeline, GET /voices. These shipped
without coverage; estimate's topic-parsing and budget math are pure logic worth
pinning down.
"""
from fastapi.testclient import TestClient
from app.store import db as dbmod, repo, metrics
import app.main as main
from app.api.episodes import CHARS_PER_MINUTE


def _client(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    monkeypatch.setattr("app.config.settings.use_fakes", True)
    return TestClient(main.app)


# --- estimate -------------------------------------------------------------

def test_estimate_reports_chars_and_cost_from_the_same_helpers(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    body = c.get("/api/episodes/estimate").json()
    minutes = body["minutes"]
    # est_chars is exactly the calibrated rate; est_cost is the pipeline's own
    # episode_cost, not a second copy of the math.
    assert body["est_chars"] == minutes * CHARS_PER_MINUTE
    expected = round(metrics.episode_cost(body["est_chars"], tokens_in=1500, tokens_out=minutes * 200), 2)
    assert body["est_cost_usd"] == expected
    assert body["offline"] is True
    assert body["voice_name"] == "Daniel"  # config default voice_a


def test_estimate_parses_topics_and_survives_bad_json(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    repo.save_preferences({"interests_json": '["AI", "markets"]'})
    assert c.get("/api/episodes/estimate").json()["topics"] == ["AI", "markets"]

    # A malformed blob must not 500 the pre-flight summary; topics degrade to [].
    repo.save_preferences({"interests_json": "{not json"})
    assert c.get("/api/episodes/estimate").json()["topics"] == []


def test_budget_cap_is_env_only_not_a_preference(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    # The cap is an operator guardrail: it is not stored on / editable via prefs.
    assert "budget_cap_usd" not in c.get("/api/preferences").json()
    # It comes from env settings, and the estimate reports exactly that.
    monkeypatch.setattr("app.config.settings.budget_cap_usd", 20.0)
    assert c.get("/api/episodes/estimate").json()["budget_cap_usd"] == 20.0


def test_estimate_flags_budget_overrun(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    monkeypatch.setattr("app.config.settings.budget_cap_usd", 100.0)
    assert c.get("/api/episodes/estimate").json()["would_exceed_budget"] is False
    # A ready episode that already spent the whole cap makes any run overrun.
    repo.create_episode(status="ready", est_cost_usd=100.0)
    body = c.get("/api/episodes/estimate").json()
    assert body["would_exceed_budget"] is True
    assert body["spent_usd"] == 100.0
    assert body["remaining_usd"] == 0.0


# --- pipeline -------------------------------------------------------------

def test_pipeline_empty_when_no_runs(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    body = c.get("/api/metrics/pipeline").json()
    assert body == {"run_at": None, "stages": []}


def test_pipeline_returns_last_runs_stages_in_order(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    ep = repo.create_episode(status="ready")
    repo.add_event(ep.id, "gather", duration_ms=2052, ok=True)
    repo.add_event(ep.id, "script", duration_ms=50262, ok=True)
    repo.add_event(ep.id, "narrate", duration_ms=46164, ok=False)
    body = c.get("/api/metrics/pipeline").json()
    assert [s["stage"] for s in body["stages"]] == ["gather", "script", "narrate"]
    assert body["stages"][0]["duration_ms"] == 2052
    assert body["stages"][2]["ok"] is False
    assert body["run_at"] is not None


# --- voices ---------------------------------------------------------------

def test_voices_falls_back_offline(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    body = c.get("/api/voices").json()
    assert body["source"] == "fallback"
    assert any(v["name"] == "Daniel" for v in body["voices"])
    assert len(body["voices"]) == 9
