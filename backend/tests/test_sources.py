from pathlib import Path
from app.sources.google_news import GoogleNewsRSSSource

SAMPLE = Path(__file__).parent / "fixtures" / "google_news_sample.xml"


def test_fetch_parses_articles():
    import feedparser
    src = GoogleNewsRSSSource(parse_fn=lambda url: feedparser.parse(SAMPLE.read_text(encoding="utf-8")))
    arts = src.fetch("AI", limit=5)
    assert len(arts) == 3
    assert arts[0].title and arts[0].url
    assert all(a.snippet is not None for a in arts)
