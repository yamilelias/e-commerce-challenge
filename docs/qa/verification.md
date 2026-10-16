# QA execution evidence

QA-01 baseline, 2026-10-15 (America/Chihuahua). Contract baseline: `3532803`. The [acceptance matrix](acceptance-matrix.md) remains **NOT VERIFIED** for runtime behavior. Record subsequent runs here with the exact command, exit code, observed output summary, environment, and redacted evidence. Do not paste secrets, cookies, CSRF tokens, idempotency keys, receipt tokens, or full receipt URLs.

## Historical QA-01 blocker (resolved)

At the QA-01 baseline, Docker CLI was present but its daemon was unavailable, and the backend had no committed Composer lockfile. Both conditions were resolved in later increments. The results below retain the historical failed commands; current gate evidence appears at the end of this file.

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

## QA-02c preparation and image-build evidence

DevOps reported the isolated web image build command `WEB_PORT=3300 PUBLIC_ORIGIN=http://localhost:3300 docker compose -p ecommerce-inf02 build web` exiting **0**; Next compile and TypeScript checks passed. The build reported eight npm dependency advisories (seven high, one critical). Their package paths, reachability, and fixes have **not been triaged**; this is not an assigned defect severity or a release decision. Web image build does not prove boot, UI flows, or persistence.

| QA preparation command | Exit | Actual result |
|---|---:|---|
| `PYTHONPYCACHEPREFIX=/tmp/qa02c-pycache python3 -m py_compile scripts/smoke/public_api.py scripts/smoke/admin_api.py` | 0 | Both smoke scripts compile. |
| `python3 scripts/smoke/admin_api.py --help` | 0 | Authenticated smoke CLI displays expected arguments. |

The new admin script uses a private password file, a cookie jar, a random disposable SKU, and a best-effort cleanup for its own fixture. It prints counts and assertion summaries, never credentials, CSRF, cookies, or receipt capabilities. The paragraph above records the preparation state; HTTP results follow.

## Integrated runtime, 2026-10-16

Environment: Docker Desktop, isolated Compose project `ecommerce-inf02`, browser-facing `http://localhost:3300`, private `.env`, API internal only. No receipt capability or credentials are recorded here.

| Command / check | Exit | Observed result |
|---|---:|---|
| `WEB_PORT=3300 PUBLIC_ORIGIN=http://localhost:3300 docker compose -p ecommerce-inf02 up --build -d web` | 0 | Next.js 16.4.2 production image compiled; both containers started, API healthy. |
| `python3 scripts/smoke/public_api.py --base-url http://localhost:3300` | 0 | 5/5 PASS: health, catalog, categories, empty search/pagination, bad query and anonymous admin. |
| `python3 scripts/smoke/admin_api.py --base-url http://localhost:3300 --username admin --password-file <private file>` | 0 | 21/21 PASS: session and CSRF/Origin guards, CRUD, validation, proxy `Location`, search, two CSV uploads, delete, logout. Both uploads on seeded DB inserted 0, skipped 90, rejected 7. |
| `python3 scripts/smoke/checkout_api.py --base-url http://localhost:3300` | 0 | 6/6 PASS: paid order and price snapshot, stock delta, identical replay, changed-body conflict, insufficient-stock rollback, receipt access rules. |
| `npm run typecheck` and `npm run lint` in `apps/web` | 0 each | TypeScript and ESLint passed after dependency update. Docker web build also ran Next production build successfully. |
| `npm audit --omit=dev --audit-level=moderate` in `apps/web` | 0 | Found zero production vulnerabilities. Full `npm audit --json` reports five high advisories through the development ESLint chain. |

Manual Chrome browser checks at 375px and 1440px found no horizontal overflow on catalog or admin login. Catalog search for `air` returned Air Purifier and Camping Chair; product detail showed stock and weight. Cart quantity 2 showed the expected $379.98 subtotal and survived refresh. A separate Air Purifier browser purchase reached a paid $189.99 receipt and cleared the cart. These were real calls through the web proxy, not mocked responses.

For persistence, a disposable fake paid order was created on `ecommerce-inf02`; its reference and token were written only to a mode-0600 private temporary file. `WEB_PORT=3300 PUBLIC_ORIGIN=http://localhost:3300 docker compose -p ecommerce-inf02 down` exited 0, followed by the matching `up -d` exiting 0 with API healthy. After restart, proxied health, the paid receipt with the same token/total, and the purchased product's decremented stock all passed. The temporary state file was deleted. The command omitted `-v`, preserving the named SQLite volume.

`apps/api` PHPUnit passed 17 tests and 89 assertions at BE-02d, including a two-process last-stock race. The separate clean-room setup check is recorded below when completed.
