# Acceptance and contract evidence map

Contract baseline: `docs/04-API.md` frozen at `3532803` on 2026-10-15. Every case below is **NOT VERIFIED** until an observed result is linked in [verification.md](verification.md). A mapped test is a plan, not proof. Use a disposable Compose project and redacted evidence for mutations or receipt checks.

## Product acceptance (AC-01–AC-21)

| ID | Evidence to obtain | Method / related contract | Status |
|---|---|---|---|
| AC-01 | Clean Compose start, web page, proxied DB-aware health | Cold start + smoke `health`; C-01 | NOT VERIFIED |
| AC-02 | Original CSV seed report, valid catalog rows, row reasons | Seed stdout + list/DB; C-02 | NOT VERIFIED |
| AC-03 | Repeat seed inserts zero and preserves edited stock/price | Before/after DB counts and sample; C-02 | NOT VERIFIED |
| AC-04 | Admin UI create appears in public catalog | Manual E2E-02 + POST/list; C-06 | NOT VERIFIED |
| AC-05 | Admin edits name/price/stock; refresh matches API | Manual E2E-02 + PATCH/GET; C-06 | NOT VERIFIED |
| AC-06 | Duplicate SKU and bad fields return 409/422; no write | Backend integration + API response/DB; C-07 | NOT VERIFIED |
| AC-07 | Soft delete hides product but preserves order snapshot | DELETE/public 404 + DB receipt; C-06 | NOT VERIFIED |
| AC-08 | Anonymous mutation/import denied; CSRF/Origin protected | Auth integration/API; C-04, C-05 | NOT VERIFIED |
| AC-09 | Mixed-case name/SKU search and category filter | API query + manual E2E-01; C-03 | NOT VERIFIED |
| AC-10 | Unknown query empty state; stable pages; bad query 400 | API + manual E2E-01; C-03 | NOT VERIFIED |
| AC-11 | UI uploads dirty CSV, shows row counts and reasons | Manual E2E-02 + import report; C-08 | NOT VERIFIED |
| AC-12 | Second upload creates no duplicate or overwrite | Two reports + DB counts; C-08 | NOT VERIFIED |
| AC-13 | Add/change/remove cart, reload, correct subtotal | Manual E2E-01; C-09 | NOT VERIFIED |
| AC-14 | In-stock checkout yields one paid order and price snapshots | API/DB + manual E2E-01; C-10 | NOT VERIFIED |
| AC-15 | Stock delta equals bought quantity once | Before/after API/DB; C-10 | NOT VERIFIED |
| AC-16 | Same key/body 200 replay, changed body 409, no second deduction | Backend/API order and stock checks; C-11 | NOT VERIFIED |
| AC-17 | Oversell 409, no paid order/negative stock, cart retained | API/DB + manual E2E-03; C-12 | NOT VERIFIED |
| AC-18 | Two last-unit buyers: at most one paid | Two-connection SQLite integration test; C-13 | NOT VERIFIED |
| AC-19 | Receipt token protection, reload, Docker restart persistence | API token variants + restart; C-14, C-15 | NOT VERIFIED |
| AC-20 | Storefront/admin at 375px and 1440px, labels/feedback | Manual browser E2E-01/02 + usability review; C-16 | NOT VERIFIED |
| AC-21 | README-only fresh setup and advertised tests | Isolated cold-start transcript; C-16 | NOT VERIFIED |

## API contract checks (C-01–C-16)

| ID | Assertion and evidence method | Status |
|---|---|---|
| C-01 | Proxied `GET /api/v1/health` 200 with `status=ok`, `database=ok`; smoke script | NOT VERIFIED |
| C-02 | CLI seed twice: first valid inserts/row issues, second zero inserts and unchanged values | NOT VERIFIED |
| C-03 | Public list/detail/categories envelopes, case-insensitive search, filter, stable pagination and 400 bad query; smoke + integration | NOT VERIFIED |
| C-04 | Anonymous `POST /products` and import receive 401 with standard error envelope | NOT VERIFIED |
| C-05 | Missing/bad login CSRF and wrong Origin receive 403; no authenticated session | NOT VERIFIED |
| C-06 | Authenticated create 201, patch 200, delete 204; public visibility follows soft delete | NOT VERIFIED |
| C-07 | Duplicate normalized SKU 409; invalid price/stock/weight 422; no partial writes | NOT VERIFIED |
| C-08 | Multipart original CSV twice: counts invariant, issues, no duplicates/overwrite | NOT VERIFIED |
| C-09 | Browser cart quantities survive refresh; checkout ignores client price | NOT VERIFIED |
| C-10 | UUID-v4 keyed order 201 paid; server totals/snapshots and one stock decrement | NOT VERIFIED |
| C-11 | Identical retry 200 same receipt; altered payload 409; no second order/deduction | NOT VERIFIED |
| C-12 | Excess quantity/inactive product 409 with rollback | NOT VERIFIED |
| C-13 | Concurrent last-unit attempts: at most one 201, stock nonnegative | NOT VERIFIED |
| C-14 | Receipt missing/malformed token 400, wrong valid token 404, correct 200, no token in GET body | NOT VERIFIED |
| C-15 | Stop/start without volume removal retains catalog, stock, order and receipt access | NOT VERIFIED |
| C-16 | Mobile/desktop browser journeys and README-only clean install pass | NOT VERIFIED |

## Recording rule

For each run, add exact command/steps, exit/status, expected and observed result, timestamp/timezone, environment, and a redacted evidence reference to `verification.md`. Manual checks also name browser and viewport. Do not promote a row to PASS based on source inspection alone. Any failed P0 check gets a defect entry and owner handoff.
