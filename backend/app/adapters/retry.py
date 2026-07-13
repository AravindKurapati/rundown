"""Shared retry policy for the outbound API adapters.

The default tenacity setup retried on *any* exception, swallowed the original
error inside a RetryError, and had no per-call timeout. That means a bad API key
(non-transient) burned three attempts before failing with an opaque error, and a
hung socket could block a run forever.

This policy retries only on transient failures, reraises the underlying error so
the caller sees the real cause, and is paired with a bounded client-level timeout
at each adapter's construction.
"""
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

# Exception classes we consider transient, matched by name so we don't have to
# import provider-specific error modules (and stay robust across SDK versions).
_TRANSIENT_NAMES = frozenset({
    # OpenAI SDK
    "APITimeoutError", "APIConnectionError", "RateLimitError", "InternalServerError",
    # httpx / Fern transport layer (used by both SDKs underneath)
    "TimeoutException", "ConnectTimeout", "ReadTimeout", "WriteTimeout",
    "PoolTimeout", "ConnectError", "ReadError", "RemoteProtocolError",
    # ElevenLabs generic API error
    "ApiError",
})
_TRANSIENT_STATUS = frozenset({429, 500, 502, 503, 504})


def is_transient(exc: BaseException) -> bool:
    """True for timeouts, connection drops, rate limits, and 5xx: things a retry
    might fix. A 400/401/404 is a caller error and is surfaced immediately."""
    if type(exc).__name__ in _TRANSIENT_NAMES:
        return True
    status = getattr(exc, "status_code", None)
    if status is None:
        status = getattr(getattr(exc, "response", None), "status_code", None)
    return status in _TRANSIENT_STATUS


def transient_retry(fn):
    """Decorator: up to 3 attempts on transient errors with exponential backoff,
    reraising the original exception when they're exhausted."""
    return retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=8),
        retry=retry_if_exception(is_transient),
        reraise=True,
    )(fn)
