# 07 — Quality Assurance, Acceptance & Delivery (QA + Documentation Agent)

**Project:** Weekend E-Commerce MVP  
**Owner:** QA & Documentation Agent  
**Accountable reviewer:** Orchestrator / Tech Lead  
**Status:** Implementation-ready; test results must be filled with real execution evidence  
**Target:** ~16 elapsed hours total project execution, ~2 hours reserved stabilization, hard weekend cap ~20 hours  
**Authority:** `00-ORCHESTRATOR.md` through `06-INFRASTRUCTURE.md`. In case of an HTTP or DTO disagreement, `04-API.md` is authoritative; never change contracts without orchestrator approval.

> **Mission:** Prove that every required workflow operates through real Next.js and Symfony code in Docker using persistent SQLite; document the exact steps an evaluator can reproduce. Favor high-value tests over comprehensive frameworks. Never report a test as passing unless it was actually executed.

## 1. Non-negotiable delivery rules

1. Ship *all P0* from `01-PRODUCT.md`: product CRUD UI/API, dirty CSV import UI and repeatable seed, public search, functional cart and fake purchase, responsive storefront, protected admin, two Docker containers, persistent SQLite, and README.
2. Verify real requests through the **browser-facing** `http://localhost:3000/api/v1/*` proxy; direct Symfony endpoint checks are additional diagnostic tests, not a substitute for browser integration.
3. Respect the frozen `04-API.md`: snake_case JSON; `{data:...}` and error envelopes; server-calculated `price_cents`; session + CSRF; `Idempotency-Key` UUID v4; single `POST /orders` checkout; capability-protected order receipt. No invented `/pay` endpoint.
4. Focus on correctness-critical paths: stock never negative, replay never creates a second order or deduction, invalid imports never corrupt products, anonymous admin changes denied, receipt unreadable without valid token.
5. Preserve original CSV unchanged in `data/products.csv`; do not silently fix source rows or assert a precise number of accepted rows without verified execution.
6. Keep tests deterministic, isolated, inexpensive, and runnable without external SaaS services. For browser automation, one Chromium project is enough. Tests that cannot run must be explicitly listed as **NOT RUN** with reason.
7. QA does **not** alter feature code except by a delegated, narrowly scoped bug-fix assignment from Orchestrator. Product owners retain implementation responsibility.

## 2. Source hierarchy and coverage map

| Source | Purpose | QA action |
|---|---|---|
| `00-ORCHESTRATOR.md` | Phases, delivery gates, branches, time budget | Publish evidence and block release for P0 failures |
| `01-PRODUCT.md` | User journeys J1–J5; AC-01–AC-21 | Maintain traceability table and execution status |
| `02-ARCHITECTURE.md` | Schema, stock/transaction invariants | Validate DB persistence and integrity behavior |
| `04-API.md` | Endpoint and error contract; C-01–C-16 | Write/execute HTTP contract checks; no API drift |
| `03-BACKEND.md` | Symfony responsibilities | Review backend tests and request missing edge-case coverage |
| `05-FRONTEND.md` | Browser screens and security behavior | Verify storefront/admin/cart/checkout usability |
| `06-INFRASTRUCTURE.md` | I-01–I-15 Docker acceptance | Execute clean-room setup with DevOps evidence |

**QA-owned evidence artifacts** (create as work advances):

- `docs/qa/acceptance-matrix.md` — one row per AC, proof, status, owner, defect.
- `docs/qa/test-results.md` — actual commands, environment, timestamps, exits, links to artifacts.
- `docs/qa/infrastructure-results.md` — I-01–I-15 evidence and persistence findings.
- `docs/qa/release-report.md` — final go/no-go, unresolved issues and explicit sign-offs.
- `docs/qa/defects.md` — concise prioritized defect log (or same metadata in task board).
- `scripts/smoke/` — executable HTTP and/or shell smoke scripts.
- `tests/e2e/` — **optional path** for a tiny Playwright suite; agree dependency/lockfile owner first.
- `README.md` — final evaluator-facing setup, decisions and known limitations.

Do not create reports with fictitious results as placeholders. Use `PENDING`, `NOT RUN`, `PASS`, `FAIL`, `BLOCKED` status values and attach evidence when run.

## 3. Test pyramid: what is required versus optional

| Priority | Level | Minimum expectation | Primary owner |
|---|---|---|---|
| **P0** | Backend integration | Product validation/uniqueness, search, admin auth/CSRF, CSV invalid/duplicate rows, checkout success/replay/conflict/stock race, receipt-token protection | Backend (QA reviews) |
| **P0** | API/proxy smoke | Health, catalog, login lifecycle, one create/edit/delete, CSV upload, order creation/replay/receipt | QA |
| **P0** | Browser journey | Public search → cart → checkout → receipt; admin login → CRUD → CSV import; check both narrow and wide layouts | QA, Frontend fixes |
| **P0** | Docker/reviewer | Fresh setup; seed rerun; restart preserving products/orders; README commands verified | QA + DevOps |
| **P1** | Frontend component/unit | Cart persistence, formatting, form validation, API error/CSRF refresh handling | Frontend (QA reviews) |
| **P1** | Browser automation | Automate 1–2 P0 user journeys with Playwright if it fits the timebox | QA (coordinate frontend lockfile) |
| **Out** | Performance/load/security suite | No Gatling, Selenium grid, OWASP scanner pipeline, cross-browser matrix or load platform | None |

**Minimum automated gate:** backend critical-path tests plus a repeatable scripted HTTP smoke check. If Playwright becomes time-expensive, perform and record an exact manual browser walkthrough with evidence; browser journeys must still be validated, not skipped.

## 4. Acceptance traceability — AC-01 through AC-21

Every row begins `PENDING`; QA edits `docs/qa/acceptance-matrix.md` as executable evidence arrives. “Pass” requires the expected output/state, not merely HTTP 2xx.

| AC | Required proof / scenario | Owner of fix | Evidence type |
|---|---|---|---|
| **01** | Clean `docker compose up --build -d`, healthy web and API | DevOps | Compose status, proxied health response |
| **02** | Migrations + original CSV seed: valid products imported, malformed rows accounted for | Backend | Seed stdout + DB/API check |
| **03** | Rerun seed: no new duplicate products; no stock reset | Backend | Before/after DB counts + sample stock |
| **04** | Admin UI create → appears in catalog | Frontend + Backend | Browser + API product ID |
| **05** | Admin edits price/name/stock; values refresh correctly | Frontend + Backend | Browser + API response |
| **06** | Duplicate SKU / blank name / bad price or stock → expected 4xx; DB unchanged | Backend | API integration test |
| **07** | Delete/deactivate removes public visibility, preserves historical order snapshot | Backend | API/DB proof |
| **08** | Anonymous admin mutation/import rejected; invalid CSRF denied | Backend | 401/403 contract tests |
| **09** | Case-insensitive name/SKU search and category filter | Backend + Frontend | API query + browser |
| **10** | No-match search, pagination/invalid query behavior stable | Backend + Frontend | API + browser empty state |
| **11** | Admin uploads dirty CSV; counts and row reasons displayed | Backend + Frontend | Upload response + UI evidence |
| **12** | Repeat CSV upload; create-only duplicate conflicts; no duplicate rows | Backend | Two uploads + DB counts |
| **13** | Cart add/change/remove and refresh retain expected quantities | Frontend | Browser, reload |
| **14** | In-stock guest purchase yields one paid order, correct line snapshots/total | Backend | Checkout response + DB |
| **15** | Stock decremented once on purchase | Backend | Before/after stock |
| **16** | Same key+body replays unchanged; same key+changed body gives 409 | Backend | Responses + order count/stock |
| **17** | Oversell rejected; no paid order/negative stock; UI retains cart | Backend + Frontend | API + browser |
| **18** | Two last-unit orders in parallel → at most one succeeds | Backend | SQLite integration concurrency test |
| **19** | Token-protected receipt reload and restart preserve order/catalog | Backend + DevOps | Receipt auth + restart |
| **20** | Storefront/admin mobile+desktop: usable labels, feedback, navigation | Frontend | Manual smoke + viewports/screenshots |
| **21** | README-only cold install & tests work with no hidden steps | DevOps + QA | Clean-room execution transcript |

**Coverage protocol:** link AC-01–21 to at least one test case or manual step. If evidence is from a manual run, record tester, date, browser, steps, and expected/observed outcome. Do not call code review alone “test evidence.”

## 5. Backend integration test cases (coordinate with Backend Agent)

Use isolated SQLite **test** DB, never mounted production/dev persistent volume; migrate test schema before suite. Prefer Symfony WebTestCase/kernel tests with real Doctrine persistence and request clients. Use fixtures you create rather than relying on CSV row order. Cover:

1. Valid product create/read/update/soft-delete: active status and order snapshots remain correct.
2. Input guardrails: normalized uppercase trimmed SKU, unique even against inactive products, required name/category, positive price, nonnegative integer stock/weight; DB rejects invalid/colliding mutations.
3. Public catalog: active-only search matches name/SKU ignoring case; category, deterministic sort/page/limits and invalid params.
4. Error envelope: errors use exact `04-API.md` `error.code`, `message`, and `fields` object; no raw stack traces.
5. Admin login bootstrap: anonymous `/admin/session` CSRF; login rotates session/CSRF; invalid credential or missing/invalid token cannot authenticate.
6. Admin write protection: anonymous → 401, authenticated with bad CSRF → 403, valid session/CSRF → works; Origin mismatch → 403.
7. CSV: malformed/extra/missing header handling; row-level errors; blank rows skipped; create-only duplicate handling; first and second import reporting; atomic row writes.
8. Seed: repeated run makes no duplicate, and explicitly verifies existing edited stock and prices are untouched.
9. Checkout: server-authoritative prices; multiple products; correct per-line and order totals in cents; saved immutable snapshots; stock deduction.
10. Retry: same key/same canonical body returns 200 matching receipt and order, no duplicate stock deduction; same key/different request returns `409 IDEMPOTENCY_CONFLICT`.
11. Invalid checkout: zero/negative or repeated item quantities (per contract), unavailable or inactive product, insufficient stock; rollback all changes.
12. Last-unit concurrency: two independent connections/requests sharing one SQLite file; assert only one paid order and no negative inventory. Set sane busy timeout and bounded retry per API contract. Do not mistake in-memory SQLite connections for a realistic concurrency test.
13. Receipt: missing/malformed query token → 400; valid-format incorrect token/unknown order → uniform 404; correct token → 200, no token echoed in receipt DTO; replay receipt token stable across fresh request/process with same secret.
14. Return shapes/statuses: create 201, normal replay 200, delete 204; no fake second payment API; proper 409/422 and JSON envelope.

If a test exposes a discrepancy between code and `04-API.md`, open an explicit contract defect. No silent tolerance in QA.

## 6. Supplied CSV — dirty-data verification matrix

Always import the original 7-column dataset: `name,sku,description,category,price,stock,weight_kg`. Preserve it byte-for-byte in the repository. **Known observations:** 97 data rows, 18 nonblank category values; duplicate SKUs including `RS-001` and `BS-021`; price `$29.99`; negative stock on `DL-007`; missing names on `HD-099` / `WS-001`; empty weight on `GK-088`; absent category on `GC-025`; two blank rows. These are examples to verify, *not* precomputed importer totals.

| Scenario | Expected result |
|---|---|
| Exact valid row | Product created using normalized/validated fields |
| `$29.99` currency-formatted price | Accepted/normalized **only if permitted by frozen CSV parser rules**; otherwise row validation error, never 0 price |
| Whitespace/blank `name`, `sku`, `category` | Row rejected with field error; no partial product |
| Negative, noninteger, missing `stock` | Row rejected; no negative inventory |
| Missing/invalid `weight_kg` | Row rejected per required field rule |
| Intra-file duplicate SKU | First valid occurrence wins, later occurrences reported/skipped (verify contract's specific accounting) |
| SKU already in database | Skip/report conflict; never silently overwrite |
| Blank row | Skipped with predictable accounting; does not create empty product |
| Bad/missing headers, wrong encoding/file type, oversized upload | Documented 4xx or row/file error, not 500 |
| Repeat original import | No new products; previous edits and stock preserved |

**Accounting invariant:** `input_rows = inserted + skipped + failed` using the counting definition in `04-API.md` (confirm whether physical blank rows and header are included). Assert actual response counts match processed rows and issue lists; don't hardcode assumed number of inserted products.

## 7. Browser E2E & exploratory walkthroughs

Use Playwright if already available and quick to wire; otherwise run exact manual steps and capture redacted evidence. Use isolated fixture SKUs and clean up only those fixtures. Do **not** display cookie, CSRF token, idempotency key, or receipt capability in screenshots/log files.

### E2E-01 — Public customer happy path (P0)

1. Open `/`, verify mockup-inspired hero/nav and a responsive product section; open `/products` and a product detail view.
2. Search by name and mixed-case SKU; filter category; test unknown search and pagination.
3. Add in-stock product to cart, increase/decrease quantity, reload; verify persistence and subtotal based on displayed product prices.
4. Go to checkout, provide valid name and email, submit once. Verify backend created one paid order and decremented stock once.
5. Open confirmation, reload with receipt capability, confirm order lines and total; verify cart cleared **only after confirmed success**.
6. Repeat checkout request with the same key and payload at HTTP layer; verify unchanged order and inventory.

### E2E-02 — Admin maintenance/import (P0)

1. Open `/admin/login`, sign in with configured test admin; verify session established and protected route reachable.
2. Create valid product, edit name/price/stock, then attempt duplicate SKU and malformed inputs; confirm errors inline and no bad save.
3. Search the admin product list; delete/deactivate created product with confirmation; confirm no longer public.
4. Import original CSV via admin UI; verify inserted/skipped/failed accounting and row-level messages; import again, verify no duplicates.
5. Log out; retry protected page and mutation via HTTP → unauthorized.

### E2E-03 — Checkout/receipt adversarial checks (P0 manual or API automated)

- Stock depleted between cart add and checkout → actionable 409; cart remains for correction.
- Same idempotency key with different body → 409, no second order; ambiguous transport retry retains key.
- Receipt reference without token → 400, wrong valid-format token → 404, correct token → 200.
- Last-unit parallel buyers at API level → no oversell, bounded error not crash.

### Responsive / usability checks (P0)

At approximately **375px** and **1440px** widths, verify storefront, search controls, product cards, cart, checkout, admin list/forms, and import feedback. Check keyboard navigation, accessible labels, focus indication, errors associated with controls, empty/loading/error states, readable contrast, and no obstructive horizontal overflow. Pixel-perfect matching to mockup is **not** a release gate.

## 8. API contract and security smoke matrix

QA should implement a small scripted flow (shell+curl/Python/Node—reuse existing tools, don't add an unnecessary framework). Fetch dynamic IDs, CSRF and cookies into protected temporary variables; redact logs. Assertions must use the **actual route matrix, payload shape and status codes** from `04-API.md`.

| Check | Expected | Contract |
|---|---|---|
| `GET /api/v1/health` via web | 200, DB healthy | C-01 |
| Public list/search/detail/categories | 200 + exact envelopes | C-03 |
| Admin mutation before auth | 401 | C-04 |
| Login without CSRF; wrong Origin | 403, not signed in | C-05 |
| Valid session + CRUD; invalid field | 201/200/204 and 422/409 | C-06–07 |
| Multipart CSV import twice | Structured import reports, no duplicates | C-08 |
| Order with valid UUID key | 201 paid, correct totals | C-10 |
| Identical retry vs altered payload | 200 replay vs 409 conflict | C-11 |
| Insufficient stock | 409, rollback | C-12 |
| Concurrent last-unit buy | At most one success | C-13 |
| Receipt no/bad/good token | 400/404/200 | C-14 |
| Restart and receipt reload | 200, original order persists | C-15 |

**Security review (release-blocking where P0):**

- Admin mutations and imports require real session + current CSRF; login needs CSRF; session ID rotates on login; logout invalidates session.
- Admin operations with disallowed Origin fail; proxy forwards `Origin`, `Cookie`, `Set-Cookie` and multipart boundaries correctly.
- Cookies use `HttpOnly`, host-only path `/`, `SameSite=Lax`, `Secure` under HTTPS (localhost HTTP exception documented); no session credential in browser localStorage.
- Browser cannot directly reach backend from host in normal Compose config; `/api/v1` proxy cannot be abused as arbitrary URL forwarding or SSRF.
- Order receipt is a bearer capability: unpredictable token, secure lookup, uniform invalid-token responses, no token in order GET body, external referrers, analytics, structured logs, cache or screenshots.
- Credentials, database files, application secrets, test tokens and `.env` are excluded from Git; avoid leaking them into static Next.js bundles or logs.
- Server validates quantity/price/stock. SQL inputs are parameterized; CSV input isn't evaluated or concatenated into queries; malformed requests don't expose traces.
- Known MVP limitations (no payment processor, no real customer identity, fixed admin account, SQLite write scale, limited image assets) are clearly documented rather than mislabeled production-ready.

## 9. Docker clean-room / persistence verification (with DevOps Agent)

**Use a fresh clone or temporary checkout and a fresh named Compose project.** Never run destructive volume commands on someone else's working environment. Prefer a temporary `COMPOSE_PROJECT_NAME` so test volumes do not affect development data.

1. Confirm required tools/versions (Docker + Compose; browsers/test runner if needed); follow **only** README instructions.
2. Copy `.env.example` to `.env` and generate required stable secrets/admin password hash using commands documented in README. Do not commit or display secret values.
3. Run `docker compose up --build -d`. Confirm web healthy, API healthy internally and proxied health visible at `http://localhost:3000/api/v1/health`.
4. Confirm SQLite migration and CSV seed ran on first boot, imported valid products and reported rejects without terminating the stack.
5. Save safe DB counts and one product stock value; rerun seed using README's exact command. Verify no duplicate creation or overwrites.
6. Create an order via browser/API, save **only redacted evidence** of paid status and inventory delta. Stop/restart (`docker compose down` then `docker compose up -d`, **without `-v`**). Confirm order/stock and token-protected receipt survive.
7. Rebuild service images if needed; persistent SQLite data and stable secrets must survive. Confirm sessions/proxy work with HTTP localhost security policy.
8. Execute advertised unit/integration tests; verify expected exit codes. Test malicious Origin, CSRF and receipt unauthorized access.
9. Inspect `docker compose logs` for accidental cookie/token/secret leakage. Log sensitive URL query strings only in redacted form.
10. Shut down the temporary Compose project without destroying working project data. Document exact image/build/runtime failures and resolution.

**Infrastructure matrix:** record results for all **I-01–I-15** in `06-INFRASTRUCTURE.md`; if one cannot run, record why and risk. Reject claims such as “clean install works” without a tested cold-start transcript. Commands in this document are examples; README must contain **verified executable** project-specific commands, not placeholders.

## 10. Defect management & escalation

Use a short entry in `docs/qa/defects.md` or task board:

```yaml
id: QA-012
severity: P0 | P1 | P2
summary: "Idempotent checkout deducts stock twice"
steps: ["... exact reproducible commands ..."]
expected: "one paid order and one stock deduction"
actual: "... observed result ..."
evidence: "redacted log/test report path"
owner: "Backend Agent"
status: OPEN | FIXING | READY_FOR_RETEST | VERIFIED | DEFERRED
related: ["AC-16", "C-11"]
```

| Severity | Definition | Decision |
|---|---|---|
| **P0 blocker** | Any mandatory feature unavailable; paid-order duplication, negative stock, anonymous admin write, receipt leak, startup/seed fails | Stop release. Orchestrator assigns immediate fix; QA retests. |
| **P1 important** | Major visible UX or partial CSV reporting issue with working P0 path | Fix within remaining buffer if feasible; orchestrator decides documented workaround/limitation, but don't relabel broken P0 behavior as P1. |
| **P2 cosmetic** | Minor aesthetic imperfections, extra polish, optional enhancements | Defer; document if meaningful. |

Escalate **P0 immediately**. For blockers unresolved after ~20 minutes of investigation, send exact reproduction and request orchestrator decision; switch to nondependent validation. Orchestrator—not QA alone—approves any contract amendment or justified deferral.

## 11. Six release gates and required sign-offs

| Gate | Timing | Proof of readiness | Who signs |
|---|---|---|---|
| **A — Contracts** | End Phase 1 | Scope, schema, HTTP DTO/errors/security and agent ownership frozen | Orchestrator; QA acknowledges cases mapped |
| **B — Foundation** | End Phase 2 | Compose runs two services, healthy proxy, SQLite persistent volume, smoke scaffolding | DevOps + QA |
| **C — Backend** | End Phase 3 | CRUD/search/import/seed/checkout tested; API C-cases relevant to backend pass | Backend + QA |
| **D — Frontend** | End Phase 4 | Real storefront/admin/cart/checkout journeys reachable, correct proxy, no permanent mocks | Frontend + QA |
| **E — Integration** | End Phase 5 | AC-01–20 checked; concurrency/idempotency/security and restart verified; all P0 failures resolved | QA + Orchestrator |
| **F — Delivery** | End Phase 6 | AC-21 cold install, README commands executed, known limits/decisions recorded, release report approved | QA + DevOps + Orchestrator |

**Release = GO only if:** all 21 AC show PASS with traceable evidence (or explicit orchestrator-approved equivalence for a test method), critical contract checks C-01–C-16 covered, relevant infrastructure I-01–I-15 checked, no open P0 blockers, README validated from fresh setup, and owners acknowledge their handoffs. If incomplete, issue **NO-GO** with precise blockers; do not manufacture a green report to meet the deadline.

## 12. Weekend execution budget and QA task queue

QA work overlaps development—**do not wait until Phase 5**. Approximate effort budget for this agent: 4–6 focused working hours spread across phases, within the project’s ~16-hour elapsed target and ~2-hour stabilization reserve.

| Task | Phase | Timebox | Dependencies | Output / gate |
|---|---|---:|---|---|
| **Q0 — Contract acknowledgement & matrix** | 1 | 25–40m | Frozen `01/04` specs | `docs/qa/acceptance-matrix.md` with AC-01–21 and mapped tests |
| **Q1 — Smoke tooling skeleton** | 2 | 30–45m | Compose routes/credentials shape fixed | Runnable scripted health/catalog/auth baseline |
| **Q2 — Backend contract and data review** | 3 | 45–60m | Backend endpoints, test DB | Evidence for CRUD/import/order/receipt/concurrency; defects issued |
| **Q3 — UI journeys and optional Playwright** | 4 | 45–60m | Frontend routes integrated | E2E-01/02 walkthroughs and responsive checks |
| **Q4 — Integration/security/restart** | 5 | 60–90m | Whole stack integrated | Matrix updates, regression retests, infrastructure evidence |
| **Q5 — README, clean-room, final report** | 6 | 60–90m | Stable build and commands | Verified README, test results, GO/NO-GO report |

**Time-saving rules:** test the entire happy path first; pursue P0 negative tests next; automate only assertions that prevent serious regressions; use one browser; avoid snapshot-heavy UI suites; write README progressively; postpone anything not tied to an AC. If deadline is threatened, ask orchestrator to move engineers from polish to fixing release blockers.

## 13. README.md — minimum mandatory deliverable

QA Agent owns `README.md`; DevOps supplies verified commands, Backend supplies migration/seed/test steps, Frontend supplies UI/test instructions, Orchestrator signs off architectural decisions. Include the following **in this order**:

1. **Title & overview:** what the MVP does, tech stack and architecture diagram/text (Next.js → `/api/v1` same-origin proxy → Symfony → SQLite).
2. **Implemented features:** public browsing/search, cart/fake checkout, admin CRUD/import, CSV seeding and persistent orders.
3. **Requirements/prerequisites:** Docker engine/Compose version requirements and supported test tooling. No nonessential host PHP/Node prerequisite for Docker-first setup.
4. **Fast start:** clone → copy `.env.example` → generate environment secrets/admin hash (safe actual commands) → `docker compose up --build -d` → URLs and login behavior. Explain HTTP localhost development exception.
5. **Database and seed:** automatic first-boot migrations and supplied CSV import; manual migration/seed commands; row error output location; repeat seed behavior. State that original CSV contains invalid/duplicate rows and they are reported.
6. **Demo walkthrough:** public search/cart/order/confirmation; admin login/create/edit/delete; CSV upload; sample non-secret query values.
7. **Developer commands:** rebuild, logs, test runs, lint, schema migrations, seed, stop/restart, troubleshooting; mark **destructive** `docker compose down -v` with explicit data-loss warning.
8. **Architecture & decisions:** why Symfony + Doctrine/SQLite and Next.js/Tailwind/daisyUI, modular layered monolith, integer cents, SKU normalization, soft delete, atomic stock and idempotent checkout, receipt capability, simple auth.
9. **Alternatives considered / trade-offs:** PostgreSQL vs SQLite, dedicated search vs SQL, hosted auth vs single env admin, real payments vs fake, microservices vs monolith, background CSV jobs vs sync import, and realistic scalability limits.
10. **API overview:** route groups, contract pointer to `04-API.md`, example request/error with **dummy** values; note no separate payment endpoint.
11. **Testing & evidence:** commands, what each suite covers, AC matrix/release report paths; distinguish automated and manual coverage.
12. **Security/limitations:** fake payments, no user accounts, no tax/shipping, receipt URL as bearer capability; local-only secrets, secret rotation invalidates receipt links, no production scalability assurance from SQLite.
13. **Project structure / agent collaboration:** major folders, docs and ownership (brief; no sprawling architecture essay).

**README quality checks:** every command tested in clean-room; no dead relative links, placeholder commands, unverified default passwords, pasted live credentials, stale screenshots, or false claims of production readiness. Reviewers should get from empty clone to a working browser and imported product catalog without chatting with an agent.

## 14. File ownership, collaboration and handoff contracts

| Paths | Owner | QA protocol |
|---|---|---|
| `README.md` | QA | Commit progressively; DevOps verifies commands; Orchestrator approves |
| `docs/qa/**`, `scripts/smoke/**`, QA task board entries | QA | Direct edits in QA branch/worktree |
| `tests/e2e/**` (if chosen) | QA | Coordinate test-runner dependency changes and lockfile with Frontend/Orchestrator |
| `apps/api/**` except Dockerfile | Backend | Request bug fix as ticket; do not alter endpoint/schema unilaterally |
| `apps/web/**` except Dockerfile | Frontend | Request bug fix as ticket; no surprise proxy/client edits |
| `compose.yaml`, `infra/**`, app Dockerfiles, root env/Makefile | DevOps | Report failures with commands; owner fixes |
| `00-ORCHESTRATOR.md`, contract docs, `docs/decisions.md` | Orchestrator | Propose amendments with before/after impacts; wait for approval |

**Handoff from QA to owner:** issue ID, related AC/C/I IDs, impact/severity, exact reproduction, expected/actual, sanitized evidence, recommended retest.  
**Handoff from owner to QA:** commit/branch, changed files, commands executed/results, environment notes, known limitations, retest steps.  
**Final QA → Orchestrator handoff:** signed gate table, updated matrix, test run evidence, open defect list, validated README, build/deployment state and `GO` or `NO-GO` recommendation.

## 15. Runnable validation command template

Replace placeholders with **verified commands from actual repository scripts**. Do not copy commands into README until confirmed to work:

```bash
# Docker / browser-visible API
cp .env.example .env             # then generate/set all required secrets per README
# docker compose up --build -d    # after environment is valid
docker compose ps
curl -fsS http://localhost:3000/api/v1/health

# Diagnostics
docker compose logs --tail=100 web
docker compose logs --tail=100 api

# Backend test (choose exact installed runner)
# docker compose exec -T api php bin/phpunit
# docker compose exec -T api vendor/bin/phpunit

# Frontend lint/build/tests (use actual package manager/script names)
# docker compose exec -T web npm run lint
# docker compose exec -T web npm test

# Persistence check: NEVER add -v to normal restart
docker compose down
docker compose up -d

# Only in explicitly isolated disposable QA project:
# docker compose down -v   # DELETES DB VOLUME AND ALL ORDERS/STOCK
```

Smoke scripts should exit nonzero on failure, print a concise PASS/FAIL summary, use env-provided test credentials without echoing them, and clean up only their own disposable fixtures. If automated test setup requires extra local tools, specify those dependencies in README or provide containerized execution.

## 16. Final QA release report template

```markdown
# Release Verification — E-Commerce MVP
- Build/commit: <sha>
- Environment: Docker/Compose versions, host OS, browser
- Executed at: <date and timezone>
- Contract version: 04-API.md <commit>
- AC: <21 PASS / FAIL / NOT RUN with link to matrix>
- API contracts: <C-01–C-16 status/evidence>
- Infrastructure: <I-01–I-15 status/evidence>
- Automated suites: <exact commands and observed pass/fail counts>
- Manual browser checks: <URLs/viewports/screenshots, redacted>
- Open defects: <IDs and severities>
- README cold start: PASS / FAIL / NOT RUN
- Release recommendation: GO / NO-GO
- QA sign-off: <agent + commit>
- Orchestrator approval: <recorded explicitly>
```

**Stop condition:** QA only declares its work complete after the release report exists, the orchestrator has sufficient reproducible evidence for each P0 capability, README steps have been verified, and any remaining limitations are recorded plainly. Quality is demonstrated by passing workflows and coherent evidence—not by the number of test files.
