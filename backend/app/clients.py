from app.config import settings
from app.sources.google_news import GoogleNewsRSSSource
from app.adapters.fakes import FakeLLMClient, FakeTTSClient


def get_clients():
    if settings.use_fakes:
        return GoogleNewsRSSSource(parse_fn=lambda url: _empty()), FakeLLMClient(), FakeTTSClient()
    from app.adapters.openai_client import OpenAIClient
    from app.adapters.elevenlabs_client import ElevenLabsClient
    return GoogleNewsRSSSource(), OpenAIClient(), ElevenLabsClient()


class _Empty:
    entries: list = []


def _empty():
    return _Empty()
