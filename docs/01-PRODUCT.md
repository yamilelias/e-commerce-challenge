# 01 — Product Definition & Acceptance Contract

**Project:** Weekend E-Commerce MVP  
**Status:** MVP product specification — ready for technical contract review  
**Owner:** Orchestrator / Tech Lead  
**Execution contract:** [`00-ORCHESTRATOR.md`](./00-ORCHESTRATOR.md)  
**Time box:** Target ~16 elapsed work hours; hard weekend limit and final stabilization buffer as defined in `00-ORCHESTRATOR.md`  
**Implementation stack (non-negotiable):** Next.js + React + TypeScript + Tailwind CSS + daisyUI frontend; PHP + Symfony backend; SQLite via Doctrine; separate frontend and backend Docker containers using Compose.

> **Operating principle:** Deliver every mandatory challenge feature as a small, testable vertical slice. Enterprise quality means explicit boundaries, validation, consistent state, safe stock and order handling, tests, and reproducible local setup—not production-scale infrastructure.

## 1. Product vision, users and outcomes

Build a responsive demonstration shop that lets a customer discover products, search and purchase them with simulated payment, and lets an administrator maintain the product catalog manually or through CSV import. An evaluator must be able to start the stack locally, seed the supplied CSV, and complete both journeys without private services.

| Persona | Goal | MVP outcome |
|---|---|---|
| Shopper (public) | Find and purchase products quickly | Browse/search catalog, manage cart, simulate payment, see order confirmation |
| Catalog administrator | Keep product data accurate | View/create/edit/delete products; import CSV and inspect results |
| Reviewer/developer | Evaluate quickly and reliably | Docker startup, persistent SQLite, deterministic seed, documented tests and choices |

**Primary success signal:** A clean local install supports CSV seed → product browse/search → admin CRUD/import → successful order → stock update, all through the required UIs and API.

## 2. Scope contract

### P0 — Must ship

1. **Catalog/storefront:** landing page inspired by supplied visual reference, product listing/cards, product detail or equivalent detailed view, responsive navigation, empty/loading/error states.
2. **Search:** find products by name or SKU (case-insensitive); support category filter and server-side pagination; display meaningful zero-result state.
3. **Admin product CRUD:** list, create, view, edit and delete; server validation and actionable errors.
4. **CSV import:** administrative upload using seven specified columns; validate rows, import accepted products according to documented conflict policy, and show success/error counts with row-level reasons.
5. **SQLite and seed:** migrations plus repeatable command to seed the bundled CSV; preserve valid records and report rejected/conflicting input deterministically.
6. **Cart:** add/remove items, change quantities, show subtotal, persist within the browser (e.g., localStorage); reconcile stale stock/prices at checkout.
7. **Fake purchase:** review order, submit checkout, create persisted order with line snapshots, simulate successful payment, display confirmation; decrease inventory exactly once.
8. **Admin access control:** protect product writes/import from anonymous access using minimal documented authentication; keep secrets out of Git.
9. **Dockerized application:** distinct web and API services; persistent SQLite file volume; reproducible one-command local startup and documented seed steps.
10. **README and checks:** architecture/decision rationale, alternatives, setup, demo instructions, tests, limitations and at least critical-path automated/smoke tests.

### P1 — Only after P0 is stable

- CSV pre-import preview, additional sorting/filter combinations, richer responsive polish, better image curation, extra frontend E2E cases.

### Out of scope (do not start)

- Real payments, accounts for shoppers, shipping, tax, discount codes, delivery tracking, email, product reviews, wishlists, external product search, background jobs, analytics, multi-tenancy, cloud deployment, sophisticated identity/RBAC or full content management.

**Scope guard:** No optional feature may displace an unfinished P0 requirement. When time is tight, simplify UI and internal abstractions rather than omitting required behaviors.

## 3. Source assets and product presentation

### Supplied dataset

Input file: `LoanPro Code Challenge E-Commerce - LoanPro Code Challenge E-Commerce.csv` (copy into repository as `data/products.csv` without quietly editing the source). Observed file characteristics:

- **97 data rows**, **7 columns**: `name,sku,description,category,price,stock,weight_kg`.
- The data spans **18 nonblank category values** (e.g., Electronics, Footwear, Kitchen, Home & Office); it is *not* exclusively kitchenware.
- Repeated SKUs occur (notably `RS-001` and `BS-021`); blank SKU rows also exist.
- Examples of dirty input: `$29.99` price, negative stock (`DL-007`), missing/whitespace names (`HD-099`, `WS-001`), absent weight (`GK-088`), missing category (`GC-025`), and two empty rows.

These observations are **test fixtures**, not permission to repair values silently or assume a specific successful-import count. The importer must report what it did.

### Design reference

The provided mockup shows a premium, eco-oriented kitchenware storefront with deep forest greens, sage accents, warm neutral surfaces, editorial serif headings, rounded cards, prominent product photography, and an image-led hero.

**MVP guidance:** Apply its visual *language* to the real mixed-category catalog. Do not label non-kitchen products as sustainably sourced without data. Use intentional local imagery for hero/category storytelling and deterministic neutral placeholders for products without images. Product photos are not a required CSV field; no remote image API is needed.

**UI requirements:** Use daisyUI's official theme/component patterns (custom theme tokens rather than arbitrary per-component overrides); keyboard-accessible forms, labelled inputs, visible validation, responsive storefront and usable admin screens. Use a pinned compatible daisyUI version in the lockfile.

## 4. Concise user stories

| ID | Persona | User story | Priority |
|---|---|---|---|
| US-01 | Shopper | I can browse a visually clear product catalog so I can explore items. | P0 |
| US-02 | Shopper | I can search by product name/SKU and filter by category so I can find an item. | P0 |
| US-03 | Shopper | I can inspect a product's price, description, category, weight and available stock. | P0 |
| US-04 | Shopper | I can add an in-stock item to my cart, change quantities and remove it. | P0 |
| US-05 | Shopper | I can complete a simulated purchase and receive an order confirmation. | P0 |
| US-06 | Admin | I can list, create and edit products with validation feedback. | P0 |
| US-07 | Admin | I can delete a product without corrupting existing orders. | P0 |
| US-08 | Admin | I can upload a CSV and see inserted/skipped/failed rows and why. | P0 |
| US-09 | Reviewer | I can seed provided products again without duplicate creation. | P0 |
| US-10 | Reviewer | I can run the web, API and SQLite persistence locally through Docker. | P0 |

## 5. Functional behavior and business rules

### 5.1 Products

| Field | Type / rule | Notes |
|---|---|---|
| `id` | Server-assigned stable identifier | Not sourced from CSV |
| `name` | Required trimmed nonempty string; max length defined in API/schema | Whitespace-only rejected |
| `sku` | Required trimmed nonempty unique string | Decide and freeze case normalization in architecture/API; DB unique constraint required |
| `description` | String, may be empty | Never require invented marketing text |
| `category` | Required nonempty category value | Accept actual provided categories; do not reject via an arbitrary narrow enum |
| `price` | Decimal currency input > 0, max two fractional digits | Persist money as integer minor units; backend authoritative |
| `stock` | Integer >= 0 | Zero stock means out-of-stock, not invalid product |
| `weight_kg` | Nonnegative decimal, required for CSV MVP | Zero permitted; explicit precision in technical contract |

Product deletion policy must be frozen in `02-ARCHITECTURE.md` and `04-API.md`. **Preferred MVP:** soft-delete/deactivate for storefront/search, preserving historical order references and snapshots. If hard-delete is chosen, the order-item snapshots must still remain valid and readable. Admin UI uses confirmation before deletion.

Public catalog returns only active products; admin listing can show state as needed. Prevent out-of-stock additions or clearly surface the stock issue; final backend stock validation is mandatory regardless of UI checks.

### 5.2 Search and catalog

- Search matches **name or SKU**, case-insensitively, and trims surrounding whitespace.
- Category filter uses values derived from actual catalog data. Pagination defaults and max page size are specified by API contract.
- Each result displays name, price, category, availability and an image or placeholder. Detail view displays description, weight and stock availability.
- No results → helpful empty state and clear-search path. Invalid page/filter input → defined API response, not a server crash.
- Basic sort (e.g., name or price) is acceptable if cheap; external indexing and fuzzy relevance engines are not necessary.

### 5.3 Cart and checkout

- Cart state is client-side and survives browser refresh. It stores product identifiers and quantities, **not trusted final prices**.
- Quantities are positive whole numbers; cart cannot request a zero/negative purchase quantity.
- Checkout is available with an ordinary guest form (at minimum purchaser name and email; validate both); **no shopper account**.
- Server resolves current products, prices and stock and calculates total in minor units. Reject missing/inactive items or insufficient stock with actionable errors.
- Create an order and immutable line snapshots (SKU/name/unit price/quantity/line total). Simulated payment returns a deterministic success path; no provider credentials or external transaction.
- On successful payment mark order `paid` and reduce inventory **once only**, transactionally. Duplicate submissions/repeated payment calls must not create double stock deductions; define idempotency approach in backend/API contract.
- A failed checkout **never** produces a paid order or negative inventory. If an order is created pending first, its failure state and stock behavior must be explicit in the API contract.
- Confirmation shows order reference, purchased items, quantity and total; cart clears **only after confirmed success**. Provide friendly retry path on failure.

**Concurrency invariant:** Two purchases attempting the last unit cannot both complete as paid. In SQLite, transaction/conditional update handling must enforce this, not just an earlier availability check.

### 5.4 CSV import and database seed

- Recognize exact required headers: `name,sku,description,category,price,stock,weight_kg` (document whether header order is flexible; recommended: yes).
- Parse trimmed strings, normal decimal prices and a supported leading `$` currency symbol; reject negative/zero prices, malformed numerics, negative/nonintegral stock, missing required values, and unsupported precision.
- **Default admin import policy:** create-only by normalized SKU; existing SKU is skipped/reported as conflict, **never silently overwritten**. Upsert mode is P1 and must not be invented if absent from API/UI.
- For duplicate SKUs inside a single file, first **valid** occurrence can be inserted; later duplicates are skipped/reported with their source row. Clearly record this policy and keep it deterministic.
- Partial import is allowed: valid rows persist, invalid rows produce line-numbered error messages. Entirely empty lines are skipped and included in skip counts, not inserted.
- Import response/UI includes total rows, inserted, skipped, rejected and per-row issue reason; avoid ambiguous count categories (every source row accounted for exactly once).
- Seeder reuses the same parser/validator/business rules but is callable headlessly. Repeated execution is idempotent (no duplicate products, no unexpected stock resets). It produces a summary even for dirty data.
- File upload has a reasonable size limit and `.csv`/content validation; treat uploaded input as untrusted. For weekend scope, process synchronously with a clear UI progress/disabled state.

### 5.5 Administrator access

- Public users can list/search/view products and submit purchases; only authenticated admin may mutate products or import CSV.
- MVP authentication may use an environment-supplied admin secret with a simple, server-validated session; do not store plaintext secrets in repository or expose server-only secret via `NEXT_PUBLIC_*`.
- If auth expires or fails, display a usable unauthorized state and prevent writes. Avoid an elaborate roles/users subsystem.

## 6. Essential user journeys

### J1 — Browse and search (public)

1. Open storefront landing page.
2. View category/product sections and navigate to catalog.
3. Search by a known name or SKU; optionally choose category.
4. Open result/detail and see current price, available stock and weight.
5. Search for unknown term and see a clear zero-results state.

**Pass:** All listings come from the Symfony API backed by SQLite; no mandatory UI relies on hard-coded mock products.

### J2 — Purchase (public)

1. Add an in-stock product to cart.
2. Adjust quantity and see subtotal update; refresh and retain cart.
3. Enter guest details and submit simulated checkout.
4. Receive confirmed order number/summary; cart clears.
5. Revisit catalog; available stock reflects exactly one deduction.

**Pass:** Backend recalculates totals; order and order lines are persisted; simulated paid state and stock transition are correct.

### J3 — Manage products (admin)

1. Authenticate as admin.
2. Create valid product and find it in admin list/storefront.
3. Edit name/price/stock; verify changes appear.
4. Attempt duplicate SKU or invalid numeric fields; see clear error.
5. Delete/deactivate product with confirmation; it disappears from public catalog and historical orders remain intact.

**Pass:** CRUD operations are genuinely persisted, permission-checked, and validated server-side.

### J4 — Import CSV (admin)

1. Authenticate, open import screen, choose supplied CSV.
2. Upload and await import result.
3. Review inserted/skipped/rejected counts and specific invalid row numbers.
4. Search an imported valid product in public catalog.
5. Upload the same CSV again; see conflicts/skips rather than duplicates.

**Pass:** No malformed row creates a broken product; accepted records are searchable.

### J5 — Reviewer clean-room setup

1. Clone repository and follow README/environment example.
2. Run documented Docker Compose startup, migrations and seed.
3. Visit storefront/admin and execute J1–J4.
4. Restart containers; confirm SQLite catalog/orders persist.
5. Run documented tests/smoke checks.

**Pass:** No host-installed PHP, Composer, Node or local SQLite service is necessary for the containerized workflow.

## 7. Acceptance criteria (testable gates)

Use IDs below in QA tests and the orchestrator task board. These are P0 unless explicitly marked otherwise.

| ID | Given / when | Expected result |
|---|---|---|
| AC-01 | Clean Docker environment, documented startup | Next.js and Symfony are reachable; API health succeeds |
| AC-02 | Migrate then seed attached CSV | Valid unique products available; malformed/duplicate rows reported; no fatal import |
| AC-03 | Repeat seed | No additional products from duplicate SKUs; existing data not silently reset |
| AC-04 | Create valid product via admin UI | Product saved and appears in admin/public list |
| AC-05 | Edit price, name, stock | API returns updated values; UI refresh reflects changes |
| AC-06 | Try duplicate SKU / blank name / invalid stock or price | Predictable 4xx and field-level error; unchanged database |
| AC-07 | Delete/deactivate catalog item | No longer purchasable; existing order snapshots preserved |
| AC-08 | Anonymous user calls mutation/import API | Denied with appropriate authentication/authorization status |
| AC-09 | Search by name or SKU with different case | Matching products returned from server |
| AC-10 | Search unknown text and paginate | Zero-results state and stable pagination; no crash |
| AC-11 | Admin uploads dirty supplied CSV | Visible row totals and reasons; only valid, nonconflicting rows inserted |
| AC-12 | Import same CSV a second time | Duplicate SKUs reported; no duplicate products |
| AC-13 | Add/remove/adjust cart items and refresh | Cart survives refresh; quantities/subtotal updated correctly |
| AC-14 | Checkout in-stock product with valid guest details | One paid order with stored purchase snapshots and correct total |
| AC-15 | Complete successful payment | Stock decreases by purchased quantity exactly once |
| AC-16 | Repeat checkout/payment request with same idempotency key/order | No second paid transaction or second stock deduction |
| AC-17 | Attempt quantity above available stock | Safe failure, no paid order, no negative stock, cart retained for correction |
| AC-18 | Two buyers race for last unit | At most one succeeds; inventory nonnegative |
| AC-19 | Reload order confirmation and restart Docker | Persisted order/catalog and SQLite data remain available |
| AC-20 | View storefront and admin on mobile and desktop | Readable, navigable, responsive layout, labelled inputs and feedback |
| AC-21 | Clean README-driven setup and test execution | Commands are correct; reviewer can run without undocumented manual steps |

**Evidence:** QA records real commands/results and screenshots where relevant in `docs/qa/verification.md`. An unexecuted test is **NOT VERIFIED**, not passed.

## 8. Edge cases and required responses

| Case | Required behavior |
|---|---|
| Blank or whitespace-only CSV row | Skip; count correctly; never create product |
| Duplicated SKU within CSV | Deterministic first-valid-wins; later duplicate reported |
| SKU already in database | Create-only import skips/conflicts; no overwrite |
| Whitespace SKU or different casing | Normalize per frozen policy; enforce same policy in DB, CRUD and import |
| Missing name/category/weight | Reject with row and field reason (unless technical contract expressly relaxes a field) |
| `$29.99`, whitespace around price | Accept and normalize if valid |
| Negative stock, fractional stock, invalid/negative price | Reject; prevent persisted invalid values |
| Zero stock | Show out of stock; prevent successful purchase |
| Missing local image | Deterministic placeholder; no broken image or fake product claim |
| Product removed after item was put in cart | Show actionable stale-item error; no order paid for it |
| Price/stock changed after item added to cart | Checkout uses current server values; UI presents corrected total/error |
| Two concurrent purchases | Transactional stock check/decrement prevents overselling |
| Double-click submit or request retry | Idempotent result; no duplicate deduction |
| Cart emptied or malformed quantities | Disable checkout or return clear validation error |
| Unauthorized/expired admin session | Block mutation/import; display login/authorization guidance |
| CSV upload invalid type/oversized/empty | Return useful validation error; do not modify catalog |
| Backend unreachable or API errors | Display retry/error state; preserve unsent form/cart where possible |
| Containers restarted | SQLite data remains on persistent volume |

## 9. Cross-agent execution slices and ownership

| Slice | Backend Agent (`apps/api/**`) | Frontend Agent (`apps/web/**`) | DevOps Agent | QA & Docs Agent |
|---|---|---|---|---|
| S1: boot + catalog | Entities/migrations, list/detail API | Theme, hero, product cards, API client | Compose, volumes, health | Bootstrap smoke and README skeleton |
| S2: admin CRUD | Validation, CRUD endpoints, auth guards | Admin list/form/login | Environment/auth secrets guidance | CRUD/auth acceptance tests |
| S3: CSV import | Import service + CLI seed + API | Upload/results screen | Seed/run commands and mounted assets | Fixture/error accounting tests |
| S4: search | Query/filter/pagination API | Search/results/empty state | — | Search tests |
| S5: purchase | Order model, fake payment, atomic stock | Cart, guest checkout, confirmation | — | Checkout/idempotency tests |
| S6: stabilization | Defect fixes | Integration polish/defect fixes | Cold-start/restart verification | Test matrix and final README |

**Parallelism:** After architecture/schema/API contract are frozen, backend and frontend can proceed concurrently. Frontend may temporarily use **typed fixtures** aligned with `04-API.md`; remove fixture-driven behavior from all mandatory paths before Gate E. No agent changes another agent's owned files without handoff/approval. The orchestrator owns shared contracts and merges passing slices.

## 10. Definition of done and handoff

**Feature done:** implementation committed on agent branch; documented API/UI behavior; required validations; tests run with reported results; no unapproved shared-contract change; orchestrator accepts handoff.

**MVP done:** all P0 items/ACs above pass or have explicitly documented verification blockers; both containerized applications start; CSV seed/import works on dirty file; an admin can manage catalog; a shopper can search and purchase; order and stock remain consistent; README makes setup and testing reproducible. **If any P0 acceptance check is actually failing, do not claim the MVP complete.**

**Orchestrator stop conditions:** At ~8h require bootable catalog slice; ~12h freeze extras; ~14–15h focus only on P0 defects, tests and docs. Use the remaining buffer for stabilization. Escalate unresolved blockers after ~15 minutes. Never sacrifice a mandatory feature to add aesthetic polish or abstractions.

## 11. Decisions deferred to technical contracts (must resolve before dependent work)

Record these in `02-ARCHITECTURE.md` and `04-API.md` before concurrent feature implementation: SKU case canonicalization; max field lengths and weight precision; category representation; price JSON shape; soft-delete representation; order/payment state transitions and idempotency key mechanics; exact admin session pattern; public product pagination shape; HTTP status/error envelope; CSV row-count conventions and import response; guest checkout form fields; Docker host ports. This document sets the required **observable behavior** and invariants; technical agents decide the smallest implementation that satisfies them.

---

**Next documents:** `02-ARCHITECTURE.md` and `04-API.md` should be agreed before substantial parallel coding; `03-BACKEND.md`, `05-FRONTEND.md`, `06-INFRASTRUCTURE.md`, and `07-QUALITY.md` then convert this product contract into bounded agent tasks.
