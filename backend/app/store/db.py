from contextlib import contextmanager
from sqlmodel import SQLModel, Session, create_engine
from app.config import settings
from app.store.models import Preferences


def _engine_config(path_or_url) -> tuple[str, dict]:
    """Turn a filesystem path or a full DB URL into (url, connect_args).

    A bare path defaults to local SQLite; a full URL (for example DATABASE_URL
    pointing at Postgres) is used as-is. check_same_thread is a SQLite-only arg.
    """
    url = str(path_or_url)
    if "://" not in url:
        url = f"sqlite:///{url}"
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return url, connect_args


def make_engine(path_or_url):
    url, connect_args = _engine_config(path_or_url)
    return create_engine(url, connect_args=connect_args)


engine = make_engine(settings.database_url or settings.db_path)


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
