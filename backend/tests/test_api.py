from fastapi.testclient import TestClient
from app.store import db as dbmod
import app.main as main


def _client(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    monkeypatch.setattr("app.config.settings.use_fakes", True)
    return TestClient(main.app)


def test_preferences_roundtrip(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    r = c.get("/api/preferences")
    assert r.status_code == 200
    body = r.json()
    body["tone"] = "deep dive"
    r2 = c.put("/api/preferences", json=body)
    assert r2.json()["tone"] == "deep dive"


def test_generate_returns_202_then_ready(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    r = c.post("/api/episodes/generate")
    assert r.status_code == 202
    eid = r.json()["episode_id"]
    ep = c.get(f"/api/episodes/{eid}").json()
    assert ep["status"] in ("ready", "generating")


def test_audio_404_before_ready(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    from app.store import repo
    ep = repo.create_episode(status="generating")
    assert c.get(f"/api/episodes/{ep.id}/audio").status_code == 404
