import urllib.parse
import urllib.request
import feedparser
from app.sources.base import Article

# Cap on how long we'll wait for the feed host. feedparser.parse(url) fetches
# with no timeout, so a slow or hung Google News endpoint could block a whole
# generation. We fetch the bytes ourselves with a bounded timeout and hand those
# to feedparser (which still does all the parsing).
FEED_TIMEOUT_S = 10
_USER_AGENT = "Rundown/1.0 (+https://example.local)"


def _fetch_and_parse(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=FEED_TIMEOUT_S) as resp:
        raw = resp.read()
    return feedparser.parse(raw)


class GoogleNewsRSSSource:
    BASE = "https://news.google.com/rss/search"

    def __init__(self, parse_fn=None):
        self._parse = parse_fn or _fetch_and_parse

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
