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

## QA-02a static integration review

Reviewed committed foundation at `940c5df` against `docs/04-API.md` and the AC matrix. This is source inspection and **does not count as HTTP acceptance evidence**. Findings and retest steps are in [defects.md](defects.md).

| Command / inspection | Exit | Actual observation |
|---|---:|---|
| `test -f apps/api/composer.lock` | 1 | Lockfile absent although API Dockerfile has two `COPY` statements referencing it; QA-001. |
| `rg -n 'app:products:seed' infra/docker/api/start.sh` | 0 | Startup invokes seed at line 6. |
| `rg -n 'AsCommand\|app:products:seed' apps/api/src` | 1 | No registered seed command found in current source; QA-002. |
| `rg -n 'content-type\|content-disposition\|referrer-policy\|Location' 'apps/web/src/app/api/v1/[...path]/route.ts'` | 0 | Proxy response header allowlist omits `Location`; QA-003. |
| `docker compose config --no-interpolate` | 0 | Compose parses into two services and one named volume. This does **not** verify environment values, images, startup, proxy, or persistence. |
| `PYTHONPYCACHEPREFIX=/tmp/qa02a-pycache python3 -m py_compile scripts/smoke/public_api.py` | 0 | Smoke script syntax compilation passed. |
| `python3 scripts/smoke/public_api.py --help` | 0 | Smoke CLI displayed its arguments. |

The Docker daemon remains unavailable, so `docker compose build/up`, proxied health, and feature flows are **NOT VERIFIED**. No AC/C row is promoted to PASS by this review.

## QA-02b catalog and proxy static review

Reviewed committed BE-02a `60db5f4` and FE-01 proxy against the frozen API. Source inspection found no concrete P0 catalog defect in this slice. The new public catalog controller routes `/categories`, `/products`, and `/products/{id}` to `ProductService`; product input uses integer cents, normalized SKU, fixed-decimal weight, and explicit query validation. None of these observations is an HTTP PASS.

| Command / inspection | Exit | Actual observation |
|---|---:|---|
| `python3` SQLite query: `SELECT lower('Élan') LIKE '%élan%'` and ASCII control `SELECT lower('Steel Bottle') LIKE '%steel%'` | 0 | Returned `0` and `1` respectively. QA-004 is a documented P1 SQLite Unicode search limitation under `docs/03-BACKEND.md` Section 8; AC-09 remains scoped to ASCII mixed-case data. |
| `git show 2cfc2d4 -- 'apps/web/src/app/api/v1/[...path]/route.ts'` | 0 | FE-02a committed a filtered `Location` copy. QA-003 is READY_FOR_RETEST; proxied 201 header still needs HTTP proof. |

FE-02a `2cfc2d4` also stores the original checkout body and UUID in session storage. `prepareAttempt()` rejects a changed body while an earlier attempt exists; ambiguous outcomes expose a retry using that exact body/key, and a new key requires an explicit reset with a duplicate-purchase warning. This is a static review of the committed retry path, not proof that C-11 or AC-16 passes through the API.

Orchestrator reported Docker daemon access is available through escalation after this review. Runtime PASS remains pending a committed Composer lockfile, seed command, and booted Compose stack.

## BE-02b image-build retest

BE-02b `f58e45c` committed `apps/api/composer.lock`, admin session and product mutation endpoints. The Orchestrator reported running `docker compose --env-file .env.example build api` from the repository root with escalated Docker daemon access: **exit 0**, final output `e-commerce-challenge-api Built`. This is orchestrator-observed evidence resolving QA-001 for the image-build step. QA did not independently rerun the build. No container startup, seed, proxied health, authenticated API flow, or AC-01/21 PASS follows from the image build.

Static review of committed BE-02b checked `AdminSession::requireAdmin()` before protected reads/writes, CSRF and Origin checks before mutations, JSON input parsing, and the create response `Location` header. No concrete P0 defect was found in this narrow source review; C-04–C-07 remain **NOT VERIFIED** pending HTTP tests.

| QA-02b local command | Exit | Actual result |
|---|---:|---|
| `test -f apps/api/composer.lock` | 0 | Lockfile now present at BE-02b. |
| `rg -n 'AsCommand\|app:products:seed' apps/api/src` | 1 | Seed command still absent from BE-02b; QA-002 remains OPEN pending BE-02c. |
| `PYTHONPYCACHEPREFIX=/tmp/qa02b-pycache python3 -m py_compile scripts/smoke/public_api.py` | 0 | Smoke script syntax check passed. |
| `python3 scripts/smoke/public_api.py --help` | 0 | CLI help displayed. |
| `docker compose --env-file .env.example config --quiet` | 0 | Compose config parsed. This does not verify required private values or startup. |
