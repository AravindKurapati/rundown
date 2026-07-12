from sqlmodel import Session, select
from app.store import db as dbmod
from app.store.models import Preferences


def test_init_creates_singleton_preferences(tmp_path, monkeypatch):
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    with Session(dbmod.engine) as s:
        prefs = s.exec(select(Preferences)).all()
    assert len(prefs) == 1
    assert prefs[0].id == 1
    assert prefs[0].target_minutes == 5


def test_engine_config_defaults_bare_path_to_sqlite():
    # A bare filesystem path stays local SQLite (backward compatible).
    url, connect_args = dbmod._engine_config("/data/rundown.db")
    assert url == "sqlite:////data/rundown.db"
    assert connect_args == {"check_same_thread": False}


def test_engine_config_passes_database_url_through():
    # A full URL (e.g. DATABASE_URL for Postgres) is used as-is, and the
    # sqlite-only check_same_thread arg is dropped.
    url, connect_args = dbmod._engine_config("postgresql+psycopg://u@h/db")
    assert url == "postgresql+psycopg://u@h/db"
    assert connect_args == {}
