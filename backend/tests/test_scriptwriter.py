from app.adapters.fakes import FakeLLMClient
from app.sources.base import Article
from app.store.models import Preferences
from app.pipeline.scriptwriter import write_script


def test_write_script_parses_segments():
    arts = [Article(title="AI news", url="u", source="s", published="", snippet="x")]
    res = write_script(FakeLLMClient(), arts, Preferences(id=1))
    kinds = [s.kind for s in res.segments]
    assert kinds[0] == "intro" and kinds[-1] == "outro"
    assert all(s.speaker == "host" for s in res.segments)
    assert res.title
