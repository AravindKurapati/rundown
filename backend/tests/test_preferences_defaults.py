import re

from app.store.models import Preferences

# ElevenLabs voice IDs are 20-character alphanumeric strings. The generator passes
# voice_a straight to text_to_speech.convert as voice_id, and keys without the
# voices_read permission cannot resolve display names, so the default must be an ID
# (not "Rachel"), or real narration 404s with voice_not_found.
_VOICE_ID = re.compile(r"^[A-Za-z0-9]{20}$")


def test_default_voices_are_ids_not_names():
    p = Preferences()
    assert _VOICE_ID.match(p.voice_a), f"voice_a must be a voice ID, got {p.voice_a!r}"
    assert _VOICE_ID.match(p.voice_b), f"voice_b must be a voice ID, got {p.voice_b!r}"
