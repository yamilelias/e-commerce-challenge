# 02 — Technical Architecture & Frozen Integration Boundaries

**Project:** Weekend E-Commerce MVP  
**Status:** Phase-1 schema and integration boundaries frozen by the orchestrator on 2026-10-15.
**Owner:** Orchestrator / Tech Lead  
**References:** [`00-ORCHESTRATOR.md`](./00-ORCHESTRATOR.md), [`01-PRODUCT.md`](./01-PRODUCT.md)  
**Budget:** ~16 elapsed hours targeted; maximum ~20 focused execution hours including a 2-hour stabilization reserve.  
**Agents:** Backend, Frontend, DevOps, QA & Documentation.

> **Architectural objective:** Ship every mandatory feature in a small, legible monorepo. Use enterprise practices for contracts, data integrity, tests and reproducible deployment; reject speculative abstractions, services or feature expansion.

## 1. Scope, constraints and design principles

**Required stack:** Next.js App Router + React + TypeScript + Tailwind CSS + pinned compatible daisyUI; PHP 8.3+ + Symfony (prefer current supported LTS compatible with runtime) + Doctrine ORM/DBAL; SQLite; separate web and API Docker containers; Docker Compose.

**Mandatory user capabilities:** responsive catalog/landing page informed by reference mockup; product search; admin CRUD; CSV import with row-level results; idempotent seed of attached `data/products.csv`; persisted cart-to-order simulated purchase; order/stock consistency; README with local instructions and architectural rationale.

**Guidelines:**
- Modular monolith, not microservices. REST JSON, no GraphQL/BFF requirement.
- Server owns validation, prices, stock, order and payment state. Client owns presentation and temporary cart state.
- No generic repository/use-case class per trivial operation; extract services for imports, search and checkout where complexity is justified.
- No external queue, search engine, CDN, real payment gateway, user-account system, tax/shipping engine or cloud services.
- Avoid promises of production-grade security or scale: this is a *hardened demo*, with explicit limitations.
- No code generation or architecture expansion that blocks the critical-path acceptance criteria AC-01 through AC-21 in `01-PRODUCT.md`.

## 2. Runtime topology and trust boundaries

```text
Browser (shopper / admin)
    |
    | HTTP :3000
    v
Next.js web container
    |  server-side requests via API_INTERNAL_URL=http://api:8000
    |  browser requests via same-origin /api/v1/* reverse proxy in Next.js
    v
Symfony PHP API container :8000
    | Doctrine/DBAL; all mutations & validation here
    v
SQLite /data/ecommerce.sqlite (named Docker volume; backend-only)

Docker Compose: web + api; healthcheck; env files. No standalone DB container.
```

**Routing:** A browser uses the **same-origin** `http://localhost:3000/api/v1/*` facade to reach Symfony; Next.js forwards the method, status, cookies and response body to the internal API. Prefer a small explicit Next.js Route Handler proxy for `/api/v1/[...path]` with safe header forwarding, preserving multipart import and `Set-Cookie` for admin sessions; do **not** add a separate business-logic BFF. Alternatively, a verified Next.js rewrite is acceptable *only* if session cookies, authorization headers and multipart upload work end-to-end; document the tested choice in `docs/decisions.md`. Server rendering may call Symfony directly using `API_INTERNAL_URL`. The browser must not reference the Compose `api` hostname.

**Trust:** Public read, browsing and guest order endpoints are unauthenticated. Product changes and CSV uploads require an admin session authenticated by Symfony. There is no shared filesystem between containers except volume ownership for SQLite on the API side.

## 3. Monorepo layout and ownership

```text
ecommerce/
├── apps/
│   ├── web/                         # Frontend Agent
│   │   ├── src/
│   │   │   ├── app/                 # (shop), products, cart, checkout, order confirmation, admin
│   │   │   │   └── api/v1/[...path]/route.ts  # thin same-origin proxy
│   │   │   ├── components/          # shared UI / daisyUI wrappers
│   │   │   ├── features/            # catalog, cart, checkout, admin
│   │   │   ├── lib/api/             # DTOs, client, errors
│   │   │   └── styles/              # theme + globals
│   │   ├── tests/
│   │   ├── Dockerfile               # DevOps owns with frontend review
│   │   └── package.json
│   └── api/                         # Backend Agent
│       ├── src/
│       │   ├── Controller/Api/V1/   # thin HTTP adapters
│       │   ├── Entity/              # Doctrine entities
│       │   ├── Repository/          # focused Doctrine queries
│       │   ├── Service/             # Product, Import, Checkout, FakePayment
│       │   ├── DTO/                 # request/response mapping
│       │   ├── Security/            # admin session auth
│       │   └── Command/             # seed CSV command
│       ├── migrations/
│       ├── tests/
│       ├── public/
│       ├── var/
│       └── Dockerfile               # DevOps owns with backend review
├── data/products.csv                # original CSV copied intact
├── docs/                             # orchestrator-owned definitions, decisions, QA evidence
├── infra/docker/                     # DevOps
├── scripts/smoke/                    # QA
├── compose.yaml                      # DevOps
├── .env.example                      # DevOps
├── Makefile                          # DevOps; optional convenience only
└── README.md                         # QA & Docs
```

For a weekend, prefer Symfony's native Entity/Repository/Service folders over a complete hexagonal hierarchy. **Boundaries matter more than directory count.** The API Controller must not hold CSV parsing or transaction/stock logic. Doctrine entities must not depend on Next.js types. Integration via documented JSON only.

**Ownership lock:** Orchestrator writes architectural contracts; Backend owns `apps/api/**` except its Dockerfile; Frontend owns `apps/web/**` except its Dockerfile; DevOps owns root Compose/config/infra and both Dockerfiles in coordination; QA owns README, `docs/qa/**`, `scripts/smoke/**`. Use isolated branches/worktrees and one owner per file as required by `00-ORCHESTRATOR.md`.

## 4. SQLite data model — freeze before backend implementation

Use Doctrine migrations. Database file is stored in a backend-only persistent volume at `/data/ecommerce.sqlite`. All timestamps are UTC ISO-8601 in API responses; database timestamps may use Doctrine's UTC convention. Avoid floating-point types for currency.

### 4.1 Tables and columns

| Table | Fields (representative SQL types) | Constraints / relationships |
|---|---|---|
| `categories` | `id` INTEGER PK, `name` VARCHAR(100), `slug` VARCHAR(120) | `slug` UNIQUE; seed dynamic categories from CSV |
| `products` | `id` INTEGER PK, `name` VARCHAR(200), `sku` VARCHAR(100), `description` TEXT NOT NULL DEFAULT '', `category_id` INTEGER NOT NULL, `price_cents` INTEGER NOT NULL, `stock` INTEGER NOT NULL, `weight_kg` DECIMAL(10,3) NOT NULL, nullable `image_url`, `image_source_url`, `image_attribution`, `image_license`, `image_license_url`, `is_active` BOOLEAN NOT NULL DEFAULT 1, `created_at`, `updated_at` | FK category; SKU UNIQUE; CHECK price_cents > 0, stock >= 0, weight_kg >= 0 where supported by migration |
| `product_images` | `id` INTEGER PK, `product_id` INTEGER NOT NULL, `position` INTEGER NOT NULL, nonnull `image_url`, `image_source_url`, `image_attribution`, `image_license`, `image_license_url` | FK product ON DELETE CASCADE; UNIQUE(product_id, position); position 1 or 2. Legacy primary stays on `products`. |
| `orders` | `id` INTEGER PK, `reference` VARCHAR(40), `buyer_name` VARCHAR(200), `buyer_email` VARCHAR(254), `status` VARCHAR(16), `currency` CHAR(3), `total_cents` INTEGER, `idempotency_key` VARCHAR(100), `created_at`, `paid_at` nullable | reference UNIQUE; idempotency_key UNIQUE; status `pending\|paid\|failed` at app boundary; total_cents >= 0 |
| `order_items` | `id` INTEGER PK, `order_id` INTEGER, `product_id` INTEGER NULL, `sku_snapshot` VARCHAR(100), `name_snapshot` VARCHAR(200), `quantity` INTEGER, `unit_price_cents` INTEGER, `line_total_cents` INTEGER | FK order CASCADE; FK product SET NULL; quantity > 0; price > 0; line_total = quantity * unit_price enforced by service |

**Keep imports lightweight:** No `import_jobs`, background worker or inventory ledger is required. Import result is returned synchronously (`inserted`, `skipped`, `rejected`, `issues[]`); a durable import audit may be added only if all P0 criteria are green. Categories have no fixed enum: the supplied CSV spans mixed categories.

**Suggested indexes:** `products(sku)` unique; `products(is_active, category_id, id)` for filtering/pagination; `categories(slug)` unique; `orders(reference)` unique; `orders(idempotency_key)` unique. `LIKE '%term%'` cannot use a normal B-tree prefix index; acceptable for ~100 seed records. Do not promise full-text indexed query plans. Add FTS only if demonstrated necessary, not by default.

### 4.2 Core invariants and decisions

1. **SKU policy:** Trim leading/trailing whitespace and **uppercase ASCII SKU** before persistence; unique on normalized `products.sku`. Reject blank input. Apply identical normalization for CRUD, import and lookups. `rs-001` conflicts with `RS-001`.
2. **Product removal:** Soft delete: set `is_active = false` on `DELETE`. Hide inactive products from public search/detail and prohibit purchase; admin may see inactive records. Do not reuse their SKUs automatically; existing orders remain unchanged. Restoration UI is optional.
3. **Money:** Currency **USD** for the challenge because the supplied CSV uses dollar-formatted prices; freeze `currency: "USD"`. Validate decimal input strictly (max 2 fractional places, > 0); convert with **string-based decimal parsing** to signed 64-bit integer `price_cents` (avoid intermediate PHP float). Serialize API `price_cents` and `total_cents` as integers; frontend formats via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. If user wants MXN later, add explicit currency conversion requirements, not a symbol-only change.
4. **Weight:** `weight_kg` must be nonnegative, required, no more than 3 fractional decimal places. Parse decimal strings exactly; Doctrine decimal mapped to string in PHP. Validation must reject NaN, scientific notation and unsupported precision. API renders a decimal string (e.g. `"0.250"`) to avoid JS rounding.
5. **Stock:** Nonnegative integer. Product view stock is informational; authoritative decision is in backend transaction when purchase completes.
6. **Categories:** `categories` rows created during valid import or admin create; normalize display name trim/collapse whitespace; slug derived consistently. Do not invent a hard-coded whitelist. If invalid CSV row contains category, do not create a dangling category just for that row.
7. **Historical orders:** Order items store immutable SKU/name/price snapshots, independent of subsequent product edits/deactivation.
8. **Validation:** Symfony Validator and DB constraints must agree; return deterministic API errors. Seed input may be dirty; never silently correct invalid required values.

## 5. Safe order lifecycle and concurrent stock handling

**MVP workflow:** `POST /api/v1/orders` performs **order creation + immediate fake successful payment atomically**. No second payment call is required. The client receives a `paid` order only after inventory has been decremented and the transaction committed. This is intentional to minimize states and race conditions; the fake payment is replaceable via one small service interface. `pending`/`failed` are reserved statuses and need not be persisted in the successful path.

**Purchase transaction** (Doctrine DBAL transaction, one SQLite writer at a time; set SQLite `busy_timeout` and use retry only for transient busy errors):

1. Validate guest name/email, nonempty line items, positive integer quantities; coalesce or reject duplicate product IDs (freeze behavior in API contract: **coalesce quantities**).
2. Resolve **active** product rows from database; use stored `price_cents`, not client amounts; require stock >= quantity.
3. Begin the SQLite write transaction **before** checking stock for final purchase, with `BEGIN IMMEDIATE` or equivalent explicitly verified DBAL implementation to acquire the write lock early; avoid relying on ORM read-then-write outside the transaction.
4. Decrement each product with conditional SQL: `UPDATE products SET stock = stock - :qty WHERE id = :id AND is_active = 1 AND stock >= :qty`; require affected rows = 1 for every item. Recheck prices inside the transaction for order totals.
5. Create order, line snapshots and paid timestamp. Fake payment succeeds deterministically within this MVP workflow; if it returns failure, throw/rollback. Commit all stock and order writes together.
6. On insufficient stock/missing product/invalid input, return 409 or 422 per frozen API contract; no committed paid order or stock change.
7. If two buyers race for the final unit, conditional updates + SQLite writer serialization permit **at most one** committed success. Do not attempt row-level `SELECT ... FOR UPDATE`, which is not supported by SQLite.

**Idempotency:** Require header `Idempotency-Key` (UUID or equivalent unique 8–100-char token) on `POST /orders`; frontend creates one stable key for a single checkout attempt and reuses it during network retries. Store unique key in `orders.idempotency_key`; on replay return existing order **without touching stock**. Distinct payload under same key is a 409 conflict: to detect this, store `request_fingerprint` VARCHAR(64) (SHA-256 of canonical buyer+normalized items) on `orders` as well. Acquire write transaction before lookup to avoid check-then-insert races. New checkout after confirmed success needs a new key. Frontend should not generate a fresh key automatically after an ambiguous network failure.

**Order-state note:** `POST /orders` is the complete simulated purchase; avoid an additional `/pay` endpoint in MVP. This satisfies the fake payment requirement while removing orchestration of pending state. If an API document introduces a `/pay` endpoint, orchestrator must reconcile before freeze—there must be **one authoritative purchase flow**.

## 6. CSV parsing, import and seed architecture

Single Symfony `CsvProductImporter` service used by the admin upload controller and a CLI command `app:products:seed`. Input file: `data/products.csv`, copied byte-for-byte from the supplied CSV. Exact header set: `name,sku,description,category,price,stock,weight_kg`, flexible column ordering; BOM tolerated; trimmed whitespace; empty lines skipped.

**Policy:** create-only, first **valid** normalized SKU wins within a file; existing SKU skipped (never overwrite stock/price). Validate each row and report logical source line, error field and reason. Accept strict monetary decimals and one leading `$` as described above, reject invalid/negative/zero price, missing name/SKU/category/weight, invalid/nonintegral/negative stock, malformed weight. Accept empty description. Reusing the importer makes seeding idempotent. Per valid row use a transaction (or transaction boundary that isolates row failures) to avoid partly created categories/products; catch duplicate conflicts and continue.

**Response accounting:** `total_rows` counts all data rows including blank lines; each row is exactly one of `inserted`, `skipped` (blank row or SKU conflict) or `rejected` (invalid), and `total_rows = inserted + skipped + rejected`. `issues[]` includes `{ row, field, code, message }`, with sensible cap and `truncated` flag if large. `POST /products/import` multipart field `file`; max upload 2 MB, require `.csv` extension + parseable content. Admin uploads processed synchronously. Seed prints same summary to stdout; second seed does not mutate existing products.

## 7. Symfony backend boundaries

| Boundary | Responsibilities | Forbidden coupling |
|---|---|---|
| Controllers (`/api/v1`) | Route/method, validation dispatch, auth checks, HTTP status/error envelope | CSV parsing, raw stock mutation loops, business pricing |
| DTO + validator | Required fields, decimal/integer checks, input normalization | Database reads inside DTO |
| Product service / repository | Admin CRUD, active catalog querying, category resolution | Next.js/UI presentation |
| CSV importer + seed command | Iterate rows, validate, insert valid-only, generate report | Separate validation rules for CLI vs upload |
| Checkout service | Validate and normalize items; transactional stock/order writes; idempotency | Trusting browser subtotal; uncontrolled DB writes |
| Fake payment service | Deterministic success; explicit seam for real provider | Network calls / credentials |
| Doctrine migrations/entities | Schema, FK/indexes, persistence mappings | Frontend state |
| Security | Admin login/logout, session cookie, protect mutations | Next.js-only authorization as sole control |

Do not add DTO mapping libraries, message buses, repository interfaces or async infrastructure without demonstrable need. Controllers can directly call well-scoped application services.

## 8. Next.js frontend conventions and design baseline

**Routes:** `/` landing; `/products` searchable catalog; `/products/[id]` detail; `/cart`; `/checkout`; `/orders/[reference]` confirmation; `/admin/login`; `/admin/products`; `/admin/products/new`; `/admin/products/[id]/edit`; `/admin/import`.

**Rendering:** server components for primarily read-only landing/catalog where convenient; client components for search controls, cart, forms, admin mutations and checkout. Do not overcomplicate caching: product catalog should reflect recent CRUD and stock changes; use `cache: 'no-store'` or explicit refresh/revalidation for mutable product queries. Use a typed fetch client (`src/lib/api`) with frozen DTOs from `04-API.md`; surface API errors with field-level messages.

**State:** cart in React context or a small dedicated hook + browser `localStorage`, containing only `{ product_id, quantity }` and checkout-attempt idempotency key. Derived client display totals are estimates, never payment authority. Clear cart and rotate key only after server-confirmed success. No Redux, global server-state framework or generated SDK required.

**Visual contract:** Use daisyUI components and current compatible pinned version, themed via CSS custom properties (`@plugin "daisyui"` and a project theme). Reference-inspired deep forest green, sage, cream, warm accent; editorial serif headlines and legible sans-serif body, rounded product cards, large imagery, responsive layout. Mockup visual identity is inspiration only: CSV contains varied product categories. Curated product images come from HTTPS Wikimedia Commons URLs and carry source/credit/license metadata in the product DTO; show attribution in the UI. Retain deterministic category/product placeholders for missing or failed remote images. Do not invent product-specific claims. Accessible labels, keyboard states, loading/error/empty states are mandatory.

## 9. Admin authentication and session protection

Choose **Symfony-native server-side session** with environment-configured **admin username + password hash** (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`) seeded/configured at container startup; no user table required. Use Symfony password verification (`password_verify` or hasher) and a session-backed security firewall that checks admin role. Login endpoint creates/regenerates session ID; logout invalidates it. Cookies `HttpOnly`, `SameSite=Lax`, `Secure=true` when HTTPS (false only for documented localhost HTTP). Limit session scope to application origin.

**CSRF:** Because sessions are cookie-based, protect state-changing admin endpoints with a CSRF token (sent via explicit `X-CSRF-Token` header or equivalent) validated server-side; login has appropriate CSRF/origin protection. Same-origin Next.js proxy must pass cookies and the CSRF header. Document an exact token-acquisition path in `04-API.md`, e.g. `GET /api/v1/admin/session` returning logged-in status and short-lived CSRF token. Do not claim cookie SameSite alone is full CSRF protection.

**Threat model for MVP:** reject unauthenticated/unauthorized writes and malicious form/CSV input; no hard-coded demo password, no environment secrets in Git and no `NEXT_PUBLIC_` exposure of credentials. Configure modest rate limiting on login if straightforward. Note the one-admin local-only limitation in README; production deployment requires HTTPS, real identity management and deeper security review.

## 10. API v1 contract — preliminary freeze points

`04-API.md` is the authoritative field-by-field request/response specification. Freeze before agents implement against these endpoints. Until then, treat this table as normative routing intent:

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Health and service readiness |
| GET | `/api/v1/products` | Public | Search, category filter, pagination, optional sort |
| GET | `/api/v1/products/{id}` | Public | Active product detail |
| GET | `/api/v1/categories` | Public | Existing category options |
| POST | `/api/v1/admin/login` | Public + anti-CSRF/origin validation | Establish admin session |
| POST | `/api/v1/admin/logout` | Admin | Invalidate session |
| GET | `/api/v1/admin/session` | Public | Admin status and CSRF token when authenticated |
| GET | `/api/v1/admin/products` | Admin | Include inactive catalog items |
| POST | `/api/v1/products` | Admin | Create valid product |
| PATCH | `/api/v1/products/{id}` | Admin | Update allowed product fields |
| DELETE | `/api/v1/products/{id}` | Admin | Soft delete |
| POST | `/api/v1/products/import` | Admin | Multipart CSV create-only import |
| POST | `/api/v1/orders` | Public | Idempotent immediate fake paid checkout |
| GET | `/api/v1/orders/{reference}` | Public with capability token | Confirmation with privacy-safe access |

**Order confirmation privacy:** An order reference by itself must not expose guest name/email. Freeze one of: (a) opaque high-entropy receipt token stored in order and required on GET; or (b) no public GET endpoint, show returned order snapshot directly after payment. **Choose (a)** for reloadable confirmation: add `receipt_token_hash` VARCHAR(64) UNIQUE to `orders`; on checkout generate unpredictable 32-byte token, return it to customer once and use `?token=...` on confirmation GET; store only SHA-256 hash, compare safely; never include buyer email on list endpoints. This is an MVP capability URL; README acknowledges shareability/privacy implications. Do not log tokens.

**Standard error envelope:** `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "sku": ["..."] } } }`. Query response envelope: `{ "data": [...], "pagination": { "page": 1, "per_page": 12, "total": 97, "pages": 9 } }`. `04-API.md` freezes exact keys/types and status codes. Recommended: 400 syntax, 401 auth, 403 CSRF/access, 404 hidden/missing product, 409 SKU/idempotency/stock conflicts, 422 invalid domain inputs, 413 oversized file, 500 unexpected errors.

**Contract items that must not diverge:** `price_cents` integer, `weight_kg` decimal string, `stock` integer, normalized `sku`, UUID-ish idempotency key, quantity integer, order `paid` after commit, soft delete, category normalized, consistent `error` structure and pagination metadata.

## 11. Docker architecture and reproducible setup

**Compose services:**
- `api`: PHP+Symfony with SQLite PDO driver, intl/mbstring as needed, Composer production dependencies, HTTP server binding `0.0.0.0:8000`, `/data` volume, health endpoint. Container runs as writable nonroot UID where possible; `/data` owned by runtime user. For the weekend, a conventional PHP dev-friendly runtime server is acceptable **for local demo only**; mark not production serving topology.
- `web`: pinned Node LTS, Next.js standalone output, production build + `next start` or standalone server binding `0.0.0.0:3000`; `API_INTERNAL_URL=http://api:8000` at runtime. Avoid baking server-only credentials into frontend bundles.
- `volumes`: named `sqlite_data` mapped to `api:/data`; do not store database in image layer or shared source bind-mount.
- API health check gates frontend startup where supported; web readiness/health route optional but recommended.

**Environment:** root `.env.example` with documented safe placeholders, API internal URL, public origin, admin username/password hash, session/CSRF secret, `APP_ENV`, and DB path. Copy to `.env` without committing. Provide a **documented command** to create a password hash using containerized PHP/Symfony (no host PHP required); don't ship reusable credentials as defaults.

**Commands (final exact commands owned by DevOps/README):** `docker compose up --build -d`; `docker compose exec api php bin/console doctrine:migrations:migrate --no-interaction`; `docker compose exec api php bin/console app:products:seed`; `docker compose ps`; `docker compose logs`; tests inside containers. Confirm data survives `docker compose down` and restart; `down -v` intentionally wipes database and must be labelled destructive. Seed should not run on every web request; a manual documented seed command or one-time startup step is sufficient.

**Image sizes/build performance:** multi-stage Dockerfiles where reasonable; use lockfiles; ignore `node_modules`, `.next`, `vendor`, SQLite files, env secrets. Core catalog, admin, and checkout need no external service after build. Curated product photos load directly from Wikimedia Commons in the browser and require network access; failed photo loads use local placeholders.

## 12. Decisions and alternatives (ADRs)

| ADR | Chosen | Considered / reason rejected now |
|---|---|---|
| A-01 | Single monorepo, separate containers | Multiple repos add coordination overhead |
| A-02 | Symfony modular monolith + Doctrine | Full hexagonal/CQRS/microservices too costly for weekend |
| A-03 | SQLite named volume | PostgreSQL would add DB service and violate brief |
| A-04 | Integer minor units USD | Float/REAL currency creates rounding errors |
| A-05 | Normalized uppercase SKU + unique constraint | Case-sensitive unnormalized SKU permits duplicates |
| A-06 | Soft delete for products | Hard deletes complicate historical integrity |
| A-07 | Conditional stock updates inside immediate SQLite transaction | Simple read-then-save and `SELECT FOR UPDATE` unsafe/inapplicable |
| A-08 | Atomic immediate fake payment on `POST /orders` | Separate pending/payment orchestration adds failure states not needed in MVP |
| A-09 | One synchronous importer for upload/seed | Async jobs and two import rule sets add complexity |
| A-10 | Symfony admin session + CSRF | Full user table/OAuth/RBAC over scope; client-only auth unsafe |
| A-11 | Same-origin Next.js proxy | Browser cross-origin cookie/CORS complexity |
| A-12 | Indexed filters + simple case-insensitive SQLite LIKE | External search service unnecessary for seed size |
| A-13 | Local placeholders / restrained brand styling | Product image catalog absent from CSV; stock photos can misrepresent data |

The orchestrator records any deviation in `docs/decisions.md` with date, impacted agents and API/schema version. Do not silently change a frozen ADR.

## 13. Phase gates, agent handoffs and what to build first

**Phase 1 — Gate A (contracts, ~1.5 h):** Approve this document; write and freeze `04-API.md` with precise DTOs, login/CSRF flow, order receipt token, import result shape, search rules and status codes. QA maps AC-01–AC-21. Backend and Frontend acknowledge API version in task handoffs.

**Phase 2 — Gate B (foundation, ~2 h):** DevOps assembles Docker infrastructure while Backend scaffolds Symfony+migrations and Frontend scaffolds Next.js/theme. Exit only when browser→proxy→API health succeeds and SQLite persists across restart.

**Phase 3 — Gate C (backend, ~3.5 h):** Backend owns entities, validation, CRUD, search/import/seed, order+atomic stock, authentication. QA executes API/seed tests. Frontend concurrently works with frozen typed DTOs and fixtures.

**Phase 4 — Gate D (frontend, ~4 h, overlaps phase 3):** Frontend owns real catalog, search, detail, cart, checkout, admin and import UX. Replace mocked network data with actual API in each vertical slice. DevOps resolves proxy/cookie/multipart environment issues.

**Phase 5 — Gate E (integration, ~3 h):** QA verifies clean seed/reseed, CRUD validation and soft delete, search, admin protection, dirty CSV handling, atomic checkout and replay, last-item oversell, UI navigation and persistent volume; agents fix only owned code.

**Phase 6 — Gate F (delivery, ~2 h):** README, final env instructions, decisions, test evidence, fresh `docker compose up --build` run, and known limitations. Orchestrator signs off only verified P0 outcomes.

**Parallel-work boundary:** No implementation may assume final HTTP fields until `04-API.md` is frozen; database decisions in §§4–5 are frozen first. Hand off a task as `{id, owner, dependencies, owned_paths, acceptance, validation_command, branch/commit}` following `00-ORCHESTRATOR.md`. Integrate after each vertical slice, not as a single last-day merge.

**Time-control checkpoints:** At ~8h, require a working Docker + product-list vertical slice. At ~12h, freeze features and prioritize all remaining P0 screens/backend. At ~14–15h, stabilization, automated checks and README only. Never cut CRUD, import, search, simulated purchase, separate containers or seeding; reduce optional polish and unnecessary layers instead.

## 14. Technical definition of done

- [ ] `04-API.md` matches this document and is explicitly frozen by orchestrator.
- [ ] Both containers build/start; browser same-origin API request reaches Symfony.
- [ ] Schema migrated, original CSV seeded, bad rows reported; reseeding creates no duplicates.
- [ ] Admin CRUD works and enforces normalization, unique SKU, validation, soft delete and authorization.
- [ ] Storefront catalog/search uses SQLite-backed API and handles empty/invalid results.
- [ ] Cart/guest checkout produce one paid order with immutable line snapshots and correct server total.
- [ ] Concurrent/replayed order requests cannot oversell or double-decrement stock.
- [ ] Browser admin login/session and CSRF work through proxy; credentials remain server-side.
- [ ] SQLite survives non-destructive container restart.
- [ ] README documents exact local commands, decisions/trade-offs and known limitations.
- [ ] QA evidence records **executed** commands/results for AC-01–AC-21; unexecuted checks are marked **NOT VERIFIED**.

**Next definition:** `04-API.md` should be written *before* `03-BACKEND.md` or `05-FRONTEND.md` implementation begins, because API DTOs and auth/idempotency semantics must be shared by both agents.
