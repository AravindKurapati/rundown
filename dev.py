#!/usr/bin/env python3
"""One command to run Rundown locally: starts the API and the UI together.

    python dev.py

Cross-platform (Windows, macOS, Linux); needs only Python plus a one-time
`make setup` (backend venv + frontend `npm install`). Ctrl-C stops both.
No Docker, no make required. Kept deliberately small, in the spirit of the
rest of the project: run the two processes, tear them down cleanly, nothing
more.
"""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
IS_WINDOWS = os.name == "nt"


def backend_python() -> str:
    """Prefer the backend venv interpreter; fall back to the current one."""
    for candidate in (
        BACKEND / ".venv" / "Scripts" / "python.exe",   # Windows venv
        BACKEND / ".venv" / "bin" / "python",           # Unix venv
    ):
        if candidate.exists():
            return str(candidate)
    return sys.executable


def spawn(cmd, cwd, shell=False):
    kwargs = {"cwd": str(cwd), "shell": shell}
    if IS_WINDOWS:
        # New group so Ctrl-C reaches this launcher, not the children; we tear
        # the children down ourselves via taskkill /T.
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True  # own process group for killpg
    return subprocess.Popen(cmd, **kwargs)


def shutdown(procs):
    for p in procs:
        if p.poll() is not None:
            continue
        try:
            if IS_WINDOWS:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(p.pid)],
                    capture_output=True,
                )
            else:
                os.killpg(os.getpgid(p.pid), signal.SIGTERM)
        except Exception:
            p.terminate()
    for p in procs:
        try:
            p.wait(timeout=5)
        except Exception:
            pass


def main() -> int:
    backend = spawn(
        [backend_python(), "-m", "uvicorn", "app.main:app", "--port", "8000"],
        cwd=BACKEND,
    )
    frontend = spawn("npm run dev", cwd=FRONTEND, shell=True)
    procs = [backend, frontend]

    print("\n  Rundown is starting")
    print("    API  http://localhost:8000")
    print("    UI   http://localhost:5173   <- open this")
    print("  Ctrl-C stops both.\n")

    exited_early = False
    try:
        while all(p.poll() is None for p in procs):
            time.sleep(0.5)
        exited_early = True
        print("\n  A process exited early. Did you run `make setup` first?")
    except KeyboardInterrupt:
        print("\n  Stopping Rundown.")
    finally:
        shutdown(procs)
    return 1 if exited_early else 0


if __name__ == "__main__":
    raise SystemExit(main())
