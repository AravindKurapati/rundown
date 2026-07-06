from dataclasses import dataclass
from typing import Protocol


@dataclass
class Article:
    title: str
    url: str
    source: str
    published: str
    snippet: str


class NewsSource(Protocol):
    def fetch(self, query: str, limit: int) -> list[Article]: ...
