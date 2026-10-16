# E-Commerce MVP task board

Updated 2026-10-16. Statuses: BACKLOG, READY, IN_PROGRESS, REVIEW, DONE, BLOCKED. The shared contracts are `02-ARCHITECTURE.md` and `04-API.md`; see `decisions.md`. Source assets: `data/products.csv` (97 data records) and `docs/reference/landing-page.png`. The original MVP passed Gates A–F; the approved remote product image extension passed QA-04 checks.

| ID | Phase | Owner | Priority | Depends on | Gate | Status | Commit |
|---|---:|---|---|---|---|---|---|
| ARCH-01 | 1 | Orchestrator | P0 | — | A | DONE | board introduction commit |
| BE-01 | 2 | Backend | P0 | ARCH-01 | B | DONE | `8e25cab` |
| FE-01 | 2 | Frontend | P0 | ARCH-01 | B | DONE | `7923f45` |
| INF-01 | 2 | DevOps | P0 | ARCH-01, BE-01, FE-01 runtime review | B | DONE | `f009cac`, `3e4d285` |
| QA-01 | 1–2 | QA/Docs | P0 | ARCH-01 | A, B | DONE | `940c5df` |
| BE-02a | 3 | Backend | P0 | BE-01 | C | DONE | `60db5f4` |
| BE-02b | 3 | Backend | P0 | BE-02a | C | DONE | `f58e45c` |
| BE-02c | 3 | Backend | P0 | BE-02b | C | DONE | `0a0729d` |
| BE-02d | 3 | Backend | P0 | BE-02c | C | DONE | `03099ff` |
| FE-02a | 3–4 | Frontend | P0 | FE-01, BE-02d contract | D | DONE | `2cfc2d4` |
| FE-02b | 4 | Frontend | P0 | FE-01, BE-02a–c contract | D | DONE | `f73ade2` |
| FE-03 | 5 | Frontend | P1 | FE-02b | E | DONE | `8f7b6f8` |
| INF-02 | 3–5 | DevOps | P0 | INF-01, BE-02a–d, FE-02a–b | B, E | DONE | `e8933c6` |
| QA-02a | 3 | QA/Docs | P0 | BE-01, FE-01, INF-01 | C, D | DONE | `448795f` |
| QA-02b | 4–5 | QA/Docs | P0 | BE-02a–d, FE-02a–b, INF-01 | C–E | DONE | `9c7ca76` |
| QA-03 | 6 | QA/Docs | P0 | QA-02, INF-02 | F | DONE | `87c4b54` |
| IMG-01 | Extension | Image research | P0 | Image contract | Image coverage | DONE | `3933a53` |
| BE-03 | Extension | Backend | P0 | Image contract | API/database | DONE | `0dff0f5` |
| FE-04 | Extension | Frontend | P0 | Image contract | Browser | DONE | `28e36a9` |
| INF-03 | Extension | DevOps | P0 | IMG-01, BE-03 | Runtime | DONE | `7a944ce` |
| QA-04 | Extension | QA/Docs | P0 | IMG-01, BE-03, FE-04, INF-03 | Delivery | DONE | QA-04 verification commit |

## Remote image extension assignments

- **IMG-01:** Search Wikimedia Commons for a representative free-license photo for each of the 85 valid seeded SKUs. Commit `data/product-images.json` with direct HTTPS thumbnail URL, source page, creator credit, license name and license URL. Reject unusable or misleading matches. No image bytes. Validate coverage, URLs, and licenses.
- **BE-03:** Add nullable image columns in a forward migration, read fields in Product DTOs, and implement an idempotent SKU catalog enrichment command. Leave existing CSV schema and admin writes unchanged. Test old-volume migration, new-volume seed, repeat enrichment, and null fallback.
- **FE-04:** Show remote product images in cards and detail views with text alternatives, visible source/credit/license on detail, and graceful missing/broken-image fallbacks. Consume the amended Product DTO; keep existing cart and admin flows working.
- **INF-03:** Copy the curated JSON into the API image and run enrichment after migrate and CSV seed on startup. Verify both existing and fresh SQLite volumes.
- **QA-04:** Verify 85/85 seeded image URLs in the database/API, sample visual relevance and loading, attribution display, broken-image fallback, clean startup, README and memory accuracy.

## Original assignments

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

## Implemented follow-on slices

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

## Final gate report

- **Gate A — PASS:** frozen schema/API contracts and P0 acceptance map were committed before feature work.
- **Gate B — PASS:** fresh clone and separate Compose project built two healthy services, migrated SQLite, seeded 85 valid products, and published only loopback web.
- **Gate C — PASS:** PHPUnit 17 tests/89 assertions; public/admin/checkout HTTP smokes passed, including race, validation, import, replay and stock behavior.
- **Gate D — PASS:** browser storefront search/cart/paid receipt and admin sign-in/create/edit/deactivate/import ran against the real API at desktop and mobile widths.
- **Gate E — PASS:** 5/5 public, 21/21 admin and 7/7 extended checkout smoke checks passed; fake order/receipt and decremented stock survived container restart; edge cases and browser stock warning passed.
- **Gate F — PASS:** README setup, build and test commands ran from a fresh Git clone with a new named SQLite volume. The exact commands and results are in `docs/qa/verification.md`.

The only documented functional limitation is SQLite Unicode case folding for accented search (QA-004, P1). `npm audit --omit=dev` found zero production vulnerabilities after FE-03; five high advisories remain in development-only ESLint dependencies. No P0 defect remains open.

## Homepage redesign (2026-10-16)

The incremental redesign contract is frozen in `docs/redesign/DECISIONS.md`. Existing commerce gates remain in force.

| ID | Owner | Scope | Depends on | Status | Commit |
|---|---|---|---|---|---|
| RD-00 | Orchestrator | Baseline, component/data/motion contract | Redesign plan | DONE | `c47f9db` |
| RD-01 | Navigation agent | Shared header and accessible mobile menu | RD-00 | DONE | `51f7150` (shared commit with RD-03) |
| RD-02 | Hero agent | Editorial hero and responsive motion | RD-00 | DONE | `78c2b8f` |
| RD-03 | Sections agent | Live collections, featured products, brand story | RD-00, RD-04 interface | DONE | `51f7150`, `df12933` |
| RD-04 | Motion/QA agent | Reveal primitive, reduced-motion review, QA matrix | RD-00 | DONE | `99285ae`; final results in `docs/qa/home-redesign.md` |
| RD-05 | Orchestrator | Page composition, theme integration, runtime and browser sign-off | RD-01–04 | DONE | `1bf3de0`, `8e30ec9`; final results in `docs/qa/home-redesign.md` |
