"""Assemble per-segment PCM into one episode MP3, locally and dependency-light.

The segments arrive as raw 16-bit mono PCM straight from the TTS provider, so
everything here is byte math on the stdlib: gaps are runs of zero samples, the
topic ding is a generated decaying sine (no asset files), and the only non-stdlib
piece is the lameenc MP3 encoder, a pure-pip wheel with no system dependencies.

Working in PCM also makes the episode length exact: bytes / (2 x rate) is the
real duration, not a words-per-minute guess.
"""
import math
import struct

import lameenc

# A topic gap is a beat of air between stories: long enough to reset the ear,
# short enough not to read as dead air.
_GAP_MS = 500
# The ding sits inside the gap: a quiet 880 Hz cue that decays fast, mixed at
# roughly -18 dB so it marks the boundary without turning into a jingle.
_DING_MS = 250
_DING_HZ = 880.0
_DING_PEAK = 4000
_DING_DECAY_MS = 60.0


def silence(ms: int, rate: int) -> bytes:
    return b"\x00\x00" * (rate * ms // 1000)


def ding(rate: int) -> bytes:
    n = rate * _DING_MS // 1000
    out = bytearray()
    for i in range(n):
        t = i / rate
        v = _DING_PEAK * math.exp(-t * 1000 / _DING_DECAY_MS) * math.sin(2 * math.pi * _DING_HZ * t)
        out += struct.pack("<h", int(v))
    return bytes(out)


def topic_gap(rate: int, with_ding: bool) -> bytes:
    gap = silence(_GAP_MS, rate)
    if not with_ding:
        return gap
    lead = silence((_GAP_MS - _DING_MS) // 2, rate)
    d = ding(rate)
    tail_len = max(0, len(gap) - len(lead) - len(d))
    return lead + d + b"\x00" * tail_len


def assemble(chunks: list[tuple[str, bytes]], rate: int, with_ding: bool) -> bytes:
    """Join (kind, pcm) chunks in order, opening a gap before each story so
    topics breathe. Intro flows into the gap like a handoff; the outro follows
    the last story directly, a sign-off rather than a new topic."""
    out = bytearray()
    for i, (kind, pcm) in enumerate(chunks):
        if kind == "story" and i > 0:
            out += topic_gap(rate, with_ding)
        out += pcm
    return bytes(out)


def duration_seconds(pcm: bytes, rate: int) -> int:
    return round(len(pcm) / (2 * rate))


def encode_mp3(pcm: bytes, rate: int) -> bytes:
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(128)
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    data = encoder.encode(pcm)
    data += encoder.flush()
    return bytes(data)
