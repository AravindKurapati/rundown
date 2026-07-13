from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/api")

# Curated fallback used offline (fakes mode) or if the ElevenLabs call fails, so
# the picker always has recognizable names to show. These are ElevenLabs premade
# voice IDs; Rachel is the app default (config.tts_voice_a).
FALLBACK_VOICES = [
    {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "description": "warm, calm narration"},
    {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "description": "deep, measured"},
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "description": "soft, friendly"},
    {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "description": "smooth, well-rounded"},
    {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "description": "confident, energetic"},
    {"id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "description": "bright, youthful"},
    {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "description": "casual, upbeat"},
    {"id": "VR6AewLTigWG4xSOukaG", "name": "Arnold", "description": "crisp, authoritative"},
]


@router.get("/voices")
def get_voices():
    """List selectable voices. Live from ElevenLabs when keys are present;
    otherwise a curated fallback so the picker still works offline."""
    if settings.use_fakes or not settings.elevenlabs_api_key:
        return {"voices": FALLBACK_VOICES, "source": "fallback"}
    try:
        from app.adapters.elevenlabs_client import ElevenLabsClient

        return {"voices": ElevenLabsClient().list_voices(), "source": "elevenlabs"}
    except Exception:
        return {"voices": FALLBACK_VOICES, "source": "fallback"}
