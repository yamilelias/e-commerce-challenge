# Acceptance and contract evidence map

Contract baseline: `docs/04-API.md` frozen at `3532803` on 2026-10-15. PASS rows have observed results in [verification.md](verification.md); other rows remain open. Use a disposable Compose project and redacted evidence for mutations or receipt checks.

## Product acceptance (AC-01–AC-21)

| ID | Evidence to obtain | Method / related contract | Status |
|---|---|---|---|
| AC-01 | Clean Compose start, web page, proxied DB-aware health | Isolated DevOps boot + QA public smoke; C-01 | PASS — isolated stack |
| AC-02 | Original CSV seed report, valid catalog rows, row reasons | Seed stdout + list/DB; C-02 | PASS |
| AC-03 | Repeat seed inserts zero and preserves edited stock/price | Repeat seed and persisted purchase stock; C-02 | PASS |
| AC-04 | Admin UI create appears in public catalog | Browser create + admin list/public search; C-06 | PASS |
| AC-05 | Admin edits name/price/stock; refresh matches API | Browser edit + list; C-06 | PASS |
| AC-06 | Duplicate SKU and bad fields return 409/422; no write | Admin smoke + backend tests; C-07 | PASS |
| AC-07 | Soft delete hides product but preserves order snapshot | Browser delete/public 404 + paid receipt; C-06 | PASS |
| AC-08 | Anonymous mutation/import denied; CSRF/Origin protected | QA admin smoke 17/17; C-04, C-05 | PASS — API/proxy |
| AC-09 | Mixed-case name/SKU search and category filter | API query + browser search; C-03 | PASS |
| AC-10 | Unknown query empty state; stable pages; bad query 400 | Public smoke; C-03 | PASS — API |
| AC-11 | UI uploads dirty CSV, shows row counts and reasons | Browser import report; C-08 | PASS |
| AC-12 | Second upload creates no duplicate or overwrite | Two browser reports + API and seed checks; C-08 | PASS |
| AC-13 | Add/change/remove cart, reload, correct subtotal | Chrome manual cart at localhost:3300; C-09 | PASS — browser |
| AC-14 | In-stock checkout yields one paid order and price snapshots | API smoke + paid browser flow; C-10 | PASS |
| AC-15 | Stock delta equals bought quantity once | API smoke and restart check; C-10 | PASS |
| AC-16 | Same key/body 200 replay, changed body 409, no second deduction | Checkout smoke; C-11 | PASS |
| AC-17 | Oversell 409, no paid order/negative stock, cart retained | API rollback + browser stock warning/cart; C-12 | PASS |
| AC-18 | Two last-unit buyers: at most one paid | Two-process SQLite integration test; C-13 | PASS — backend test |
| AC-19 | Receipt token protection, reload, Docker restart persistence | API token variants + restart; C-14, C-15 | PASS |
| AC-20 | Storefront/admin at 375px and 1440px, labels/feedback | Manual browser viewports; C-16 | PASS — layout |
| AC-21 | README-only fresh setup and advertised tests | Fresh Git clone and separate volume; C-16 | PASS |

## API contract checks (C-01–C-16)

| ID | Assertion and evidence method | Status |
|---|---|---|
| C-01 | Proxied `GET /api/v1/health` 200 with `status=ok`, `database=ok`; smoke script | PASS |
| C-02 | CLI seed twice: first valid inserts/row issues, second zero inserts and unchanged values | PASS |
| C-03 | Public list/detail/categories envelopes, case-insensitive search, filter, stable pagination and 400 bad query; smoke + integration | PASS |
| C-04 | Anonymous `POST /products` and import receive 401 with standard error envelope | PASS |
| C-05 | Missing/bad login CSRF and wrong Origin receive 403; no authenticated session | PASS |
| C-06 | Authenticated create 201, patch 200, delete 204; public visibility follows soft delete | PASS |
| C-07 | Duplicate normalized SKU 409; invalid price/stock/weight 422; no partial writes | PASS |
| C-08 | Multipart original CSV twice: counts invariant, issues, no duplicates/overwrite | PASS |
| C-09 | Browser cart quantities survive refresh; checkout rejects client price | PASS |
| C-10 | UUID-v4 keyed order 201 paid; server totals/snapshots and one stock decrement | PASS |
| C-11 | Identical retry 200 same receipt; altered payload 409; no second order/deduction | PASS |
| C-12 | Excess quantity/inactive product 409 with rollback | PASS |
| C-13 | Concurrent last-unit attempts: at most one 201, stock nonnegative | PASS — backend test |
| C-14 | Receipt missing/malformed token 400, wrong valid token 404, correct 200, no token in GET body | PASS |
| C-15 | Stop/start without volume removal retains catalog, stock, order and receipt access | PASS |
| C-16 | Mobile/desktop browser journeys and README-only clean install pass | PASS |

## Recording rule

For each run, add exact command/steps, exit/status, expected and observed result, timestamp/timezone, environment, and a redacted evidence reference to `verification.md`. Manual checks also name browser and viewport. Do not promote a row to PASS based on source inspection alone. Any failed P0 check gets a defect entry and owner handoff.

## Remote image extension (IMG-01, BE-03, FE-04, INF-03, QA-04)

| ID | Evidence to obtain | Status |
|---|---|---|
| IMG-A | Every valid seeded SKU has a catalog entry with a direct HTTPS thumbnail, Commons source, creator credit, license, and license link; spot-check relevance and URL responses | PASS — 85 local entries; 4 Chrome image loads/relevance samples |
| IMG-B | Existing-volume migration and fresh-volume startup enrich 85 seeded products; API list/detail return matching non-null metadata | PASS — DevOps startup/DB and QA HTTP checks |
| IMG-C | Repeated enrichment leaves existing image URLs unchanged; products without entries retain null fields and display a fallback | PASS — repeat command, backend null-path test, Chrome broken-image fallback |
| IMG-D | Desktop/mobile storefront displays remote photos, source/creator/license on detail, and a fallback for broken URLs | PASS — Chrome desktop/mobile samples |
