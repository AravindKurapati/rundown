from app.store import db as dbmod
from app.store import repo


def _fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()


def test_episode_lifecycle(tmp_path, monkeypatch):
    _fresh(tmp_path, monkeypatch)
    ep = repo.create_episode(title="", status="generating")
    assert repo.active_generation_exists() is True
    repo.update_episode(ep.id, status="ready", title="Rundown")
    got = repo.get_episode(ep.id)
    assert got.status == "ready" and got.title == "Rundown"
    assert repo.active_generation_exists() is False
