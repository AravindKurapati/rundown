import urllib.parse
import feedparser
from app.sources.base import Article


class GoogleNewsRSSSource:
    BASE = "https://news.google.com/rss/search"

    def __init__(self, parse_fn=None):
        self._parse = parse_fn or (lambda url: feedparser.parse(url))

    def _url(self, query: str) -> str:
        q = urllib.parse.quote(query)
        return f"{self.BASE}?q={q}&hl=en&gl=US&ceid=US:en"

    def fetch(self, query: str, limit: int = 10) -> list[Article]:
        feed = self._parse(self._url(query))
        out: list[Article] = []
        for e in feed.entries[:limit]:
            out.append(Article(
                title=getattr(e, "title", "").strip(),
                url=getattr(e, "link", ""),
                source=getattr(getattr(e, "source", None), "title", "") or "",
                published=getattr(e, "published", ""),
                snippet=getattr(e, "summary", "") or "",
            ))
        return out
