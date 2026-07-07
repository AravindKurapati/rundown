from app.store import db as dbmod
import app.generate as gen


def test_run_once_offline(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    monkeypatch.setattr("app.config.settings.use_fakes", True)
    eid = gen.run_once()
    from app.store import repo
    assert repo.get_episode(eid).status == "ready"
