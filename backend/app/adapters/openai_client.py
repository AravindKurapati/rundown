from openai import OpenAI
from app.config import settings
from app.adapters.base import LLMResult
from app.adapters.retry import transient_retry

# Bounded per-request timeout so a hung call fails instead of blocking a run
# indefinitely; comfortably above the slowest observed script generation.
_TIMEOUT_S = 120.0


class OpenAIClient:
    def __init__(self):
        self._c = OpenAI(api_key=settings.openai_api_key, timeout=_TIMEOUT_S)

    @transient_retry
    def complete(self, system: str, user: str, model: str) -> LLMResult:
        resp = self._c.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
        )
        text = resp.choices[0].message.content
        u = resp.usage
        # The prompt asks for {"segments": [...]}; the scriptwriter parser accepts
        # both that object and a bare array, so no unwrapping is needed here.
        return LLMResult(text=text, tokens_in=u.prompt_tokens, tokens_out=u.completion_tokens)
