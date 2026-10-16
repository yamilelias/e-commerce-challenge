# 06 — Infrastructure & Local Delivery (DevOps Agent)

**Project:** Weekend E-Commerce MVP  
**Status:** Implementation contract, subject to orchestrator's Phase-1 freeze  
**Owner:** DevOps Agent  
**Priority:** P0 reproducible Docker experience; keep infrastructure proportional to a ~16-hour execution target (20 focused hours maximum including stabilization).  
**Read first:** `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `03-BACKEND.md`, `05-FRONTEND.md`. `04-API.md` is authoritative on HTTP/cookies/security; `02-ARCHITECTURE.md` controls runtime boundaries; `00-ORCHESTRATOR.md` controls delegation and ownership.

> **Mission:** A reviewer can clone the repo, configure private values once, run `docker compose up --build -d`, and browse a working Next.js UI with Symfony API, persistent SQLite, migrated schema, and seeded catalog. Keep two runtime services: `web` and `api`; **no PostgreSQL, Redis, reverse-proxy service, queue, or external credentials**. A production-style image/build is required, not a claim that this local demo is internet-production hardened.

## 1. Deliverables and file ownership

| Owned by DevOps | Expected responsibility |
|---|---|
| `compose.yaml` | Two services, network, persistence, health/readiness, environment, safe ports |
| `apps/web/Dockerfile` | Multi-stage, pinned Node LTS-compatible base, production standalone Next.js runtime |
| `apps/api/Dockerfile` | Multi-stage PHP CLI runtime, required extensions, Composer dependencies, production Symfony startup |
| `apps/web/.dockerignore`, `apps/api/.dockerignore` | Exclude secrets, build outputs, databases, dependency noise (without excluding essential migrations) |
| `.env.example` | Enumerate variables, safe examples; **no actual secrets** |
| `infra/docker/**` | Minimal API entrypoint, readiness check and tiny support scripts, only as necessary |
| `Makefile` (optional) | Ergonomic aliases; direct Docker commands remain documented |
| `.github/workflows/ci.yml` (if time) | Basic builds/tests without exposed credentials |

**Boundaries:** Frontend Agent owns `apps/web/src/app/api/v1/[...path]/route.ts` (proxy) and Next config; DevOps reviews and tests its production behavior. Backend Agent owns Symfony session configuration, services, Doctrine migrations and `app:products:seed`. DevOps **does not edit application features, schema, API DTOs, lockfiles or auth business logic** without a delegated task and an orchestrator-approved owner handoff. QA owns `README.md`, `scripts/smoke/**`, `docs/qa/**`; DevOps supplies tested commands and evidence. Backend/Frontend review their Dockerfile and dependency/runtime requirements before merge.

## 2. Frozen runtime topology

```text
Host browser  http://localhost:3000
          |
          v
      [web] Next.js standalone :3000 (only published container port)
          |  same-origin /api/v1/* proxy, server-side API_INTERNAL_URL
          v
      [api] Symfony/PHP HTTP :8000 (internal-only Compose DNS `api`)
          |
          +--> /data/ecommerce.sqlite  [named volume; API-only]
          +--> Symfony session storage [API-local / persistent as needed for restarts]

Compose private default network connects `web` and `api`.
```

Browser **never calls** `http://api:8000`, never receives internal service URLs and never contacts Symfony directly. Development URL is `http://localhost:3000`, with `PUBLIC_ORIGIN=http://localhost:3000`. The API does not publish host port `8000` by default; `docker compose exec api ...` is available for diagnostics. No standalone SQLite container.

### `compose.yaml` requirements

- Services **named exactly** `web` and `api` (used by contracts and README).
- API image has a durable `ecommerce_data` named volume mounted **only** to `/data`; configure `DATABASE_URL` pointing to SQLite `/data/ecommerce.sqlite` in the format Doctrine expects (verify with installed Doctrine version, e.g. `sqlite:////data/ecommerce.sqlite` or `sqlite:///%kernel.project_dir%/...` only if it resolves to `/data`). Always verify effective path, do not assume URI slash semantics.
- Store Symfony sessions in a directory **inside `/data`** (e.g. `/data/sessions`) for continuity after API container recreation if using native filesystem sessions. Ensure permissions and file ownership; **never** expose sessions through the web container. Avoid container-memory-only sessions if claiming session persistence.
- API is **internal**, `expose: ["8000"]` is optional/documentary, `ports` omitted. Web publishes `${WEB_PORT:-3000}:3000` bound to `127.0.0.1` for safe local defaults; document if broader LAN binding is needed.
- Set `restart: unless-stopped`, a practical `stop_grace_period`, and service healthchecks. Configure `web` dependency on `api` health (`depends_on: api: { condition: service_healthy }`) for first launch; still handle runtime API failures gracefully.
- Load `.env` from the host with explicit variable mapping for secrets; do **not** bake private values into Dockerfile `ENV` or build args. Compose interpolation must fail early for absent required secrets (`${APP_SECRET:?Set APP_SECRET ...}` etc.).
- Do not enable bind mounts in the default production-like Compose config: they can shadow built assets or vendor dependencies. An optional `compose.dev.yaml` may use bind mounts only if all P0 work is already delivered.
- DB and imported records survive `docker compose down` and container/image rebuild; document that `docker compose down -v` **deletes all orders and catalog data**.

## 3. API container — production-like, weekend-simple

Use a PHP version supported by the selected Symfony release (PHP 8.3+ per architecture), a pinned PHP base-image version, and a minimal PHP HTTP server capable of concurrent local API requests. **Do not use `symfony server:start` or `php -S` as the claimed production runtime.** The DevOps agent selects a pragmatic PHP runtime supporting Symfony front-controller routing (e.g. FrankenPHP with pinned image/version) and verifies compatibility with Composer, Doctrine and PHP extensions. Record the selected runtime and trade-off in `docs/decisions.md` via orchestrator. No requirement to add nginx as a third container.

- Build dependency stage runs Composer with locked dependencies, `--no-dev --prefer-dist --no-interaction --optimize-autoloader`; ensure Symfony cache warmup is compatible with runtime env and no dependency on an unavailable build-time database.
- Required PHP extensions: `pdo_sqlite`, `sqlite3`, `mbstring`, `intl` (and whichever the installed Symfony/CSV stack actually requires); Composer itself need not be present in final runtime if all operations use `vendor` and `bin/console`.
- Copy `apps/api` source, migrations and bundled `data/products.csv` to **`/app/data/products.csv`**; original fixture bytes stay unmodified. Copy `data/product-images.json` to **`/app/data/product-images.json`** for URL enrichment after seed. The catalog contains URLs and attribution metadata only, never image bytes. Coordinate build context (`context: .`, `dockerfile: apps/api/Dockerfile`) and `.dockerignore` so both fixtures are included, and never copy `.env.local`/`.env` secrets.
- Run as a non-root user after binding the unprivileged port, ensuring `/data` and Symfony writable cache/log/session directories are writable. Root may be used only in a short entrypoint initialization if volume ownership requires it; drop privileges before serving HTTP.
- Respect `APP_ENV=prod`, `APP_DEBUG=0`, stable `APP_SECRET`, stable `RECEIPT_SECRET`, and `PUBLIC_ORIGIN`. Do not set demo admin password/hash in image layers.
- API health command uses `GET http://127.0.0.1:8000/api/v1/health` and checks the **HTTP 200** status. `/health` must verify SQLite access per `04-API.md`; fail health on missing/locked-unavailable DB. Avoid tools (`curl` or `wget`) that are absent from chosen runtime; embed a small PHP-based check if necessary.
- Log startup failures to stdout/stderr without emitting secrets; do not turn on Symfony debug/profiler in shipped setup.

## 4. Web container — Next.js production build

- Use a version-pinned, supported Node LTS image consistent with the selected Next.js version. Prefer multi-stage build with `npm ci` (or the **one frozen package manager** and lockfile selected by Frontend), a build stage, and a lean runtime stage.
- Frontend Agent must set `output: 'standalone'` (or equivalent validated standalone packaging) and provide a successful production build; final image copies `.next/standalone`, `.next/static`, and `public` where applicable.
- Listen on `0.0.0.0:3000`; use `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`. Run as non-root.
- `API_INTERNAL_URL=http://api:8000` is a **runtime server-side only** variable; no `NEXT_PUBLIC_API_INTERNAL_URL`, secret, DB path or admin hash in JS bundles.
- The Next.js proxy forwards `/api/v1/*` to Symfony `/api/v1/*`; it must be valid in the **production build** and avoid accidental static caching of session/order/search responses.
- Healthcheck against `http://127.0.0.1:3000/` (or a minimal agreed existing route) must use an available runner (Node fetch is acceptable) and treat non-2xx as unhealthy. Note that web health is not proof of successful checkout; separate smoke checks validate full stack.

## 5. Security, secrets, origin and cookie contract

| Variable | Service(s) | Behavior |
|---|---|---|
| `WEB_PORT` | Compose/web host | Optional, default `3000` |
| `API_INTERNAL_URL` | Web only | `http://api:8000`, never `NEXT_PUBLIC_*` |
| `PUBLIC_ORIGIN` | API | `http://localhost:3000` for browser Origin checks |
| `APP_ENV`, `APP_DEBUG` | API | `prod`, `0` for default Docker path |
| `APP_SECRET` | API | Generated private, stable across restarts |
| `DATABASE_URL` | API | SQLite database at `/data/ecommerce.sqlite` |
| `ADMIN_USERNAME` | API | Nonempty admin username, server-only |
| `ADMIN_PASSWORD_HASH` | API | Symfony-compatible password hash; **not** plaintext |
| `RECEIPT_SECRET` | API | Independent high-entropy secret (at least 32 random bytes), **stable** so receipt links remain valid |
| `SESSION_COOKIE_SECURE` or equivalent Symfony setting | API | `false` **only** on documented local HTTP; `true` behind HTTPS |

The `.env.example` should contain placeholders rather than real admin hashes, `APP_SECRET` or `RECEIPT_SECRET`. README must show commands for securely generating private secrets (e.g. `openssl rand -hex 32`) and a password hash using the project's actual Symfony password hasher; verify the specific command against installed Symfony. Do **not** write a hash that corresponds to a public default password. Users copy `.env.example` to untracked `.env`; `.gitignore` excludes `.env`, `.env.local` and secrets. Do not print actual values in validation logs/screenshots.

Symfony admin session requirements: `HttpOnly`, `SameSite=Lax`, `Path=/`, host-only cookie (no `Domain=api`), `Secure` for HTTPS and the documented localhost HTTP exception. `GET /api/v1/admin/session` returns session status and session-bound CSRF; login rotates session identifier and CSRF token. The Next.js proxy passes every `Set-Cookie` header through unchanged (excluding unsafe internal domain attributes if backend misconfigured: **fix backend cookie configuration**, do not rewrite credentials into JS). Proxy forwards request cookies and `Origin`, `Content-Type` (multipart boundary preserved), `X-CSRF-Token`, `Idempotency-Key`, `Accept` with proper method/body/status, and strips hop-by-hop headers. Prohibit caller-controlled upstream origin/URL, and preserve query string safely.

**Important Origin nuance:** requests from the browser to `/api/v1/*` carry `Origin: http://localhost:3000` on mutations; the internal API must compare against `PUBLIC_ORIGIN`, not `http://api:8000`. If Origin is absent (curl/test scripts), Symfony still requires valid session and CSRF; never disable security to make scripts pass. `Cache-Control: no-store` on auth and order endpoints; Next.js receipt pages `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, no third-party pixels. Never log receipt query tokens or cookies; avoid request URL logging on receipt endpoint.

**HTTPS caveat:** Default Compose binds HTTP loopback only. Exposing it publicly requires a proper TLS endpoint, secure cookies, host/origin configuration, rate limiting/security review, and an appropriate deployment architecture; explicitly document that these steps are **not part of the challenge**.

## 6. Startup, migrations, seeding, and failure recovery

**Required one-command launch:** after the documented local private `.env` values exist, `docker compose up --build -d` must start both services with schema and initial seed ready. DevOps and Backend must agree on one **single-writer initialization strategy**:

1. API container entrypoint validates required env variables without echoing them, ensures volume paths exist/writable, and initializes safe session directory.
2. Run Doctrine migrations non-interactively (`php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration`) **before** declaring API ready. Verify flags supported by installed Doctrine version; if necessary use corresponding supported command.
3. Run `php bin/console app:products:seed --file=/app/data/products.csv`; it must use Backend's shared CSV importer, output an accounting summary, and exit successfully for a parseable dirty CSV with per-row rejects. A genuinely invalid or missing file is a startup failure; no manual seeding step on first startup.
4. Only after successful initialization start the PHP HTTP server and pass healthchecks. Compose then starts/marks web ready based on API health.

For this MVP `api` is a **single container replica**; never scale API replicas against the same SQLite file or race concurrent migrations/seed operations. Startup sequence repeats safely on normal restarts: existing records remain intact and seed never restores purchased stock. If initialization fails, API exits nonzero and surfaces actionable errors; no fake healthy state. Seed output contains counts, **not** full customer/product-sensitive data. In readiness testing, ensure the frontend does not start serving a broken catalog if API is not ready.

Document manual commands (must match the actual implementation):

```bash
# After first start or during maintenance
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 web
docker compose exec api php bin/console doctrine:migrations:status
docker compose exec api php bin/console app:products:seed --file=/app/data/products.csv
# Verify second seed has inserted = 0; no inventory resets.
docker compose exec api php bin/console app:products:images --file=/app/data/product-images.json
# Verify repeat enrichment updates zero rows and preserves existing image URLs.

# Safe restart, keeps data
docker compose down
docker compose up -d

# Destructive reset: only with explicit confirmation from operator
# docker compose down -v
```

**Do not run migrations, seed, or image enrichment at Docker image build time**: SQLite database belongs to runtime volume and must persist independently of image rebuilds. Avoid a `docker compose run` recipe that silently creates a separate database or changes ownership. The browser fetches thumbnails from Wikimedia Commons; lack of external network access must leave a usable product fallback.

## 7. Build optimization and reliability constraints

- Use pinned major/minor (or digest where practical) bases and repository lockfiles (`package-lock.json` and `composer.lock`, or agent-approved equivalents). Do not mix package managers.
- Put dependency installation before app source copy to maximize layer caching; ensure lockfile changes invalidate dependency layers.
- `.dockerignore`: exclude `.git`, `node_modules`, `.next`, `vendor`, `var/cache`, local SQLite files, logs, `.env*` private files; **do not exclude** migration files or required CSV fixture. `.env.example` may be included for documentation only.
- Limit runtime privileges and write permissions. SQLite WAL mode **only if tested** with the named Docker volume and permissions; define `busy_timeout`/DB locking behavior with Backend per `03-BACKEND.md`.
- Use a named Docker volume, not host bind mount by default (SQLite host filesystem locking differs across Docker Desktop and Linux). Keep DB/test fixtures separate: automated destructive tests must never point at `/data/ecommerce.sqlite`.
- No placeholder health command or always-true health check. Fail clearly when DB or required env secrets are missing.
- Rebuilds must not invalidate receipt links: preserve stable `RECEIPT_SECRET`, `APP_SECRET` and data volume.
- Timebox CI polish: build verification and core tests first; dependency scanners, SBOM, multi-architecture images, Kubernetes, image publishing and observability stacks are explicitly out of scope.

## 8. Local development workflows (minimum required)

**Default supported workflow** is the Docker-built application, not separate host installation of PHP and Node:

```bash
cp .env.example .env
# Set secrets/admin hash; see README for actual generation commands.
docker compose up --build -d
docker compose ps
# Visit http://localhost:3000
```

For application code changes, rebuild the appropriate service:

```bash
docker compose up --build -d api
docker compose up --build -d web
```

If `up ... api` restarts dependencies unexpectedly, document the recommended `--no-deps` alternative with tested behavior. Running tests should be possible in ephemeral test environments (`docker compose run --rm ...` or build/test stages) with **separate test SQLite**; use commands supplied by Backend and Frontend rather than inventing scripts.

If supporting native hot reload is easy, document it as optional and subordinate to the one-command Docker path. Never make hot reload or undocumented host prerequisites necessary for reviewers.

## 9. Clean-room acceptance procedure (QA + DevOps)

Perform from a clean checkout (or an isolated fresh directory, no existing volumes/cache-dependent behavior), with only Docker, Docker Compose and a documented secret-generation tool installed:

| ID | Verify | Required evidence |
|---|---|---|
| I-01 | `.env.example` lists every needed input; secret setup documented | Redacted variable names + commands |
| I-02 | `docker compose config` validates, and `up --build -d` starts clean | Exit codes, healthy `ps` output |
| I-03 | `web` published on localhost; API **not** published | `docker compose ps`, host port inspection |
| I-04 | `http://localhost:3000/api/v1/health` returns 200 from DB-backed health | HTTP status and redacted body |
| I-05 | Migrated database and catalog seeded from actual attached CSV | Migration status, seed result counts |
| I-06 | Re-run seed inserts zero products, does not change stock/prices | Before/after selected SKU + counts |
| I-07 | Admin session bootstrap `Set-Cookie` survives same-origin proxy | Browser network headers; no secret logs |
| I-08 | Login rotates session/CSRF; protected write rejects missing CSRF | Browser or safe test results |
| I-09 | Multipart CSV upload survives proxy, reports rejects/skips | HTTP response; no fake data |
| I-10 | Checkout idempotency and receipt retrieval work through web proxy | Successful response, repeat key unchanged, receipt refresh |
| I-11 | `docker compose down && docker compose up -d` preserves product/order state | Before/after DB IDs and stock |
| I-12 | Production-style web build works; no backend/receipt/admin secrets in JS | Build output + grep or review |
| I-13 | Missing required secret fails clearly, not an open default | Controlled redacted failure check |
| I-14 | Both services provide meaningful healthchecks | `docker compose ps`, simulated failure |
| I-15 | Test commands use isolated SQLite, not the named production-like volume | Test config + observed path |

**Do not claim I-02 through I-15 passed until commands actually run.** Record timestamps, commands, outcomes and any limitations in `docs/qa/infrastructure-results.md` through QA ownership/handoff. Screenshots must not include credentials or tokens. Distinguish an unrun test from a failed one.

## 10. Execution tasks, parallelism and timeboxes

Each task must follow `00-ORCHESTRATOR.md` lifecycle (`BACKLOG → READY → IN_PROGRESS → REVIEW → DONE` or `BLOCKED`) and return changed files, commit, commands/evidence, open risks and unlocked dependencies.

| ID | Budget | Dependencies | Work | Gate |
|---|---:|---|---|---|
| **D0 — Contract acknowledgment** | 15 min | Phase 1 contract freeze | Confirm public port, internal API path, cookie strategy, runtime versions, owner boundaries and exact env names | Written acknowledgment; discrepancies to orchestrator |
| **D1 — Compose & env foundation** | 30–45 min | D0 | `compose.yaml`, example env, SQLite volume and network, secret checks | `docker compose config` succeeds with local private env |
| **D2 — API image/init** | 40–60 min | Backend skeleton/migration interface | Build PHP server image, PDO SQLite, `/data`, entrypoint migration+seed, API health | Fresh API container healthy with seeded DB |
| **D3 — Web image & proxy integration** | 30–45 min | Frontend scaffold/proxy interface + D1 | Multi-stage standalone image, runtime internal URL, port, frontend health; cookie proxy verification with Frontend | Web build boots; API health through `:3000` |
| **D4 — Integration/security verification** | 40–60 min | Backend auth/order + Frontend client ready | Session/CSRF, multipart, origin, receipt, restart persistence, inspect logs/bundle | I-04 through I-12 smoke checks evidenced |
| **D5 — Clean-room handoff** | 20–35 min | QA scripts + D4 | Clean clone/volume rebuild, instructions, decision notes, final handoff | One-command reproducibility and no P0 infra blockers |

Budgets are estimates **within** the weekend schedule, not sequential elapsed time in addition to other agents' budgets. Start D1 immediately after Phase-1 freeze. D2 can run alongside Backend product work once the migration/CLI interface exists; D3 can run alongside Frontend feature work once the skeleton/proxy exists. D4 waits for real endpoints. Do not stall on optional CI/hot reload while required checkout or admin journeys are blocked.

### Parallel collaboration and ownership lock

- **To Backend:** request PHP/Symfony and Composer versions, required extensions, migration command, exact `DATABASE_URL` format, seed command, session storage path, ready/health path. Provide API image URL, port, volume path, secret env names; test actual initialization in container. Backend alone repairs migrations/seed/auth logic.
- **To Frontend:** request Node/package manager/lockfile, standalone output, proxy route implementation and server-only env names. Provide `API_INTERNAL_URL`, exposed public port and container runtime command. Frontend alone repairs proxy code or Next config; DevOps tests the HTTP handoff.
- **To QA:** provide documented setup, tested commands, service health evidence, seed counts, privacy-safe browser smoke results and known limitations. QA owns README publication and test scripts.
- **To Orchestrator:** raise any API, schema, origin, cookie or runtime contract change **before** merging. Work on DevOps branch/worktree; avoid concurrent Dockerfile edits by app agents. No task is DONE based solely on successful image build.

## 11. Failure and escalation playbook

1. **API healthy without SQLite:** block release; backend fixes DB health route or startup path; no always-success probes.
2. **Web runs but `/api/v1/*` fails:** verify `api` DNS/service health, runtime `API_INTERNAL_URL`, path preservation, server proxy production mode; have Frontend fix route logic.
3. **Auth works direct but not proxied:** inspect `Set-Cookie`/`Cookie`/`Origin`/`X-CSRF-Token` handling; fix host-only cookie configuration and proxy forwarding without relaxing CSRF.
4. **Seed duplicates or resets stock:** halt restart tests; Backend repairs idempotent importer before release.
5. **SQLite permission or lock errors:** inspect ownership/mount permissions and Backend transaction settings; do not chmod 777 or migrate to PostgreSQL for convenience.
6. **Secrets embedded in images or JS:** block release; rotate exposed values, remove source/build exposure and rebuild. Never dump secrets into debugging output.
7. **Running behind schedule:** skip optional CI refinements, hot reload and optimizations; prioritize first-boot Compose, seed, full public and admin flows, data persistence and accurate README. Do not delete mandatory controls or lie about checks.

## 12. Final DevOps handoff template

```text
Task(s): D0–D5
Branch / commit(s):
Changed files (owned paths only):
Pinned versions / image runtime:
Public entry point: http://localhost:3000
Internal API: http://api:8000
Docker up command:
Required environment variable NAMES (never values):
Migration / seed commands:
Actual initial seed summary (inserted/skipped/rejected):
Verified acceptance IDs (I-01...I-15) + commands/outcomes:
Cookie + CSRF + import + checkout proxy findings:
Persistence/restart result:
Known limitations and unrun checks:
Blocked decisions / requests to orchestrator:
QA/README instructions handed off:
```

## 13. DevOps definition of done

- [ ] Both independent production-build containers start with `docker compose up --build -d` from a clean checkout once `.env` secrets are prepared.
- [ ] One publicly mapped local web port; internal-only API; same-origin API proxy is tested.
- [ ] SQLite volume persists migrations, products, stock and orders through restart and rebuild.
- [ ] Startup migrates and seeds from unaltered attached CSV; repeat startup/seed never duplicates or restores stock.
- [ ] Admin session cookie, login CSRF rotation, Origin check and multipart CSV work through Next.js.
- [ ] Real checkout, retry key and protected receipt work through the proxy (not merely direct API).
- [ ] Secrets absent from source, images, client bundles and logs; local HTTP limitation documented.
- [ ] Health checks reflect real readiness and missing dependencies; failed startup is visible.
- [ ] Backend/frontend runtime versions, env names, Docker commands and limitations handed to QA for README.
- [ ] Clean-room checks are recorded with honest pass/fail/not-run status; no P0 infrastructure blockers remain.

**Stop condition:** When P0 requirements pass, freeze infrastructure. Document hardening improvements as follow-ups rather than spending remaining weekend time on nonessential deployment complexity.
