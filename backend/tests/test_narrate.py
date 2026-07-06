from app.adapters.fakes import FakeTTSClient
from app.pipeline.scriptwriter import Segment
from app.pipeline.narrate import narrate_single


def test_single_host_one_call():
    tts = FakeTTSClient()
    segs = [Segment("intro", "host", "Hello there."), Segment("outro", "host", "Goodbye now.")]
    res = narrate_single(tts, segs, voice_id="Rachel", model_id="m")
    assert len(tts.calls) == 1
    assert res.characters == len("Hello there. Goodbye now.")
    assert res.word_count == 4
    assert len(res.audio) > 0
