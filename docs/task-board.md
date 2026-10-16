# E-Commerce MVP task board

Updated 2026-10-15. Statuses: BACKLOG, READY, IN_PROGRESS, REVIEW, DONE, BLOCKED. The frozen shared contracts are `02-ARCHITECTURE.md` and `04-API.md`; see `decisions.md`. Source assets confirmed: `data/products.csv` (97 data records by specification) and `docs/reference/landing-page.png`. The codebase is not implemented yet.

| ID | Phase | Owner | Priority | Depends on | Gate | Status | Commit |
|---|---:|---|---|---|---|---|---|
| ARCH-01 | 1 | Orchestrator | P0 | — | A | DONE | board introduction commit |
| BE-01 | 2 | Backend | P0 | ARCH-01 | B | REVIEW | `8e25cab` |
| FE-01 | 2 | Frontend | P0 | ARCH-01 | B | IN_PROGRESS | — |
| INF-01 | 2 | DevOps | P0 | ARCH-01, BE-01, FE-01 runtime review | B | REVIEW | `f009cac`, `3e4d285` |
| QA-01 | 1–2 | QA/Docs | P0 | ARCH-01 | A, B | READY | — |
| BE-02a | 3 | Backend | P0 | BE-01 | C | IN_PROGRESS | — |
| BE-02b | 3 | Backend | P0 | BE-02a | C | BACKLOG | — |
| BE-02c | 3 | Backend | P0 | BE-02b | C | BACKLOG | — |
| BE-02d | 3 | Backend | P0 | BE-02c | C | BACKLOG | — |
| FE-02 | 3–4 | Frontend | P0 | FE-01, BE-02a–d API | D | BACKLOG | — |
| INF-02 | 3–5 | DevOps | P0 | INF-01, BE-02a–d, FE-02 | B, E | BACKLOG | — |
| QA-02 | 3–5 | QA/Docs | P0 | BE-02a–d, FE-02, INF-01 | C–E | BACKLOG | — |
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
- **FE-02:** product detail, cart, checkout/receipt, admin CRUD/import in `apps/web/**`; verify AC-04–20 using real API. Split by journey once FE-01 lands.
- **INF-02:** integrate runtime, reliable startup/restart, persistent storage and security header/proxy behavior; verify infrastructure I-01–I-15.
- **QA-02:** smoke, contract, browser, adverse checkout and restart checks; maintain `docs/qa/verification.md` and defects with real outcomes.
- **QA-03:** complete README, isolated cold-start test and GO/NO-GO release report.

## Current blockers and gate notes

- Gate A: contract freeze committed in `3532803`; QA acceptance mapping is in progress.
- Gate B: Docker Compose static configuration and startup script syntax passed in INF-01. Docker build/start, proxied health and persistence are **NOT VERIFIED** because the host Docker daemon is unavailable. The API image also requires `apps/api/composer.lock`, which cannot yet be generated without PHP/Composer or a working container and package network. Backend seed command is still pending.
- BE-01: migration SQL executed with Python SQLite and rejected invalid constraints; Composer, PHPUnit, Symfony HTTP and migration command remain **NOT VERIFIED** in this host.
