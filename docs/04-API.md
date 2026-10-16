# 04 — API Contract (Frozen v1)

**Project:** Weekend E-Commerce MVP  
**Status:** API v1 frozen by the orchestrator on 2026-10-15; amendments require the coordination process in Section 12.
**Owner:** Orchestrator / Tech Lead; implementation owner: Backend; consumer: Frontend; verification owner: QA.  
**References:** [`00-ORCHESTRATOR.md`](./00-ORCHESTRATOR.md), [`01-PRODUCT.md`](./01-PRODUCT.md), [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md).  
**Delivery constraint:** ~16 elapsed hours target, hard weekend limit; no extra services, background imports, customer accounts, payment provider, or API SDK generation.

> **Contract authority:** This document freezes the HTTP-facing details left open in `02-ARCHITECTURE.md`. If implementation reveals a conflict, the orchestrator must approve one written amendment and notify Backend, Frontend and QA **before** code diverges. Backend must not invent DTOs; Frontend must not guess payloads. All examples are normative unless marked illustrative.

## 1. Runtime, conventions and cross-cutting rules

- **Public base:** browser calls same-origin `/api/v1/*` on Next.js at `http://localhost:3000`; Next.js proxies to Symfony's internal `http://api:8000/api/v1/*`. Browser must never use the Compose `api` hostname.
- **Protocol:** JSON over HTTP; UTF-8. JSON requests require `Content-Type: application/json`; import alone uses `multipart/form-data` (let browser set boundary). Responses use `application/json; charset=utf-8` except `204`.
- **Naming:** JSON keys `snake_case`; paths plural and lowercase; dates UTC ISO 8601 with `Z` (e.g. `2026-10-15T18:00:00Z`); numeric DB IDs are JSON integers; no implicit time-zone conversion.
- **Money:** USD only; all wire amounts are **integer cents** (`price_cents`, `total_cents`, `unit_price_cents`, `line_total_cents`). Never accept a client-supplied checkout price. Admin product create/patch accepts `price` as **decimal string**, e.g. `"29.99"`, converted without floating point. Product responses expose only `price_cents`, not a duplicate price field.
- **Weight:** wire `weight_kg` is a decimal **string with exactly three fractional digits** on output (e.g. `"0.250"`); request accepts `"0"`, `"1.2"`, `"1.234"` (max 3 fractional digits), never JSON number. SQLite/Doctrine decimal handling stays exact.
- **SKU:** trim and uppercase ASCII before save and return. Case-insensitive conflicts resolve against normalized stored SKU, even if an existing product is inactive.
- **Currency:** always `"USD"`; format only at presentation layer.
- **Content limits:** max JSON request body 64 KiB; CSV upload 2 MiB. Ignore unspecified JSON *response* fields for forward compatibility, but reject unknown JSON *request* fields (`422 INVALID_FIELD`).
- **Pagination:** page-based, 1-indexed, default `page=1`, `per_page=12`, max `per_page=100`; stable secondary sort by ascending product `id`. An out-of-range page returns `200` with empty `data` and accurate metadata. Empty collection: `pages=0`.
- **Security headers:** JSON endpoints `Cache-Control: no-store` for authenticated sessions, orders, mutations, and CSRF bootstrap. Do not log cookies, auth credentials, CSRF tokens, idempotency keys or receipt tokens. Browser-facing receipt pages set `Referrer-Policy: no-referrer`.
- **CORS:** not needed for same-origin browser proxy. Do not set wildcard credentialed CORS. Proxy must preserve response status/body and `Set-Cookie` and forward incoming `Cookie`, `Content-Type`, `X-CSRF-Token`, `Idempotency-Key`; do not forward untrusted hop-by-hop headers. Session cookies must be scoped to browser origin, not internal API host.

## 2. Canonical DTOs

### 2.1 Product

```ts
type Product = {
  id: number;
  name: string;
  sku: string;
  description: string;
  category: { id: number; name: string; slug: string };
  price_cents: number;          // integer > 0, USD
  currency: 'USD';
  stock: number;                // integer >= 0
  weight_kg: string;            // fixed decimal e.g. '0.250'
  image_url: string | null;      // curated HTTPS image, null when unavailable
  image_source_url: string | null; // source page for the image
  image_attribution: string | null; // plain-text creator credit
  image_license: string | null; // e.g. 'CC BY-SA 4.0' or 'CC0'
  image_license_url: string | null;
  is_active: boolean;
  created_at: string;           // ISO UTC
  updated_at: string;
};
type Category = { id: number; name: string; slug: string };

type ProductWrite = {
  name: string;                 // trimmed, 1..200 chars
  sku: string;                  // ASCII trimmed/upcased, 1..100 chars
  description: string;          // 0..5000 chars
  category: string;             // category display name, 1..100 chars
  price: string;                // USD decimal string: '10' or '10.25'
  stock: number;                // integer >= 0
  weight_kg: string;            // decimal string, >= 0, precision <= 3
};
```

**Write rules:** `POST` requires every key above except `description` (defaults to `""`); `PATCH` accepts any **nonempty subset** of these keys, with identical validation for supplied keys; no `id`, `is_active`, `price_cents`, timestamps, or `currency` accepted in request. Trim/collapse internal whitespace for category display name; stable lowercase hyphen slug and uniqueness. Create category only after product validations succeed. `price` is positive, max 2 decimals, max 999999999.99 USD; weight max 9999999.999 kg; reject exponents, commas, `NaN`, negative, boolean, and JSON numeric values for decimals. `stock` must be a JSON integer (never numeric string). `name`, `sku`, `category` must not be whitespace-only. `description` may be empty. `PATCH` cannot reactivate a soft-deleted product: no restore endpoint in MVP.

**Public visibility:** `GET /products` and `GET /products/{id}` return only active items; admin list returns both active and inactive. Category filtering for public catalog includes categories even if currently empty only when persisted; `GET /categories` returns categories with **at least one active product** in alphabetic name order.

**Image enrichment amendment (2026-10-16):** Product image fields are nullable response fields. Existing product writes and CSV header remain unchanged. A separate idempotent server-side catalog command reads `data/product-images.json`, matches normalized SKU, and fills image fields for seeded products after migration/CSV seed. Image URLs are direct HTTPS Wikimedia Commons thumbnail URLs; source, creator, and license metadata must travel with them so the UI can show attribution. The command must not overwrite a non-null image URL on restart. No image bytes are stored locally or in SQLite. Products without a curated match retain the existing visual fallback.

### 2.2 Error envelope (ALL non-2xx JSON errors)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": { "stock": ["Must be a non-negative integer."] }
  }
}
```

`error.code` and `error.message` are always strings. `error.fields` is **always present**, even if `{}`; each key is a request field name or `items[0].quantity` and maps to nonempty string array. No stack traces, SQL errors or raw exception text in responses. For malformed JSON use `400 BAD_JSON`; for query syntax use `400 BAD_QUERY`; for domain validation use `422 VALIDATION_ERROR` (or `INVALID_FIELD` for unexpected keys); for conflicts use `409` with specific code; for authentication use `401 UNAUTHENTICATED`; for missing/insufficient permission or CSRF use `403 FORBIDDEN` / `CSRF_INVALID`; for unknown records `404 NOT_FOUND`; for unsupported media `415 UNSUPPORTED_MEDIA_TYPE`; oversized import `413 FILE_TOO_LARGE`; unforeseen errors `500 INTERNAL_ERROR` with generic message. `503 SERVICE_UNAVAILABLE` may be used if DB unavailable. No HTTP 200 with error body.

### 2.3 List envelope

```json
{
  "data": [],
  "pagination": { "page": 1, "per_page": 12, "total": 0, "pages": 0 }
}
```

For non-list successes, use `{ "data": <object> }`, except the import result (`{ "data": ImportResult }`) and `204` responses. Pagination totals count the **filtered** products, not all products.

## 3. Endpoint matrix (complete MVP surface)

| Method | Path (prefix `/api/v1`) | Audience | Success | Main failure cases |
|---|---|---|---|---|
| GET | `/health` | Public | 200 | 503 |
| GET | `/categories` | Public | 200 | 500 |
| GET | `/products` | Public | 200 | 400 |
| GET | `/products/{id}` | Public | 200 | 400, 404 |
| GET | `/admin/session` | Public bootstrap | 200 | 500 |
| POST | `/admin/login` | Anonymous | 200 | 400, 401, 403, 422 |
| POST | `/admin/logout` | Admin | 204 | 401, 403 |
| GET | `/admin/products` | Admin | 200 | 400, 401 |
| GET | `/admin/products/{id}` | Admin | 200 | 401, 404 |
| POST | `/products` | Admin | 201 | 400, 401, 403, 409, 422 |
| PATCH | `/products/{id}` | Admin | 200 | 400, 401, 403, 404, 409, 422 |
| DELETE | `/products/{id}` | Admin | 204 | 400, 401, 403, 404 |
| POST | `/products/import` | Admin | 200 | 400, 401, 403, 413, 415, 422 |
| POST | `/orders` | Public | 201 or 200 replay | 400, 409, 422 |
| GET | `/orders/{reference}` | Token capability | 200 | 400, 404 |

**No** `/pay`, product reactivation, order listing, customer accounts, category CRUD, import preview, or asynchronous job endpoints in this MVP.

## 4. Public catalog endpoints

### 4.1 `GET /health`

Response `200`:

```json
{ "data": { "status": "ok", "database": "ok" } }
```

Check SQLite connectivity (not merely web-server liveness). Return `503 SERVICE_UNAVAILABLE` with standard error if DB is inaccessible; no secrets, version or filesystem paths exposed.

### 4.2 `GET /categories`

`200`:

```json
{ "data": [{ "id": 1, "name": "Kitchenware", "slug": "kitchenware" }] }
```

### 4.3 `GET /products`

Query params: `q` optional trimmed string max 100 chars; `category` optional **slug** string; `page`, `per_page` as positive base-10 integers; `sort` one of `name_asc` (default), `name_desc`, `price_asc`, `price_desc`, `newest`. Reject unknown params and unsupported sort with `400 BAD_QUERY`. `q` is case-insensitive substring match against `name` or `sku` (literal term; escape `%` and `_` for SQL `LIKE`); combine category and query via AND. Deterministic `id ASC` tie-breaker.

Example: `GET /api/v1/products?q=steel&category=kitchenware&page=1&per_page=12&sort=price_asc`

`200`:

```json
{
  "data": [
    {
      "id": 42, "name": "Steel Bottle", "sku": "BS-021",
      "description": "Reusable bottle", "category": { "id": 1, "name": "Kitchenware", "slug": "kitchenware" },
      "price_cents": 2999, "currency": "USD", "stock": 5,
      "weight_kg": "0.350", "is_active": true,
      "created_at": "2026-10-15T18:00:00Z", "updated_at": "2026-10-15T18:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 12, "total": 1, "pages": 1 }
}
```

### 4.4 `GET /products/{id}`

Positive integer path ID. `200`: `{ "data": Product }`. Missing or inactive product returns **404** with `NOT_FOUND` (do not disclose that it exists but was deactivated). Invalid path ID returns `400 BAD_QUERY`.

## 5. Admin authentication, sessions and CSRF

### 5.1 Browser/session model

Symfony owns the admin session; no user table or JWT. Admin credentials are read from server-only `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`; no password values shipped in Git. Password hash validation uses Symfony/PHP hasher. Sessions are cookie-based and scoped to the public same-origin proxy path. Cookie flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` under HTTPS (localhost HTTP exception); regenerate session ID on login; invalidate on logout. Do **not** expose admin password hashes or backend session IDs in JSON or browser storage.

**CSRF bootstrap:** `GET /admin/session` initializes an anonymous server session when needed, returning a CSRF token intended for the login form. Same route returns auth status and an authenticated-session CSRF token after successful login. Token is server-generated, bound to Symfony session, and validated for all admin POST/PATCH/DELETE including login. A token remains usable throughout its current session; logout invalidates it. This is **not** an access credential: possession of a token never bypasses authentication.

**Origin checks:** For state-changing requests using the admin session, require an allowed browser `Origin` matching `PUBLIC_ORIGIN` when the header is present; reject mismatches as `403 FORBIDDEN`. For absent `Origin` (e.g. automated clients), accept valid session+CSRF token. Login also requires session CSRF. Do not trust `X-Forwarded-*` from arbitrary external callers; proxy must be configured for expected trusted origin/proxy only.

### 5.2 `GET /admin/session`

Unauthenticated `200` (also sets session cookie if absent):

```json
{ "data": { "authenticated": false, "username": null, "csrf_token": "csrf_example_opaque" } }
```

Authenticated `200`:

```json
{ "data": { "authenticated": true, "username": "admin", "csrf_token": "csrf_example_opaque" } }
```

Response always `Cache-Control: no-store`. For unauthenticated storefront users this endpoint is optional to call; use it only when loading admin/login UIs.

### 5.3 `POST /admin/login`

Requires session cookie from bootstrap and `X-CSRF-Token` from that session. JSON:

```json
{ "username": "admin", "password": "example-entered-secret" }
```

`200` (regenerate session ID and issue **new** CSRF token; replace any old token in frontend state):

```json
{ "data": { "authenticated": true, "username": "admin", "csrf_token": "new_opaque_csrf_token" } }
```

Invalid credentials: `401 INVALID_CREDENTIALS` with standard envelope and generic message (do not reveal whether username or password was wrong). Missing/invalid CSRF: `403 CSRF_INVALID`; missing/invalid fields: `422 VALIDATION_ERROR`. No redirect response at API layer.

### 5.4 `POST /admin/logout`

Requires current admin cookie and current `X-CSRF-Token`. `204` with empty body, invalidate server session + cookie. Missing session: `401 UNAUTHENTICATED`. Missing/invalid token: `403 CSRF_INVALID`. UI clears admin state and navigates to `/admin/login`.

### 5.5 Rules for ALL protected operations

`GET /admin/products*` requires valid authenticated session, **no CSRF header**. All admin mutations (`POST /products`, `PATCH/DELETE /products/{id}`, `POST /products/import`, logout) require both authenticated session and `X-CSRF-Token`. Fail auth first (`401`) then CSRF (`403`). Frontend calls `/admin/session` when entering admin; on `401` navigate to login; on `403 CSRF_INVALID`, refetch session/CSRF and ask user to retry (do not blindly repeat destructive operations). Use `credentials: 'same-origin'` from browser.

## 6. Admin product operations

### 6.1 `GET /admin/products`

Same `q`, `category`, `page`, `per_page`, `sort` rules as public listing, plus `status=all|active|inactive` (default `all`). Includes inactive products and same product DTO. `200`: canonical list envelope. Only authenticated admin can call it.

### 6.2 `GET /admin/products/{id}`

`200`: `{ "data": Product }` including inactive; `404 NOT_FOUND` for missing ID. Used by edit screen to display current values.

### 6.3 `POST /products`

Authenticated + CSRF. Request:

```json
{
  "name": "Reusable Bottle", "sku": "bs-200", "description": "Stainless steel",
  "category": "Kitchenware", "price": "29.99", "stock": 12, "weight_kg": "0.350"
}
```

`201` with `Location: /api/v1/products/{id}` and `{ "data": Product }`; returned SKU `BS-200`, `price_cents: 2999`, `weight_kg: "0.350"`. Duplicate normalized SKU, including inactive records: `409 SKU_CONFLICT` and `fields: {"sku": ["SKU already exists."]}`. Validation failures `422 VALIDATION_ERROR`; no partial category/product writes.

### 6.4 `PATCH /products/{id}`

Authenticated + CSRF. JSON Merge-Patch **is not** implemented: use ordinary partial JSON object, e.g. `{ "name": "Updated bottle", "price": "30.00", "stock": 4 }`; omitted keys unchanged, `null` rejected; `{}` rejected `422`. `200` `{ "data": Product }`. Missing/inactive product: `404 NOT_FOUND`; SKU uniqueness check includes inactive records. Editing inactive items is unsupported (no restore in MVP).

### 6.5 `DELETE /products/{id}`

Authenticated + CSRF. `204` no body. Soft-delete (`is_active=false`), never remove historical order snapshots or free SKU. Missing or already inactive product: `404 NOT_FOUND`. The Frontend must remove the product from visible public views after successful deletion.

## 7. CSV import and seed

### 7.1 `POST /products/import`

Authenticated + CSRF. `multipart/form-data`, exactly one file field named `file`, filename ending in `.csv` (case-insensitive), size `1..2,097,152` bytes, parseable UTF-8 CSV, header fields exactly `name,sku,description,category,price,stock,weight_kg` (case-sensitive after UTF-8 BOM removal + trim), in any order; extra/duplicate/missing columns cause **whole-file** rejection `422 CSV_HEADER_INVALID` and no writes. Unexpected other multipart fields: `422 VALIDATION_ERROR`. `415 UNSUPPORTED_MEDIA_TYPE` for non-multipart or invalid extension; `413 FILE_TOO_LARGE` for size cap; `422 CSV_EMPTY` if no header or no data rows. CSV formula-like field values are treated as data only, never evaluated.

Parser accepts quoted commas and newlines per standard RFC 4180-style CSV; returns **logical data-record positions**: `row=2` is first data record immediately after header, `row=3` is next data record even if a quoted field contains a newline. Blank data rows count as skipped; importer must not infer row numbers from physical line breaks. `total_rows` includes blank data records and excludes the header; normalize blank-line parsing to match attached CSV (97 data records). Zero-length optional description is valid. All other required fields follow product validation, except imported `stock` may be textual digits and imported `price` may have exactly one leading `$` (e.g. `$29.99`). `weight_kg` max three decimal places; negative/fractional stock rejected.

**Deterministic create-only processing:** first **valid** occurrence of a normalized SKU in file is eligible; subsequent occurrences skipped with `DUPLICATE_IN_FILE`. If product exists in DB, skip with `SKU_EXISTS`, whether active or inactive. An invalid earlier occurrence does not reserve the SKU. Invalid row yields `rejected`. Empty row yields `skipped` issue `EMPTY_ROW`. Inserted rows are committed individually (or with per-row savepoint) so one bad row cannot roll back all valid records. No async worker, preview workflow, or upsert.

`200` response:

```json
{
  "data": {
    "total_rows": 5,
    "inserted": 2,
    "skipped": 2,
    "rejected": 1,
    "issues": [
      { "row": 3, "field": "sku", "code": "DUPLICATE_IN_FILE", "message": "Duplicate SKU in uploaded file." },
      { "row": 4, "field": "stock", "code": "INVALID_STOCK", "message": "Stock must be a non-negative integer." },
      { "row": 5, "field": "row", "code": "EMPTY_ROW", "message": "Blank row skipped." }
    ],
    "truncated": false
  }
}
```

**Accounting invariant:** `total_rows = inserted + skipped + rejected` even when errors truncated. An `issues` entry is emitted for each skipped nonempty duplicate or rejected record; blank skips may also emit `EMPTY_ROW`. Issue ordering follows input row order then stable field order. Limit visible `issues` to first 200, set `truncated: true` if additional issues omitted. Import partially succeeds by design and returns `200`, not `207`. UI must display counts and issues, clearly labeling partial success.

**Whole-file failure:** invalid header/empty upload/unparseable file returns standard error envelope and **no inserts**. For internal I/O failure during processing: `500 INTERNAL_ERROR`; already committed accepted rows may remain, clearly disclose this as a known synchronous-import limitation in README (rerun is safe because create-only). Maximum file size limits worst-case damage.

### 7.2 CLI seed — same service, not an HTTP endpoint

`php bin/console app:products:seed --file=/app/data/products.csv` uses **exact same importer and validation**; bundled CSV copied unchanged. It prints JSON with the same `ImportResult` data properties to stdout (or equivalent machine-readable summary) and exits `0` if file parsed, even with row-level rejects; exits nonzero for whole-file failure. Second run creates no duplicates and does not reset stock/price on existing SKUs. The DevOps agent must document the equivalent `docker compose exec api ...` command and mount/copy the seed fixture into the API image.

## 8. Guest checkout and purchase DTOs

### 8.1 `POST /orders` — single authoritative fake-payment operation

No authentication. Requires header `Idempotency-Key`: **UUID v4 string** (36 chars, lowercase/uppercase accepted); one stable UUID for a specific checkout attempt. Frontend retains key through transport retry, refresh, and ambiguous response; makes a *new* key only for a new intended purchase after confirmed result or explicit user-initiated reset. Body:

```json
{
  "buyer_name": "Alex Customer",
  "buyer_email": "alex@example.com",
  "items": [
    { "product_id": 42, "quantity": 1 },
    { "product_id": 12, "quantity": 2 }
  ]
}
```

Rules: `buyer_name` trimmed length 1..200; `buyer_email` valid address max 254 (normalize by trimming and lowercasing for request fingerprint); `items` 1..50 entries; each `product_id` positive JSON integer and `quantity` integer 1..999; **coalesce duplicate product IDs by summing quantity** (reject if combined exceeds 999). Unknown body fields rejected. Order item order canonicalized ascending `product_id`; fingerprint = SHA-256 of canonical JSON containing normalized name, normalized email and sorted coalesced items. `Idempotency-Key` missing/malformed: `422 VALIDATION_ERROR` in `fields["Idempotency-Key"]`.

**Checkout algorithm (normative):** acquire SQLite write transaction early (`BEGIN IMMEDIATE` or proven equivalent) → normalize+fingerprint request → find existing order by unique idempotency key → if same fingerprint, return replay; if different fingerprint, `409 IDEMPOTENCY_CONFLICT` → fetch active products and server prices → conditional decrements `UPDATE ... WHERE stock >= quantity AND is_active=1`; require one affected row each → snapshot items/prices → deterministic fake payment success → create paid order and receipt capability → commit. Roll back on *any* failure. Configured `busy_timeout` and at most one bounded retry for transient SQLite busy errors. This ensures at most one sale of the final unit.

First successful checkout: `201`:

```json
{
  "data": {
    "reference": "ORD-A8F12C7D90",
    "status": "paid",
    "currency": "USD",
    "total_cents": 8997,
    "buyer_name": "Alex Customer",
    "buyer_email": "alex@example.com",
    "items": [
      {
        "product_id": 42, "sku": "BS-021", "name": "Steel Bottle",
        "quantity": 1, "unit_price_cents": 2999, "line_total_cents": 2999
      },
      {
        "product_id": 12, "sku": "SP-100", "name": "Sample Product",
        "quantity": 2, "unit_price_cents": 2999, "line_total_cents": 5998
      }
    ],
    "created_at": "2026-10-15T18:00:00Z",
    "paid_at": "2026-10-15T18:00:00Z",
    "receipt_token": "opaque_server_derived_secret_token"
  }
}
```

**Stable-replay receipt solution:** To support recovery after a lost first response *without storing bearer receipt tokens in plaintext*, derive the token as lowercase hex `HMAC-SHA256(RECEIPT_SECRET, "receipt:v1:" + normalized_uuid_idempotency_key)`. `RECEIPT_SECRET` is a separate server-only high-entropy 32+ byte key, stable across container restarts and documented as a required environment secret. Store only SHA-256 of the token as unique `orders.receipt_token_hash`; on replay recompute token from the stored order key and secret. This is opaque to clients and unpredictable without the server secret. Do not include the idempotency key itself in order GET or confirmation URLs. **Secret rotation invalidates old receipt URLs** in MVP; document this. Never log token or secret. `reference` is a random, non-sequential public identifier (e.g. `ORD-` plus 10+ hex characters), not an integer order ID.

Replay same key+same canonical payload: `200` with **same response shape and same receipt token**, without creating another order, running fake payment again or decrementing stock. Same key+different canonical payload: `409 IDEMPOTENCY_CONFLICT`, `fields: {}`. If insufficient stock: `409 INSUFFICIENT_STOCK` with `fields["items"]` or precise indexed item field; if missing/inactive product: `409 PRODUCT_UNAVAILABLE`; if invalid payload: `422 VALIDATION_ERROR`. None creates a paid order or reduces inventory. Frontend retains cart and displays actionable error. Network failures do not imply checkout failed: retry with same key, never auto-generate another key.

### 8.2 `GET /orders/{reference}` — secure receipt lookup

Public endpoint **requires** `token` query parameter containing 64-char lowercase hexadecimal receipt capability: `GET /api/v1/orders/ORD-A8F12C7D90?token=<64-hex-token>`. Hash provided token with SHA-256 and compare to stored `receipt_token_hash` using constant-time equality. Response `200` `{ "data": OrderReceipt }`, where `OrderReceipt` has all order fields above **except `receipt_token`**. Missing/malformed token: `400 BAD_QUERY`; unknown reference or valid-format incorrect token: uniform `404 NOT_FOUND` (do not disclose whether order exists). The UI confirmation page `/orders/[reference]?token=...` can reload after Docker restart. Treat link as bearer capability; never expose through search indexes, referrers, analytics, or server logs; page uses `no-store` and `Referrer-Policy: no-referrer`. Do not place guest data in order listing or any other public endpoint.

## 9. Example failure payloads

**Duplicate SKU (`409`)**

```json
{ "error": { "code": "SKU_CONFLICT", "message": "SKU already exists.", "fields": { "sku": ["SKU already exists."] } } }
```

**Insufficient stock (`409`)**

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "One or more items are out of stock.", "fields": { "items": ["Check available quantities and retry."] } } }
```

**Unauthenticated admin (`401`)**

```json
{ "error": { "code": "UNAUTHENTICATED", "message": "Administrator login required.", "fields": {} } }
```

**Expired/invalid CSRF (`403`)**

```json
{ "error": { "code": "CSRF_INVALID", "message": "Session validation failed. Refresh and retry.", "fields": {} } }
```

**Invalid CSV header (`422`)**

```json
{ "error": { "code": "CSV_HEADER_INVALID", "message": "CSV columns do not match the required schema.", "fields": { "file": ["Expected name,sku,description,category,price,stock,weight_kg."] } } }
```

**Idempotency-key reuse with changed cart (`409`)**

```json
{ "error": { "code": "IDEMPOTENCY_CONFLICT", "message": "Checkout key already belongs to another request.", "fields": {} } }
```

## 10. Frontend ↔ Backend implementation obligations

**Backend agent:** implement **exact** routes and JSON keys; enforce auth/CSRF on mutations; normalize all product writes/import inputs identically; validate all inputs server-side; use SQLite transaction and conditional stock decrements; return the exact replay behavior and receipt capabilities; add unit/integration tests for this contract. Backend controls `apps/api/**`, excluding its Dockerfile.

**Frontend agent:** create typed DTOs matching this file (`apps/web/src/lib/api/types.ts`), centralized request/error handling and correct cookie/CSRF flow. Store only `{product_id, quantity}` cart lines, not authoritative prices. Call same-origin `/api/v1/*` with `credentials: 'same-origin'`; set `X-CSRF-Token` only on admin mutation; set stable UUID `Idempotency-Key` on checkout; preserve cart and key if outcome uncertain; after confirmed success clear cart and navigate to receipt URL; no hidden API assumptions. Frontend controls `apps/web/**`, excluding Dockerfile.

**DevOps agent:** configure session-safe same-origin proxy, server-only secret values, stable SQLite volume, health checks, seed fixture, 2 MiB CSV limit and documented admin password hash generation; ensure cookies and multipart boundaries survive proxying. DevOps controls Compose, infra/config and both Dockerfiles only. No default reusable admin password/secret.

**QA agent:** own HTTP contract tests/checklist and browser end-to-end smoke flow; cover auth bootstrap, invalid CSRF, all CRUD, CSV accounting and rerun, public search, order replay/conflict, receipt security, insufficient and racing stock, persistence and 500-safe errors. QA owns `docs/qa/**`, `scripts/smoke/**`, README; tests inside app repositories may be contributed via handoff to code owner.

**Orchestrator:** freeze this file in Phase 1, inform all agents of contract version, mediate conflicts, run tests and refuse to accept undocumented API drift. Do not ask agents to implement a second `/pay` endpoint.

## 11. Contract verification matrix / gates

| Check | Request or action | Expected outcome | Product AC |
|---|---|---|---|
| C-01 | GET `/health` after Docker up | 200, DB healthy | AC-01 |
| C-02 | Seed supplied CSV, repeat | Valid records inserted first run, second has no inserts | AC-02, 03 |
| C-03 | GET public products, search mixed-case `q`, filter and paginate | 200, deterministic active results | AC-09, 10 |
| C-04 | POST admin mutation without session | 401 | AC-08 |
| C-05 | Login with missing/bad CSRF | 403; no admin session | AC-08 |
| C-06 | Login then create/patch/delete product with valid token | 201/200/204 and public visibility updated | AC-04, 05, 07 |
| C-07 | Duplicate SKU, invalid price/stock/weight | 409/422 and no partial writes | AC-06 |
| C-08 | Upload real dirty CSV twice | Valid inserts, row issues; rerun no duplicates | AC-11, 12 |
| C-09 | Add/change cart client-side and refresh | Quantity persists; API price authoritative | AC-13 |
| C-10 | POST valid order with UUID key | 201 paid; server total correct; stock decremented | AC-14, 15 |
| C-11 | Repeat same key + body; repeat same key + changed body | 200 same receipt/no extra decrement; 409 conflict | AC-16 |
| C-12 | Purchase above stock / unavailable product | 409, no paid order, no negative stock | AC-17 |
| C-13 | Two concurrent last-unit checkouts | At most one 201, no overselling | AC-18 |
| C-14 | GET order by reference only / wrong token / valid token | 400 / 404 / 200; no information leak | AC-19 |
| C-15 | Restart containers and reload valid receipt | Order and SQLite data persist | AC-19 |
| C-16 | Browser storefront/admin; documented clean setup | Complete accessible UI journeys, no undeclared steps | AC-20, 21 |

**Freeze checklist before parallel implementation:**

- [ ] Backend and Frontend sign off on exact Product / Category / Order DTOs and error envelope.
- [ ] Orchestrator signs off on auth bootstrap, proxy cookie+CSRF behavior, and secrets.
- [ ] Orchestrator signs off on one-step atomic paid checkout, idempotency key and receipt-token derivation.
- [ ] Backend and QA agree on CSV logical row numbering and accounting invariant.
- [ ] DevOps verifies same-origin proxy preserves multipart, cookie and custom headers with a smoke request.
- [ ] No ambiguous endpoint, status code or required request property remains in mandatory flow.

## 12. Deliberate omissions and safe amendment policy

This MVP excludes user registration, OAuth, address/shipping/tax collection, real charge/capture/refund flows, API version negotiation, rate limiting as a dedicated service, dashboards, upload history, bulk product upserts, restored deleted products, audit events and scalable full-text search. Production hardening (TLS termination, brute-force protection, secret rotation procedures, backup and recovery, payment and tax compliance, distributed write scaling) belongs in the README's **future work** section; do not pretend the weekend MVP solves it.

**Changes after freeze:** create a short entry in `docs/decisions.md` with proposed request/response differences, compatibility impact, AC impact, owner, and approval. Notify both consuming agents and QA; only then modify spec/code. Never silently deviate from an error code or field name.

**Next implementation definitions:** `03-BACKEND.md`, `05-FRONTEND.md`, `06-INFRASTRUCTURE.md`, `07-QUALITY.md`. Their instructions may add implementation detail, but must not redefine this wire contract.
