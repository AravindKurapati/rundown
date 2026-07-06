from app.sources.base import Article
from app.pipeline.dedupe import dedupe


def _a(title, url):
    return Article(title=title, url=url, source="s", published="", snippet="")


def test_dedupe_by_title_and_url():
    arts = [
        _a("OpenAI ships model", "http://x/1"),
        _a("openai ships model!", "http://x/2"),   # same normalized title
        _a("Different story", "http://x/1"),         # same url as first
        _a("Unique one", "http://x/3"),
    ]
    out = dedupe(arts)
    assert [a.title for a in out] == ["OpenAI ships model", "Unique one"]
