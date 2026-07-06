from pathlib import Path
from contextlib import contextmanager
from sqlmodel import SQLModel, Session, create_engine
from app.config import settings
from app.store.models import Preferences


def make_engine(path: Path):
    return create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})


engine = make_engine(settings.db_path)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        if s.get(Preferences, 1) is None:
            s.add(Preferences(id=1))
            s.commit()


@contextmanager
def get_session():
    with Session(engine) as s:
        yield s
