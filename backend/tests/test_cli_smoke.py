from app.store import db as dbmod
import app.generate as gen


def test_run_once_offline(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    monkeypatch.setattr("app.config.settings.use_fakes", True)
    eid = gen.run_once()
    from app.store import repo
    assert repo.get_episode(eid).status == "ready"


def test_run_once_skips_when_a_generation_is_already_running(tmp_path, monkeypatch):
    # The CLI shares the API's single-flight guard: a fresh in-flight run must
    # stop a cron-triggered second run from starting (and double-spending).
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    monkeypatch.setattr("app.config.settings.audio_dir", tmp_path)
    monkeypatch.setattr("app.config.settings.use_fakes", True)
    dbmod.init_db()
    from app.store import repo
    repo.create_episode(status="generating")
    before = len(repo.list_episodes())
    result = gen.run_once()
    assert result == -1  # skipped
    assert len(repo.list_episodes()) == before  # no second episode created
