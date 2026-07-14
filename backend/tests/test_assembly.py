"""Local audio assembly: PCM concatenation with topic gaps, a generated ding,
exact duration, and MP3 encoding. All stdlib math except the lameenc encoder."""
import struct

from app.pipeline import assembly

RATE = 22050


def _pcm_ms(pcm: bytes) -> float:
    return len(pcm) / (2 * RATE) * 1000


def test_silence_is_the_right_length_of_zeros():
    gap = assembly.silence(500, RATE)
    assert len(gap) == 2 * (RATE // 2)
    assert set(gap) == {0}


def test_ding_is_short_quiet_and_decays():
    d = assembly.ding(RATE)
    assert 150 <= _pcm_ms(d) <= 400
    samples = struct.unpack(f"<{len(d) // 2}h", d)
    peak = max(abs(s) for s in samples)
    assert 0 < peak < 8000  # audible but well under full scale (a cue, not a jingle)
    # Exponential decay: the first quarter carries more energy than the last.
    q = len(samples) // 4
    first = sum(s * s for s in samples[:q])
    last = sum(s * s for s in samples[-q:])
    assert first > last * 4


def test_assemble_places_gaps_before_stories():
    intro = b"\x01\x00" * 100
    story1 = b"\x02\x00" * 100
    story2 = b"\x03\x00" * 100
    outro = b"\x04\x00" * 100
    out = assembly.assemble(
        [("intro", intro), ("story", story1), ("story", story2), ("outro", outro)],
        rate=RATE, with_ding=False,
    )
    gap = assembly.topic_gap(RATE, with_ding=False)
    # Two story boundaries (intro->story1, story1->story2); outro flows on.
    assert out == intro + gap + story1 + gap + story2 + outro
    assert set(gap) == {0}


def test_assemble_with_ding_marks_the_gap():
    out_plain = assembly.topic_gap(RATE, with_ding=False)
    out_ding = assembly.topic_gap(RATE, with_ding=True)
    assert len(out_ding) == len(out_plain)  # ding sits inside the gap, not on top of speech
    assert set(out_ding) != {0}


def test_duration_is_exact_from_byte_count():
    pcm = b"\x00\x00" * (RATE * 7)  # exactly 7 seconds
    assert assembly.duration_seconds(pcm, RATE) == 7


def test_encode_mp3_produces_mp3_frames():
    pcm = assembly.silence(300, RATE)
    mp3 = assembly.encode_mp3(pcm, RATE)
    assert len(mp3) > 0
    assert mp3[0] == 0xFF  # MPEG frame sync, no container fluff
