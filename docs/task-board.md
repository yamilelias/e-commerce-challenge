# E-Commerce MVP task board

Updated 2026-10-15. Statuses: BACKLOG, READY, IN_PROGRESS, REVIEW, DONE, BLOCKED. The frozen shared contracts are `02-ARCHITECTURE.md` and `04-API.md`; see `decisions.md`. Source assets confirmed: `data/products.csv` (97 data records by specification) and `docs/reference/landing-page.png`. The codebase is not implemented yet.

| ID | Phase | Owner | Priority | Depends on | Gate | Status | Commit |
|---|---:|---|---|---|---|---|---|
| ARCH-01 | 1 | Orchestrator | P0 | — | A | DONE | board introduction commit |
| BE-01 | 2 | Backend | P0 | ARCH-01 | B | REVIEW | `8e25cab` |
| FE-01 | 2 | Frontend | P0 | ARCH-01 | B | REVIEW | `7923f45` |
| INF-01 | 2 | DevOps | P0 | ARCH-01, BE-01, FE-01 runtime review | B | REVIEW | `f009cac`, `3e4d285` |
| QA-01 | 1–2 | QA/Docs | P0 | ARCH-01 | A, B | REVIEW | `940c5df` |
| BE-02a | 3 | Backend | P0 | BE-01 | C | REVIEW | `60db5f4` |
| BE-02b | 3 | Backend | P0 | BE-02a | C | REVIEW | `f58e45c` |
| BE-02c | 3 | Backend | P0 | BE-02b | C | REVIEW | `0a0729d` |
| BE-02d | 3 | Backend | P0 | BE-02c | C | REVIEW | `03099ff` |
| FE-02a | 3–4 | Frontend | P0 | FE-01, BE-02d contract | D | REVIEW | `2cfc2d4` |
| FE-02b | 4 | Frontend | P0 | FE-01, BE-02a–c contract | D | REVIEW | `f73ade2` |
| INF-02 | 3–5 | DevOps | P0 | INF-01, BE-02a–d, FE-02a–b | B, E | REVIEW | `e8933c6` |
| QA-02a | 3 | QA/Docs | P0 | BE-01, FE-01, INF-01 | C, D | REVIEW | `448795f` |
| QA-02b | 4–5 | QA/Docs | P0 | BE-02a–d, FE-02a–b, INF-01 | C–E | REVIEW | `9c7ca76` |
| QA-03 | 6 | QA/Docs | P0 | QA-02, INF-02 | F | BACKLOG | — |

## Ready assignments

### ARCH-01 — Freeze initial contracts

- Objective: Confirm supplied assets and approve one schema/API contract.
- Owned paths: `docs/02-ARCHITECTURE.md`, `docs/04-API.md`, `docs/decisions.md`, `docs/task-board.md`, matching memory records.
- Acceptance: source assets exist; schema and API status explicitly frozen; cross-role ownership/dependencies recorded.
- Validation: `test -f data/products.csv && test -f docs/reference/landing-page.png`; inspect `git diff --check` and commit.

### BE-01 — Backend foundation and health

- Objective: Scaffold real Symfony/PHP/Doctrine API with SQLite migration and DB-aware `/api/v1/health`; establish test runner.
- Owned paths: `apps/api/**` except `Dockerfile`, `memory/structure/backend.md` and matching decision records.
- References: `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `03-BACKEND.md`, frozen `04-API.md`.
- Acceptance: dependency lockfile, console, migration for frozen tables/constraints, health route, executable tests; coordinate runtime requirements with DevOps. Do not silently alter schema/API.
- Validation: real Composer/Symfony commands and test result; if host PHP unavailable, validate in Docker when available and mark missing checks NOT VERIFIED.
- Output: scoped commit hash, paths, actual commands/results, limitations, schema review, next dependency.

### FE-01 — Frontend foundation and catalog slice

- Objective: Scaffold Next.js/React/TypeScript/Tailwind/daisyUI with pinned lockfile; build same-origin API proxy and responsive product-list/catalog shell against frozen DTOs.
- Owned paths: `apps/web/**` except `Dockerfile`, `memory/structure/frontend.md` and matching decision records.
- References: `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`, landing-page reference.
- Acceptance: proxy preserves relevant methods, cookies and multipart semantics; catalog reads real API and has loading/empty/error states; no permanent mock products; coordinate build runtime with DevOps.
- Validation: `npm run build` and available lint/tests; manually inspect at desktop/mobile when runtime permits.
- Output: scoped commit hash, paths, actual commands/results, UI evidence/limitations, next dependency.

### INF-01 — Two-container Compose foundation

- Objective: Add separate API and web Dockerfiles, Compose, persistent SQLite volume, safe environment example, boot migration/seed behavior and health checks.
- Owned paths: `compose.yaml`, `infra/**`, `.env.example`, `Makefile` if useful, `apps/api/Dockerfile`, `apps/web/Dockerfile`, matching infrastructure memory.
- References: `02-ARCHITECTURE.md`, `04-API.md`, `06-INFRASTRUCTURE.md`; obtain actual runtime requirements from app owners.
- Acceptance: documented env requirements, stable secrets, seed fixture at `/app/data/products.csv`, DB volume `/data`, browser only reaches web; no host PHP/Node required for Compose flow.
- Validation: `docker compose config`, `docker compose up --build -d`, proxied health and persistence where Docker runtime permits; record actual failures otherwise.
- Output: scoped commit hash, paths, actual commands/results, risks, next dependency.

### QA-01 — Contract matrix and smoke foundation

- Objective: Map AC-01–AC-21 and C-01–C-16 to executable or manual evidence, and create a minimal smoke script once routes boot.
- Owned paths: `README.md`, `docs/qa/**`, `scripts/smoke/**`, QA memory records.
- References: `01-PRODUCT.md`, `04-API.md`, `07-QUALITY.md`.
- Acceptance: every P0 AC mapped; report NOT VERIFIED until run; script uses real route/status contract and does not leak secrets.
- Validation: run available script syntax/checks; report actual results.
- Output: scoped commit hash, paths, commands/results, next dependency.

## Planned follow-on slices

- **BE-02a:** Product CRUD/search/categories, exact envelopes and validation in `apps/api/**`; verify public C-03 and create/edit/delete C-06–07, with authentication guard added in BE-02b before accepting writes.
- **BE-02b:** Admin session, login/logout, CSRF/Origin guards in `apps/api/**`; verify C-04–07 and no anonymous mutation.
- **BE-02c:** Shared CSV importer, admin multipart endpoint and idempotent CLI seed in `apps/api/**`; verify C-02/C-08 including malformed rows and repeat runs.
- **BE-02d:** Atomic checkout, snapshots, idempotency and protected receipt in `apps/api/**`; verify C-10–15 including stock race and replay.
- **FE-02a:** Product detail, persistent cart, checkout and receipt in `apps/web/**`; verify AC-03, AC-13–19. Use server total, stable idempotency key and token URL; retain cart on ambiguous failure. Run typecheck/lint/build and targeted behavior checks.
- **FE-02b:** Admin login/logout, CRUD and import screens in `apps/web/**`; verify AC-04–08 and AC-11–12 using real API, including CSRF and row issue display. Run typecheck/lint/build and targeted behavior checks.
- **INF-02:** integrate runtime, reliable startup/restart, persistent storage and security header/proxy behavior; verify infrastructure I-01–I-15.
- **QA-02a:** Focused static contract review of committed slices; record reproducible defects in `docs/qa/defects.md`, smoke script updates and real static evidence. Runtime remains NOT VERIFIED until stack runs.
- **QA-02b:** HTTP smoke, contract, browser, adverse checkout and restart checks; maintain `docs/qa/verification.md` and defects with real outcomes.
- **QA-03:** complete README, isolated cold-start test and GO/NO-GO release report.

## Current blockers and gate notes

- Gate A: contract freeze committed in `3532803`; QA acceptance mapping is in progress.
- Gate B: Docker Compose static configuration and startup script syntax passed in INF-01. The Docker daemon became available later (`docker version` reported server 29.0.1), and image/runtime verification is now queued. The API image still requires `apps/api/composer.lock` and the backend seed command.
- BE-01: migration SQL executed with Python SQLite and rejected invalid constraints; Composer, PHPUnit, Symfony HTTP and migration command remain **NOT VERIFIED** in this host.
- FE-01: npm install, typecheck, lint and build passed; proxy fixture confirmed query/cookie/CSRF/idempotency/multipart forwarding. Live API and browser visual checks remain **NOT VERIFIED**.
- QA-01: AC-01–21 and C-01–16 mapped; Python smoke script syntax passed, but 0/4 HTTP checks ran because local HTTP access was denied and no stack was available.
- QA-02a: static defects `QA-001` (missing Composer lock), `QA-002` (missing seed command), and `QA-003` (proxy `Location` response header) recorded in `docs/qa/defects.md`; no runtime checks passed.
- FE-02a: typecheck/lint/build and targeted cart/retry/proxy assertions passed. Product detail, cart, checkout and receipt are committed; live seeded purchase remains **NOT VERIFIED**. The proxy `Location` forwarding fix awaits QA retest.
- BE-02b: Composer lockfile, admin session/CSRF and product write endpoints committed. Docker PHPUnit passed 9 tests/33 assertions; `docker compose --env-file .env.example build api` exited 0. API startup still waits on BE-02c seed command.
- FE-02b: admin login, CRUD and CSV import UI committed; typecheck/lint/build and targeted auth/multipart/proxy checks passed. Live admin journeys remain **NOT VERIFIED** pending BE-02c and Compose boot.
- BE-02c: shared importer, protected upload and seed command committed. Disposable SQLite migration + seed accepted 85, skipped 5 and rejected 7 rows; repeat inserted 0. PHP lint and PHPUnit 12 tests/46 assertions passed. Isolated Compose boot is in progress.
- INF-02: isolated `ecommerce-inf02` Compose build/start exited 0 with both services healthy and proxied DB-aware health 200. Migration applied; 85 products persisted across `down`/`up -d`; repeat seed inserted 0. Runtime fixes committed `e8933c6`.
- BE-02d: atomic checkout/receipt committed; PHP lint and PHPUnit 17 tests/89 assertions passed, including a two-process last-stock race. Live proxy checkout retest is pending the rebuilt isolated stack.
