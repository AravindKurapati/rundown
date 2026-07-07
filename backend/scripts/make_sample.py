"""Explicit deliverable: one REAL generation, copy MP3 to repo-root sample.mp3.
Run deliberately (spends ElevenLabs budget) with USE_FAKES=0."""
import shutil
from pathlib import Path
from app.generate import run_once
from app.store import repo


def main():
    eid = run_once()
    ep = repo.get_episode(eid)
    if ep.status != "ready":
        raise SystemExit(f"generation failed: {ep.error}")
    dest = Path(__file__).resolve().parents[2] / "sample.mp3"
    shutil.copyfile(ep.mp3_path, dest)
    print(f"wrote {dest}")


if __name__ == "__main__":
    main()
