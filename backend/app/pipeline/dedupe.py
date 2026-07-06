import re
from app.sources.base import Article


def _norm(title: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", title.lower()).strip()


def dedupe(articles: list[Article]) -> list[Article]:
    seen_titles: set[str] = set()
    seen_urls: set[str] = set()
    out: list[Article] = []
    for a in articles:
        nt = _norm(a.title)
        if nt in seen_titles or a.url in seen_urls:
            continue
        seen_titles.add(nt)
        seen_urls.add(a.url)
        out.append(a)
    return out
