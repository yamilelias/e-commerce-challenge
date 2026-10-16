# 03 — Backend Implementation Specification (Symfony)

**Status:** Implementation-ready after orchestrator contract freeze  
**Owner:** Backend Agent (`apps/api/**`, except `apps/api/Dockerfile`)  
**Deadline:** Weekend MVP; target 3–4 hours for core backend, with rapid QA handoffs  
**Authority:** `04-API.md` is normative for all routes, DTO fields, statuses, error codes, and security semantics. `01-PRODUCT.md` owns user-facing scope; `02-ARCHITECTURE.md` owns architectural rationale; `00-ORCHESTRATOR.md` owns execution rules. If documents disagree, STOP and request an orchestrator clarification; do not silently redesign the contract.

## 1. Mission and definition of success

Deliver a real Symfony JSON API backed by SQLite: public catalog/search; authenticated product CRUD; CSV import and repeatable bundled CSV seeding; one-step, guest, fake-paid checkout; transactionally correct stock deductions; idempotent retries; and protected order receipt retrieval. All mandatory behavior must be implemented and testable without the frontend. Prioritize correct transactions, clear errors, and tests over speculative abstractions.

**Non-goals:** payment provider, customer accounts, multi-admin roles, shipping, taxes, coupons, full CQRS/DDD framework, separate search service, message queue, async CSV, image upload, product reactivation, order list, and `/pay` endpoint.

## 2. Stack and ownership

- PHP compatible with **Symfony 7.4 LTS**; Symfony FrameworkBundle, Security, Validator, HttpFoundation, Doctrine ORM/DBAL, Doctrine Migrations, Symfony PHPUnit Bridge or PHPUnit. Pin actual compatible versions in Composer lockfile.
- SQLite in `/data/ecommerce.sqlite` in Docker; configure `DATABASE_URL` for SQLite, foreign keys ON, busy timeout and appropriate journaling (WAL preferred when writable volume supports it). Only Symfony opens the database.
- Controllers: thin, JSON transport only. Application services: use cases, validation orchestration and transaction boundaries. Doctrine repositories/entities: persistence. Security: session auth and CSRF. Avoid huge base classes, generic repositories or interfaces without a boundary.
- **Backend Agent:** owns `apps/api/src/**`, `apps/api/config/**`, `apps/api/migrations/**`, `apps/api/tests/**`, `apps/api/composer.*`, Symfony CLI seed, and API implementation documentation. **DevOps Agent** owns `apps/api/Dockerfile`, root Compose and deployment/env wiring. **Frontend Agent** owns `apps/web/**`. **QA Agent** owns `docs/qa/**`, `scripts/smoke/**`, and README; backend agent adds in-app tests on request. Coordinate edits to shared root files with orchestrator.
- Use a dedicated branch/worktree; report commit SHA and file changes at handoff. Never force push or overwrite another agent's edits.

## 3. Pragmatic proposed file layout

```text
apps/api/
  bin/console
  config/
    packages/{doctrine,framework,security}.yaml
    routes.yaml
    services.yaml
  migrations/Version*.php
  src/
    Controller/Api/V1/{HealthController,CategoryController,ProductController,AdminProductController,AdminSessionController,ImportController,OrderController}.php
    Entity/{Category,Product,Order,OrderItem}.php
    Repository/{ProductRepository,CategoryRepository,OrderRepository}.php
    Service/{ProductInput,ProductService,ProductSearchService,CsvProductImporter,CheckoutService,ReceiptTokenService,FakePaymentGateway}.php
    Security/{AdminAuthenticatorOrSessionService,AdminCsrfGuard}.php
    Command/SeedProductsCommand.php
    Http/{ApiError,ApiExceptionListener,ApiJsonResponder}.php
  tests/{Unit,Integration}/
  composer.json
```

Names can differ slightly if Symfony conventions demand it, but do not reorganize major responsibilities without orchestrator approval. Optional small DTO classes may live in `src/Dto/`. An ORM repository can replace a dedicated service where logic is simple; preserve domain checks and a single checkout transaction boundary.

## 4. Frozen schema and persistence

Create **one migration** for the MVP, mapped through Doctrine entities; use database constraints as a final safety net. Required tables:

| Table | Columns / constraints |
|---|---|
| `categories` | `id` PK; `name` text required; `slug` text unique required. |
| `products` | `id` PK; `name` <=200; `sku` normalized uppercase, <=100, unique (including inactive); `description` text default `''`; `category_id` FK; `price_cents` positive integer; `stock` nonnegative integer; `weight_kg` exact decimal(10,3) or canonical decimal string with validated precision; `is_active` boolean default true; timestamps UTC. |
| `orders` | `id` PK; `reference` unique nonsequential string; `buyer_name`, `buyer_email`; `status` (`paid` for happy path); `currency='USD'`; `total_cents` nonnegative integer; `idempotency_key` unique UUID string; **`request_fingerprint`** SHA-256 hex; **`receipt_token_hash`** SHA-256 hex unique; `created_at`, `paid_at` timestamps. |
| `order_items` | `id` PK; `order_id` FK ON DELETE CASCADE; `product_id` nullable FK ON DELETE SET NULL; immutable `sku_snapshot`, `name_snapshot`; `quantity` positive integer; `unit_price_cents` positive integer; `line_total_cents` integer. |

Index `products(is_active,category_id,id)` and unique SKU, categories slug, orders reference/idempotency key/receipt hash. Enforce FK and CHECK constraints where supported. Normalize timestamps in responses as UTC ISO 8601. `request_fingerprint` and `receipt_token_hash` are mandatory: `04-API.md` resolves an earlier optional schema decision. Do not introduce `import_jobs` or `inventory_movements` tables in the MVP; report CSV results synchronously.

**Schema review checkpoint:** Before implementing services, Backend Agent sends migration field list and constraints to Orchestrator and QA. Keep wire representation distinct: API `price_cents` integer and `weight_kg` fixed-decimal string (three places); product write requests accept `price` decimal string.

## 5. Shared input, normalization and errors

Implement one validation/normalization path reused by admin create/patch and CSV importer, with CSV-specific coercions before common validation. Reject unknown JSON keys and wrong JSON types; do not cast arbitrary booleans/floats to strings/integers.

- `name`: nonblank string <=200; trim. `sku`: ASCII trim + uppercase, 1..100, unique even against inactive products; reject invalid characters per frozen API (do not loosen validation). `description`: optional on create, default empty; empty allowed. `category`: trimmed, internal whitespace collapsed, nonblank, stable lowercase hyphen slug; create category **only after product validation succeeds** and in same transaction as valid product creation.
- Admin `price`: strict positive fixed-point **string**, max 2 fractional digits, upper bound $999999999.99; parse into integer cents using digits/string operations, never floats. `stock`: JSON integer >=0; `weight_kg`: decimal string with max three places, nonnegative, bounded by contract; consistently serialize `"0.350"` style.
- `PATCH`: nonempty subset; omitted fields unchanged, `null` invalid; inactive products cannot be edited or restored. `DELETE`: mark `is_active=false`, return 204, repeated deletion 404; do not delete order history or free SKU.
- Format every non-2xx JSON exception: `{ "error": { "code": "...", "message": "...", "fields": {} } }`; `fields` always exists; never expose stack traces/SQL errors. Centralize exception-to-status translation (`BAD_JSON`, `BAD_QUERY`, `VALIDATION_ERROR`, `INVALID_FIELD`, `SKU_CONFLICT`, `NOT_FOUND`, `UNAUTHENTICATED`, `CSRF_INVALID`, `FORBIDDEN`, `INSUFFICIENT_STOCK`, `PRODUCT_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `INTERNAL_ERROR`, relevant CSV codes). Use correct 401/403/404/409/422 and content types.
- API success body is `{ "data": object }` except product lists also supply pagination `meta`; 204 is empty. Only `04-API.md` governs actual key names and shapes.

## 6. Endpoint implementation checklist (exact paths)

All under `/api/v1`:

| Method | Route | Implementation owner/service | Authentication |
|---|---|---|---|
| GET | `/health` | health controller; DB availability | public |
| GET | `/categories` | active-product category projection, name ASC | public |
| GET | `/products` | product search/list with `q`, `category`, `sort`, `page`, `per_page` | public |
| GET | `/products/{id}` | active product detail | public |
| GET | `/admin/session` | session bootstrap/auth status + CSRF token | public |
| POST | `/admin/login` | validate CSRF, credentials, rotate session & token | anonymous with session CSRF |
| POST | `/admin/logout` | invalidate authenticated session | authenticated + CSRF |
| GET | `/admin/products` | include active and inactive as API describes | authenticated |
| GET | `/admin/products/{id}` | admin product detail | authenticated |
| POST | `/products` | create validated product | authenticated + CSRF |
| PATCH | `/products/{id}` | partial update | authenticated + CSRF |
| DELETE | `/products/{id}` | soft-delete | authenticated + CSRF |
| POST | `/products/import` | CSV upload, importer | authenticated + CSRF |
| POST | `/orders` | guest one-step paid checkout | public + `Idempotency-Key` |
| GET | `/orders/{reference}` | capability-token receipt | public with valid `token` query |

Do not create extra public endpoints. Consult API contract for the exact product/list/order DTOs and supported query sorting/options. Prefer explicit route declarations so `/admin/products` cannot be accidentally handled by `/products/{id}`.

## 7. Admin authentication and CSRF — required end-to-end behavior

1. Read `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` from server-only environment. Symfony password hasher verifies input against hash; no user table, frontend-shipped credentials, reusable default password, or `.env` secrets in Git.
2. `GET /admin/session` initializes Symfony server session and returns `{authenticated,username,csrf_token}` inside `data`, including anonymous CSRF token. Set `HttpOnly`, `SameSite=Lax`, `Path=/`; `Secure` for HTTPS, with localhost HTTP exception. Session middleware must function through the Next.js same-origin proxy.
3. `POST /admin/login` validates session-bound `X-CSRF-Token`, allowed `Origin` when supplied, then credentials. Successful login rotates the session ID **and** CSRF token, returns new session DTO. Invalid credentials use 401, malformed payload 422, bad CSRF 403.
4. `GET /admin/products*` checks authenticated session; admin writes and logout check authenticated session first (401), then CSRF (403 `CSRF_INVALID`) and origin protection. A CSRF token alone never grants auth.
5. `POST /admin/logout` invalidates and expires session cookie and token, responds 204. Never log cookies/passwords/CSRF or expose internal session ID in responses.
6. Test actual browser-proxy cookie round trips with DevOps/Frontend; avoid CSRF bypass for convenient local testing. Check `PUBLIC_ORIGIN` allowlist and trusted proxy settings; do not trust unvalidated forwarded host headers.

## 8. Product search and categories

- Query active products for public list/detail and include inactive products in admin list only. Exact query parameters and pagination metadata are in `04-API.md`.
- Case-insensitive **literal substring** search in `name` OR `sku`. Escape SQL `%`, `_` and the chosen LIKE escape character; use bound parameters. If SQLite case-insensitive Unicode search is limited, document scope rather than adding a search engine.
- Combine optional category slug with query by AND. Deterministic tie-break `id ASC`; use allowed sorts only, never interpolate untrusted column identifiers. Count **filtered** rows independently of page size.
- `GET /categories` returns alphabetically ordered categories having >=1 active product. Ensure soft-deleted-only categories are hidden; admin category creation does not require separate CRUD.

## 9. CSV import and repeatable database seed

**Input:** bundled `data/products.csv` byte-for-byte from attachment; UTF-8 CSV header has exactly `name,sku,description,category,price,stock,weight_kg`, any order, optional BOM, trim header fields. DevOps mounts/copies fixture inside API container at `/app/data/products.csv`.

**One shared implementation:** `CsvProductImporter::import(stream|file)` used by multipart upload and `app:products:seed --file=/app/data/products.csv`. Process records with RFC 4180-compliant parser (`fgetcsv`/stream), including quoted commas and newlines. Use logical row positions (first data record row 2), **count empty records** as skipped. Validate header and input before writes; reject empty/invalid file as a whole. Never evaluate formula-looking cells.

**MVP policy:** create-only. For each normalized SKU, first **valid** row wins; later same-file valid repeats skipped `DUPLICATE_IN_FILE`; existing DB SKU skipped `SKU_EXISTS` regardless of active state; invalid earlier row does not reserve SKU. CSV stock may be digit text and price may have one leading `$`; weight remains validated decimal. No silent updates. Use per-row transaction so invalid rows do not leave categories behind; accepted earlier rows survive later row rejection.

**Result:** `{data:{total_rows,inserted,skipped,rejected,issues,truncated}}`, with invariant `total_rows=inserted+skipped+rejected`, up to 200 issues in stable row/field order; issue `{row,field,code,message}`. Use 200 for parsed imports including partial successes; header/empty/unparseable failures use standard error envelope (`422`), unsupported file/type 415, >2,097,152 bytes 413. If unexpected mid-stream I/O fails, report 500; previously committed valid rows may remain. Document this known limitation. Do not implement import preview or jobs.

**CLI behavior:** same summary in machine-readable output, exit 0 on successful parsing even with row rejects, nonzero on whole-file error. Seeding twice must not duplicate records or reset existing prices/stock; surface totals for QA. Test bundled dirty records (duplicates, blank rows, missing required fields, `$` price, negative stock). CSV has 97 data records per API contract; report actual acceptance counts from running importer rather than inventing them.

## 10. Guest checkout, SQLite concurrency and idempotency

**Public POST `/orders`:** validate `buyer_name` (trim, 1..200), `buyer_email` (valid, lowercase for fingerprint, <=254), `items` (1..50 entries), positive integer `product_id`, integer quantity 1..999; coalesce duplicate IDs and reject combined quantity >999. Reject unknown keys; `Idempotency-Key` must be a valid UUID per `04-API.md`. Never trust client prices, currency, totals or stock.

**Canonical request fingerprint:** SHA-256 over a stable canonical JSON structure with normalized buyer fields and coalesced items sorted ascending `product_id`; document deterministic encoding in a unit test. Persist fingerprint with order.

**Mandatory transaction algorithm:**

1. Validate payload and header, create fingerprint. Start SQLite write transaction with early lock (`BEGIN IMMEDIATE` or proven equivalent) so concurrent checkouts serialize; configure busy timeout, at most one bounded retry for SQLITE_BUSY.
2. Lookup `orders.idempotency_key`. Existing key + identical fingerprint: rederive receipt token, return **200** with identical order response, no new payment and no stock change. Same key + different fingerprint: **409 `IDEMPOTENCY_CONFLICT`**.
3. Fetch all requested active products inside transaction; missing/inactive yields **409 `PRODUCT_UNAVAILABLE`**. Read authoritative product price and create immutable item snapshots.
4. Execute `UPDATE products SET stock = stock - :qty WHERE id=:id AND is_active=1 AND stock>=:qty` for each product in deterministic product ID order; require affected row = 1; otherwise **409 `INSUFFICIENT_STOCK`** and rollback all deductions.
5. Compute integer-cent line totals and order total with overflow checks; invoke tiny `FakePaymentGateway` whose MVP result is deterministically success (allow injectable test failure); persist paid order, line snapshots, unique public reference, idempotency key/fingerprint, receipt hash and UTC paid timestamp. **Commit** only after everything succeeds.
6. Return **201** with exact OrderReceipt plus receipt token. Roll back for any failure. If client loses response, retry the **same** key; never generate a second order implicitly.

**Receipts:** derive 64-lowercase-hex token = `HMAC-SHA256(RECEIPT_SECRET, "receipt:v1:" + normalized UUID idempotency key)`. `RECEIPT_SECRET` is distinct, stable, high-entropy 32+ byte server-only secret. Store **only** `SHA256(token)` in `orders.receipt_token_hash`. Re-derive on same-key replay. GET `/orders/{reference}?token=<64 hex>` verifies reference and token hash with timing-safe comparison; missing/malformed token yields 400, wrong token or unknown reference yields indistinguishable 404. GET receipt excludes the token in `data`. Never log URL tokens; force `Cache-Control: no-store` and cooperate with frontend `Referrer-Policy: no-referrer`. Secret rotation invalidates old links and must be documented.

**Potential integration trap:** Doctrine nested transactions / implicit transaction wrappers must not undermine `BEGIN IMMEDIATE`; test the actual DBAL version and lock behavior rather than assuming ORM `beginTransaction()` acquires SQLite write lock. Use DBAL SQL for conditional stock updates. Checkout is the **only** payment action—no pending flow, no `/pay` route.

## 11. Test plan (Backend Agent owns these tests)

Prefer fast isolated PHPUnit unit tests and SQLite integration tests using a throwaway database per suite/worker; do **not** point test commands at `/data/ecommerce.sqlite` unless explicitly configured for tests. Integration tests should boot Symfony and exercise the HTTP routes, auth and real database constraints.

| ID | Test | Required assertion |
|---|---|---|
| B-01 | Product input normalization | SKU uppercase, category canonical, cents accurate, weight precision |
| B-02 | Invalid write and duplicate SKU | 422/409 with field errors; no partial category/product |
| B-03 | Soft delete | product hidden publicly, visible in admin list; SKU not reused |
| B-04 | Catalog search | literal `%`/`_`, filter, sort, deterministic paging and totals |
| B-05 | Login/CSRF | anonymous bootstrap; bad token rejected; rotate on login; logout invalidates |
| B-06 | Unauthorized mutation | 401; valid session without CSRF 403 |
| B-07 | CSV mixed rows | correct report totals and logical row numbers; no partial rows |
| B-08 | CSV seed twice | second run inserts 0; existing product prices/stock unchanged |
| B-09 | CSV bad header/oversize | no inserts, correct 422/413 and envelope |
| B-10 | Order success | 201 paid, authoritative cents, snapshots, stock deducted once |
| B-11 | Retry with same key | 200 same reference/token; no new order or stock change |
| B-12 | Retry different payload | 409 `IDEMPOTENCY_CONFLICT`; no modifications |
| B-13 | Insufficient/unavailable stock | 409 and full transaction rollback |
| B-14 | Last-unit concurrency | only one success; never negative inventory or two paid orders for one unit |
| B-15 | Order receipt | 200 valid token; 400 missing/malformed; 404 wrong/unknown |
| B-16 | Sensitive data/error handling | no exception trace, cookies/secrets/token in logs or JSON errors |

Use a deterministic two-connection race test where practicable, plus a smoke-script concurrent request check with QA. If SQLite lock behavior is flaky under a host filesystem, reproduce with container SQLite volume before changing transaction semantics. Give orchestrator test command and summary; do not claim coverage from unexecuted tests.

## 12. Task decomposition and dependency order

**B0 — Contract acknowledgement (15 min):** Read `00`, `01`, `02`, `04`; report discrepancies and exact `04-API.md` revision/hash to orchestrator. Confirm file ownership, environment names, secrets, API shape and migration columns. Gate: explicit contract freeze acknowledgment.

**B1 — Skeleton and migration (30–45 min):** Configure Symfony/Doctrine/SQLite, entities, migration, error responder and `/health`; send schema to QA and DevOps. Gate: migration up/down (or reset in test DB), FK/CHECK/unique verified.

**B2 — Product and public catalog (40–50 min):** Common validation, category normalization, CRUD, soft delete, public/admin reads/search/pagination. Gate: curl/HTTP tests for CRUD, SKU conflicts and search.

**B3 — Admin session and CSRF (30–45 min; can be developed alongside B2 by backend agent only if safe):** Env credentials, session/cookie, CSRF lifecycle and security checks. Gate: login, forbidden writes and logout tests through backend; proxy follow-up with DevOps.

**B4 — CSV import + CLI seed (40–50 min):** Shared importer; 2 MiB upload and reporting; CLI; seed fixture. Gate: first/second seed and dirty-data tests.

**B5 — Checkout + receipts (50–70 min):** Transactional order service, fake gateway, replay fingerprint/HMAC, receipt lookup and stock race. Gate: B-10 to B-15 tests all pass; orchestrator treats this as a critical gate.

**B6 — Hardening and integration handoff (20–40 min):** Run all tests, fix contract mismatches, hand API examples/status and actual seed summary to frontend/QA. Gate: no blockers; logs scrubbed; Docker endpoint reachability. Times are planning estimates, not a guarantee. Execute incremental vertical slices and notify orchestrator early when the timebox slips.

## 13. Checkpoints, handoffs and communication

After each B task, send concise handoff:

```text
TASK: B<number> — <title>
BRANCH/COMMIT: <branch>@<sha>
FILES: <changed paths>
API CONTRACT: 04-API.md (unchanged / proposed amendment)
DELIVERED: <route/service/behavior>
VERIFIED: <exact commands + pass/fail, sample response if useful>
BLOCKERS: <none or detail>
NEXT DEPENDENCY: <who may begin integrating>
```

- **To Frontend:** exact DTO conformance; live base routes; available auth bootstrap; CSRF header behavior; checkout receipt and retry example; when endpoints become ready. Do not share env secrets.
- **To DevOps:** PHP extensions (`pdo_sqlite`, etc.), writable `/data`, `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `RECEIPT_SECRET`, `PUBLIC_ORIGIN`, session-related env, fixture `/app/data/products.csv`; database migration/seed commands. Do not edit their Dockerfile.
- **To QA:** migrations, test suite, invalid data fixtures, first/reseed summary, auth and checkout scenarios, race-test instructions, known limitations.
- **To Orchestrator:** seek approval for breaking contract changes; do not alter frozen path/DTO on your own. Escalate stuck Docker/session or checkout transaction issues within ~15 minutes. Track known limitations in handoff instead of silently omitting behavior.

## 14. Commands and local validation contract

Expected commands **inside** API container (DevOps may adjust working directory, but must document exact variants):

```bash
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console app:products:seed --file=/app/data/products.csv
php bin/phpunit        # if installed by Symfony PHPUnit Bridge
# OR vendor/bin/phpunit, as pinned in composer.json
```

Use `docker compose exec api ...` from repository root for final verification. Query `/api/v1/health` through both internal API and browser-facing same-origin proxy; confirm data survives `docker compose down && docker compose up -d`. The README is QA/Docs-owned; supply verified commands, exact environment variables, and caveats rather than editing the README concurrently.

## 15. Backend phase gate / definition of done

- [ ] All 15 routes match `04-API.md` request/response shapes and statuses; no undocumented endpoints required for UI.
- [ ] SQLite migration is repeatable and constrained; product SKU uniqueness persists after soft delete.
- [ ] Money is represented in cents; order totals use server authority; no float money arithmetic.
- [ ] Public search, filtering, categories and pagination work and escape user input.
- [ ] Admin session, CSRF, Origin policy and proxy cookie behavior verified.
- [ ] Import is limited to 2 MiB, row errors accounted for, bundled seeder idempotent.
- [ ] Fake-paid checkout commits order and stock atomically; retries cannot double-charge/decrement.
- [ ] HMAC-derived receipt access works and does not expose orders by reference alone.
- [ ] All mandatory B-01–B-16 tests have passing results or explicitly logged blocker with owner.
- [ ] Actual test output, seed statistics, migrations and environment needs handed to orchestrator/QA.
- [ ] Backend ready for clean Docker-based end-to-end review before final submission.

**Weekend rule:** When time is short, simplify internal abstractions and add targeted regression tests, not compromise on authentication, server-side validation, stock integrity, idempotency, or mandatory CRUD/import/search/purchase endpoints.
