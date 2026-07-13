"""Failure-mode hardening: stale generation leases, request-body validation on
the PUTs, and not leaking the mp3 filesystem path out of the episode endpoint.
Written to reproduce each defect before the fix lands.
"""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from app.store import db as dbmod, repo
import app.main as main


def _client(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    monkeypatch.setattr("app.config.settings.use_fakes", True)
    return TestClient(main.app)


# --- stale generation lease ----------------------------------------------

def test_stale_generating_row_is_reclaimed_not_a_permanent_lock(tmp_path, monkeypatch):
    _client(tmp_path, monkeypatch)  # init db
    ep = repo.create_episode(status="generating")
    # Simulate a run that crashed hours ago and never cleared its lease.
    repo.update_episode(ep.id, created_at=datetime.now(timezone.utc) - timedelta(hours=3))
    # A crashed run must not block generation forever.
    assert repo.active_generation_exists() is False
    # And the abandoned row is reconciled to failed, not left "generating".
    assert repo.get_episode(ep.id).status == "failed"


def test_fresh_generating_row_still_blocks(tmp_path, monkeypatch):
    _client(tmp_path, monkeypatch)
    repo.create_episode(status="generating")
    assert repo.active_generation_exists() is True


def test_generate_after_stale_lease_returns_202(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    ep = repo.create_episode(status="generating")
    repo.update_episode(ep.id, created_at=datetime.now(timezone.utc) - timedelta(hours=3))
    assert c.post("/api/episodes/generate").status_code == 202


# --- PUT /schedule validation --------------------------------------------

def test_put_schedule_missing_field_is_422_not_500(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    assert c.put("/api/schedule", json={}).status_code == 422


def test_put_schedule_bad_timezone_is_422_not_500(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    r = c.put("/api/schedule", json={"cadence": "daily", "time": "07:00", "timezone": "Mars/Olympus"})
    assert r.status_code == 422


def test_put_schedule_bad_cadence_is_422(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    r = c.put("/api/schedule", json={"cadence": "hourly", "time": "07:00", "timezone": "America/New_York"})
    assert r.status_code == 422


def test_put_schedule_valid_still_works(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    r = c.put("/api/schedule", json={"cadence": "weekly", "time": "06:30", "timezone": "America/New_York"})
    assert r.status_code == 200
    assert r.json()["cadence"] == "weekly"


# --- PUT /preferences validation -----------------------------------------

def test_put_preferences_bad_target_minutes_is_422(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    assert c.put("/api/preferences", json={"target_minutes": -3}).status_code == 422


def test_put_preferences_roundtrip_ignores_readonly_keys(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    body = c.get("/api/preferences").json()
    body["tone"] = "deep dive"
    body["id"] = 999  # readonly; must be ignored, not applied or rejected
    r = c.put("/api/preferences", json=body)
    assert r.status_code == 200
    assert r.json()["tone"] == "deep dive"
    assert r.json()["id"] == 1


# --- retry policy ---------------------------------------------------------

def test_is_transient_matches_retryable_failures():
    from app.adapters.retry import is_transient

    class RateLimitError(Exception):
        pass

    class BadRequestError(Exception):
        status_code = 400

    class ServiceUnavailable(Exception):
        status_code = 503

    assert is_transient(RateLimitError()) is True   # matched by class name
    assert is_transient(ServiceUnavailable()) is True  # matched by 5xx status
    assert is_transient(BadRequestError()) is False    # 4xx is a caller error
    assert is_transient(ValueError("boom")) is False


def test_transient_retry_reraises_original_and_skips_nontransient():
    from app.adapters.retry import transient_retry

    calls = {"n": 0}

    @transient_retry
    def always_bad_request():
        calls["n"] += 1
        raise ValueError("bad input")

    # Non-transient: surfaced immediately as the real error, not a RetryError,
    # and not retried.
    try:
        always_bad_request()
        assert False, "expected ValueError"
    except ValueError:
        pass
    assert calls["n"] == 1


# --- mp3_path leak --------------------------------------------------------

def test_get_episode_does_not_leak_mp3_path(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    ep = repo.create_episode(status="ready", mp3_path=str(tmp_path / "secret.mp3"))
    body = c.get(f"/api/episodes/{ep.id}").json()
    assert "mp3_path" not in body
    assert body["id"] == ep.id
