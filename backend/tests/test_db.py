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
