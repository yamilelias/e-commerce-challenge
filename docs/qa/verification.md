# QA execution evidence

QA-01 baseline, 2026-10-15 (America/Chihuahua). Contract baseline: `3532803`. The [acceptance matrix](acceptance-matrix.md) remains **NOT VERIFIED** for runtime behavior. Record subsequent runs here with the exact command, exit code, observed output summary, environment, and redacted evidence. Do not paste secrets, cookies, CSRF tokens, idempotency keys, receipt tokens, or full receipt URLs.

## Current blocker

Docker CLI is present, but the Docker daemon is unavailable at the local socket. The backend also has no committed Composer lockfile at this point. Container startup, API HTTP smoke, backend tests, migrations, seed, and persistence are **NOT VERIFIED**. No release gate is signed by this document.

## QA-01 commands and observed results

| Command | Exit | Observation |
|---|---:|---|
| `docker info --format '{{.ServerVersion}}'` | 1 | Could not connect to Docker API at the local socket; daemon unavailable. |
| `python3 -m py_compile scripts/smoke/public_api.py` | 1 | Python attempted to create a bytecode cache under `~/Library/Caches/com.apple.python` and hit `PermissionError`; no syntax result from this attempt. |
| `PYTHONPYCACHEPREFIX=/tmp/qa01-pycache python3 -m py_compile scripts/smoke/public_api.py` | 0 | Syntax compilation succeeded with writable cache. |
| `python3 scripts/smoke/public_api.py --help` | 0 | CLI arguments displayed. |
| `git diff --check -- README.md docs/qa/acceptance-matrix.md docs/qa/verification.md memory/structure/qa.md scripts/smoke/public_api.py` | 0 | No tracked whitespace errors; new files require separate staging review. |
| `python3 scripts/smoke/public_api.py` | 1 | `FAIL health: HTTP connection failed: [Errno 1] Operation not permitted`; 0/4 checks passed. Local HTTP access is unavailable in this sandbox and no stack is running. This is **NOT VERIFIED**, not a product failure. |

The smoke script currently covers only the read-only baseline. Authenticated mutation, CSV, checkout, receipt, and persistence checks depend on the complete stack and are mapped in the matrix for QA-02/03.
