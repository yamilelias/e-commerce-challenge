# 05 — Frontend Implementation Specification (Next.js)

**Project:** Weekend E-Commerce MVP  
**Owner:** Frontend Agent  
**Status:** Phase 1 implementation specification; execute only after Orchestrator freezes `04-API.md`.  
**References:** [`00-ORCHESTRATOR.md`](./00-ORCHESTRATOR.md), [`01-PRODUCT.md`](./01-PRODUCT.md), [`02-ARCHITECTURE.md`](./02-ARCHITECTURE.md), [`03-BACKEND.md`](./03-BACKEND.md), [`04-API.md`](./04-API.md).  
**Timebox:** 3–4 hours focused frontend implementation, plus limited integration/QA fixes during Phases 5–6; entire project target ~16 elapsed hours.  
**Primary objective:** Deliver an accessible, responsive, real-API-connected storefront and basic product administration for the supplied CSV dataset. No extra features or speculative frameworks.

> **Normative precedence:** `04-API.md` controls all HTTP routes, headers, DTOs, security, and errors. `02-ARCHITECTURE.md` controls runtime boundaries; `01-PRODUCT.md` controls scope and acceptance criteria; `00-ORCHESTRATOR.md` controls ownership, priorities, and gates. This document operationalizes those contracts; it does not change them. Raise a written contract-change request to the Orchestrator if any conflict emerges.

## 1. Scope and boundaries

**P0 pages and flows:** public landing/catalog, product detail, search/filter/sort/pagination, persistent guest cart, fake checkout, token-protected order receipt, admin login/logout, admin product list/create/edit/soft-delete, and admin CSV upload with row-level results. Products without images must render cleanly. All prices shown in USD. Mobile layouts must be usable.

**Not in MVP:** registration, buyer accounts, real payments, shipping/tax/coupons, wishlists, reviews, product image management, CMS, admin analytics, category editor, import preview/upsert, server cart, full-text backend search, i18n, dark mode, fancy animation, optimistic inventory mutations, global state framework, design-system package, or elaborate SSR caching.

**Implementation mindset:** clean route structure, a few well-owned feature modules, reusable UI primitives, predictable loading/error/empty states and no duplicated API logic. Prefer simple React state + context and browser localStorage for cart. Do not rely on mocked products in the final application.

## 2. Fixed runtime and dependencies

- **Framework:** Next.js App Router + React + TypeScript in `apps/web`.
- **Styling:** Tailwind CSS 4 with the latest **compatible** daisyUI 5.x version resolved and pinned at implementation time; verify official package/Next.js integration instructions rather than inventing exact versions. Configure daisyUI through its CSS plugin (`@plugin "daisyui"`) and custom semantic theme tokens. Pin a lockfile.
- **Icons:** optional small icon package (e.g. lucide-react). Avoid component megakits and additional styling systems.
- **Forms:** controlled native React fields with explicit validation and API field errors; add a form library only if already installed and justified. Backend is validation authority.
- **HTTP:** browser `fetch` to `/api/v1/*`, `credentials: 'same-origin'`; centralized strongly typed wrapper.
- **Container:** DevOps owns `apps/web/Dockerfile`; frontend must ensure standalone production build works (`next build`, appropriate `output: 'standalone'` if agreed with DevOps).
- **Proxy:** Frontend owns thin `app/api/v1/[...path]/route.ts` implementation with DevOps review; `http://api:8000` is internal and read only from server env (`API_INTERNAL_URL`). Never expose the Compose hostname or admin secrets to browser bundles.
- **No cross-origin browser API calls.** Keep cookies on the browser-visible Next.js origin via proxy.

## 3. Suggested file structure and ownership

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # root shell, metadata, cart provider
│   │   ├── globals.css                     # Tailwind + daisyUI + tokens
│   │   ├── page.tsx                        # editorial landing + featured catalog
│   │   ├── products/
│   │   │   ├── page.tsx                     # search, filters, sort, pagination
│   │   │   └── [id]/page.tsx                # product detail
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── orders/[reference]/page.tsx     # protected receipt via token query
│   │   ├── admin/
│   │   │   ├── layout.tsx                   # admin-only navigation shell
│   │   │   ├── login/page.tsx
│   │   │   ├── products/page.tsx
│   │   │   ├── products/new/page.tsx
│   │   │   ├── products/[id]/edit/page.tsx
│   │   │   └── import/page.tsx
│   │   └── api/v1/[...path]/route.ts        # same-origin proxy, all methods
│   ├── components/
│   │   ├── layout/{StoreHeader,StoreFooter}.tsx
│   │   ├── ui/{LoadingState,ErrorState,EmptyState,ConfirmDialog}.tsx
│   │   └── products/{ProductCard,ProductGrid,ProductForm}.tsx
│   ├── features/
│   │   ├── catalog/{CatalogFilters,CatalogResults}.tsx
│   │   ├── cart/{CartProvider,cart-storage,CartLine}.tsx
│   │   ├── checkout/{CheckoutForm,ReceiptSummary}.tsx
│   │   └── admin/{AdminSessionProvider,AdminGuard,ImportReport}.tsx
│   ├── lib/
│   │   ├── api/{types,client,errors,products,admin,orders}.ts
│   │   ├── money.ts
│   │   ├── format.ts
│   │   └── images.ts
│   └── tests/                        # tests owned by Frontend Agent
├── public/images/                   # small licensed/local visual assets, if available
├── package.json
├── package-lock.json                # or chosen lockfile; do not mix managers
├── next.config.ts
└── Dockerfile                        # DEVOPS OWNED; coordinate changes
```

Keep files logical, not ceremonial; combine tiny modules when justified. **Frontend owns `apps/web/**` except Dockerfile**. DevOps owns Compose/root config, Dockerfiles and `infra/**`; Backend owns `apps/api/**` except Dockerfile; QA owns README, `docs/qa/**`, and `scripts/smoke/**`. Orchestrator owns frozen specifications. No cross-agent commits without explicit delegation.

## 4. Visual system based on supplied landing-page mockup

The reference communicates a premium, approachable *natural living* storefront: dark forest-green navigation/hero treatment, muted sage, soft cream surfaces, editorial typography, generous whitespace, photography-first cards, and rounded controls. Reproduce its **visual hierarchy and mood**, not pixel-for-pixel composition or misleading sustainability claims about CSV products from mixed categories.

### 4.1 Design tokens (initial proposal; Orchestrator may freeze in Phase 1)

| Token | Value | Intended use |
|---|---|---|
| `brand/primary` | `#174D3D` | Hero, nav, major CTAs |
| `brand/primary-content` | `#FFFFFF` | Text on primary |
| `brand/sage` | `#96A68B` | Secondary surfaces and decorative elements |
| `surface/base` | `#F5F3E9` | Page/background cream |
| `surface/paper` | `#FFFFFF` | Product cards, forms, dialog surfaces |
| `text/main` | `#202822` | Main typography |
| `text/muted` | `#59675D` | Descriptions and labels |
| `accent` | `#D6C45A` | Small highlights, not low-contrast body text |
| `border` | `#DDE4D8` | Input/section separators |
| `danger` | accessible dark red | Error messages / destructive controls |

**Typography:** modern readable sans for forms, cards, navigation and body; an optional editorial serif (e.g. Georgia) for hero headlines only. Keep font loading self-contained and robust offline. **Space:** 4px grid; section spacing 48–80px desktop and 28–48px mobile. **Width:** centered max ~1200–1280px; readable text widths. **Shape:** soft corners (roughly 12–20px cards), circular badges if useful, restrained shadows. **Motion:** optional subtle hover only, honor reduced motion.

Implement tokens through daisyUI semantic color variables; use classes like `btn btn-primary`, `btn btn-outline`, `card`, `input`, `select`, `textarea`, `badge`, `alert`, `table`, `modal`, `loading`, `navbar`, `drawer` where appropriate. Do not overwrite daisyUI internals using brittle deep selectors; avoid hardcoded token colors repeated in JSX. Check contrast on cream, sage, and gold. One customized light theme is sufficient for MVP.

### 4.2 Storefront composition

- **Header:** brand/site name (neutral, not fabricated certifications), navigation to Shop and Cart, mobile-friendly menu, cart quantity badge. Admin access through `/admin/login`; it need not be prominent to shoppers.
- **Landing `/`:** responsive hero with prominent editorial headline, short supporting message and browse CTA; a featured product section drawn from real `/products` results; category shortcuts drawn from `/categories`; brief brand statement without unsupported product assertions; simple footer. Use the supplied mockup's green + natural palette.
- **Product image strategy:** attached CSV has no image URLs. Use category-based local placeholder visuals or graceful graphic/card placeholders; never claim an image accurately depicts a particular SKU if it does not. Do not create a network dependency on random remote stock-photo services for essential functionality. Provide meaningful `alt` on real images and decorative `alt=""` for flourishes.
- **Catalog:** sensible filters and price formats; mobile filter controls; pagination and keyboard-accessible control focus.
- **Admin:** cleaner utility density than the editorial storefront: functional table/forms, notices and validation first, decorative design second.

## 5. Routes, responsibilities and navigation

| UI route | Audience | API dependencies | Critical behavior |
|---|---|---|---|
| `/` | Public | `GET /products`, `GET /categories` | Landing + real featured cards; link to shop |
| `/products` | Public | `GET /products`, `GET /categories` | Search by name/SKU, category slug, sort, page |
| `/products/[id]` | Public | `GET /products/{id}` | Details, out-of-stock disabled add-to-cart, 404 |
| `/cart` | Public | none initially; products read for live totals | Persistent editable cart, totals indicative |
| `/checkout` | Public | `POST /orders` | Buyer fields, server-authoritative purchase, retry safety |
| `/orders/[reference]?token=...` | Capability | `GET /orders/{reference}?token=...` | Protected receipt, no-store, no-referrer, sanitized errors |
| `/admin/login` | Anonymous/Admin | `GET /admin/session`, `POST /admin/login` | Bootstrap session and CSRF; no credentials in storage |
| `/admin/products` | Admin | `GET /admin/session`, `GET /admin/products`, `DELETE /products/{id}` | Auth gate, table, filter/search, delete confirm |
| `/admin/products/new` | Admin | `GET /admin/session`, `POST /products` | Complete field validation; success navigation |
| `/admin/products/[id]/edit` | Admin | `GET /admin/products/{id}`, `PATCH /products/{id}` | Prefill editable values; 404/inactive handling |
| `/admin/import` | Admin | `GET /admin/session`, `POST /products/import` | Upload CSV, report counts and row issues |

All paths in the API dependency column have canonical prefix `/api/v1`. Backend does **not** provide a `/pay`, admin product activation, category mutation, import preview or public order list endpoint. Admin logout via `POST /admin/logout` from navigation.

**Next.js routing convention:** use server components for static layout/metadata where useful, and client components for browser state (cart, search controls, session, forms). Because Symfony sessions and shopping cart depend on browser-origin requests, fetching from client components is acceptable for MVP. Avoid copying server cookies into arbitrary SSR fetches. Do not use Next.js Server Actions to bypass Symfony contracts.

## 6. Typed API client — exact frozen contract

Create `src/lib/api/types.ts` matching `04-API.md`; do not create a separate incompatible DTO. At minimum:

```ts
type Category = { id: number; name: string; slug: string };
type Product = {
  id: number; name: string; sku: string; description: string;
  category: Category; price_cents: number; currency: 'USD';
  stock: number; weight_kg: string; is_active: boolean;
  created_at: string; updated_at: string;
};
type ProductWrite = {
  name: string; sku: string; description?: string; category: string;
  price: string; stock: number; weight_kg: string;
};
type ListResponse<T> = {
  data: T[];
  pagination: { page: number; per_page: number; total: number; pages: number };
};
type ApiError = { error: {
  code: string; message: string; fields: Record<string, string[]>;
}};
type Session = { authenticated: boolean; username: string | null; csrf_token: string };
type ImportIssue = { row: number; field: string; code: string; message: string };
type ImportResult = {
  total_rows: number; inserted: number; skipped: number; rejected: number;
  issues: ImportIssue[]; truncated: boolean;
};
type CartLine = { product_id: number; quantity: number };
```

Create the full `OrderReceipt`, checkout request and response types **by copying the exact normative field shapes from `04-API.md`**, including `buyer_name`, `buyer_email`, `items`, `reference`, `receipt_token` on POST success only, and `status: 'paid'` as returned in MVP. The page must not require undocumented DTO fields.

API wrapper duties:

1. Build query via `URLSearchParams`, encode each input, and omit unspecified params; use `page=1` on query/category/sort changes.
2. Use `credentials: 'same-origin'` for browser requests. Preserve correct `Content-Type` only for JSON; never set multipart boundary manually for FormData uploads.
3. For errors, parse standard `error.code`, `error.message`, `error.fields`; throw a typed `ApiRequestError` with `status` and original code; handle invalid/unexpected non-JSON errors generically. Never surface stack traces.
4. Support request cancellation in catalog via `AbortController` and ignore stale results; disable duplicate submit buttons while mutation is pending.
5. Disable response caching for admin, checkout and receipt calls (`cache: 'no-store'`), and keep product updates fresh after mutations.
6. Never send product `price_cents`, user-supplied total, `currency`, `is_active`, or timestamps in create/patch body. Convert edit form `price_cents` -> exact decimal string without floating point (`whole` + padded fractional cents).
7. Keep all external URLs out of the browser bundle except same-origin paths. Backend errors are authoritative; client validation improves usability only.

**Product search:** `/products?q=...&category=<slug>&sort=name_asc&page=1&per_page=12`; allowable `sort`: `name_asc`, `name_desc`, `price_asc`, `price_desc`, `newest`; default page 1/per_page 12. Query length <=100. No client-only filtering of a single returned page. Admin list adds `status=all|active|inactive` default `all`. A URL query is the source of truth for applied filters, so links and refreshes are stable; debounce text input ~250–350ms before changing the URL.

## 7. Cart and purchasing UX

### 7.1 Cart persistence and validation

- Store **only** `{ product_id, quantity }[]` in versioned localStorage key such as `ecommerce_cart_v1`; no server prices, tokens or buyer data. Read it in an effect after mount (avoid SSR hydration mismatch); guard malformed JSON, array shape, negative IDs and invalid quantities.
- Quantity range 1..999; one line per product; add updates quantity and cap at 999; allow remove and empty-cart action.
- Fetch product details or use fresh catalog results to display indicative prices/stock. When a product is inactive/404 or now has insufficient stock, show availability warning and provide remove/update controls; backend checkout still decides.
- Cart total is an **estimate** formatted from integer cents; never trust it when submitting purchase.
- Empty cart: clear call to browse products, disable checkout; show count in header.

### 7.2 Checkout invariants

- UI asks `buyer_name`, `buyer_email` and confirms order lines. Send the exact `POST /orders` payload from `04-API.md` (no payment form; simulated successful payment). Checkout `Idempotency-Key` is a UUID generated via browser `crypto.randomUUID()` at the start of an attempt, **not** on each render/retry.
- Keep stable `{ key, fingerprint }` for an unchanged checkout attempt, including after network timeout/reload; `sessionStorage` is adequate for this temporary attempt state. Fingerprint may be a deterministic serialized representation of normalized buyer fields + sorted/coalesced item IDs/quantities; frontend fingerprint is only a change detector, not backend authoritative request hash.
- On any change to cart or buyer inputs after an attempt, start a **new** key; never submit a changed body under the old key. On unknown network outcome, display `Retry purchase` reusing the exact same key and unchanged body; avoid auto-clearing cart or falsely showing success. Disable duplicate clicks while awaiting response.
- On `201` or idempotent replay `200`, persist no sensitive receipt token in localStorage; clear cart and attempt state **only after confirmed response**, then `router.replace('/orders/<encoded-reference>?token=<encoded-token>')`.
- On `409 INSUFFICIENT_STOCK` / `PRODUCT_UNAVAILABLE`, retain cart and explain which items need adjustment; on `409 IDEMPOTENCY_CONFLICT`, stop and show recovery message rather than blindly regenerating keys for the same uncertain attempt.
- Display API validation field errors inline, not toast-only. No independent frontend fake-payment simulation; API is the only place where purchase occurs.

### 7.3 Receipt capability and privacy

- Receipt screen reads both `reference` path and `token` query; use `GET /orders/{reference}?token=...` and render server-returned snapshot (products, quantities, prices, total, status, timestamp). Never infer success from a client-only navigation state.
- With missing or malformed token display generic inaccessible receipt message; on backend 404 show same neutral message. Never disclose whether order exists.
- Set **`Referrer-Policy: no-referrer` and `Cache-Control: no-store` on receipt page responses** via Next.js route-specific headers (coordinate `next.config.ts` or proxy with DevOps); add `robots: { index: false, follow: false }` metadata where applicable. Do not render third-party analytics, pixels or external images on this page. Avoid leaking token in console/error reporting.
- A link copied by the purchaser acts as a bearer capability. UI may offer `Back to shop`; do not render all recent orders or display another user's receipt.

## 8. Admin authentication and CSRF lifecycle

Admin state must live in React memory, backed by a Symfony `HttpOnly`, `SameSite=Lax`, `Path=/` session cookie. **Never** put password, cookie, CSRF token or receipt token in localStorage; never make a frontend-only `isAdmin` flag sufficient for API protection.

1. On opening admin/login, call `GET /api/v1/admin/session` (with `credentials: 'same-origin'`) to obtain `{ authenticated, username, csrf_token }` and browser cookie. Store token only in memory.
2. For login, send `POST /api/v1/admin/login` with username/password JSON and `X-CSRF-Token` obtained in step 1. On `200`, replace token with the **new login-response** `csrf_token` (session ID rotated); clear password field, navigate to `/admin/products`.
3. On entering protected admin screens, bootstrap/check session and render loading until it resolves. Redirect unauthenticated sessions to `/admin/login` (optionally `next=` only for safe internal admin paths). Never display cached admin product data after logout.
4. On admin mutations (create, edit, delete, import, logout), send current `X-CSRF-Token`. Admin GET requests do not require CSRF header.
5. On `401 UNAUTHENTICATED`, clear admin state and route to login. On `403 CSRF_INVALID`, refetch session then **ask for manual retry**; do not silently repeat a potentially destructive action.
6. On logout, send `POST /api/v1/admin/logout` with CSRF and session cookie; on 204 clear in-memory admin state and navigate to login. On errors, do not claim logout succeeded.
7. Orchestrator + DevOps must verify `Set-Cookie` and `Cookie` round-trip through `/api/v1` proxy, and browser `Origin` is preserved for Symfony validation.

**Important:** Client-side AdminGuard is a UX boundary, not security authorization. Symfony enforces all admin API permissions. Login page does not imply fake local credentials; credentials come from DevOps-provisioned environment.

## 9. Forms and CSV UI behavior

### Product create/edit

Fields: name, SKU, description, category (text input or existing-category suggestions), price (decimal string), stock (integer), weight_kg (decimal string). Use visible labels, required hints, helper text and semantic `aria-invalid` + associated field error text. For edit, initial response `price_cents` converts to a decimal string with exactly 2 digits after decimal. For SKU conflict show field error; for inactive/missing edit redirect or show 404. `PATCH` can submit changed keys only; full `ProductWrite` is also accepted if valid, but **never submit output DTO as input**. After success update relevant lists and navigate back to admin catalog.

### Delete

Provide explicit confirmation dialog naming item; destructive control disabled while pending. Send `DELETE /products/{id}` only once. On 204 update admin view and product visibility; on 404 treat as already unavailable, refresh list; on 401/403 apply central handling. Never hard-delete order snapshots.

### CSV upload

Use `<input type="file" accept=".csv,text/csv">` with one file, client hint at 2 MiB; backend remains authoritative. Submit FormData under exact field `file` to `POST /products/import`, without manually setting `Content-Type`, with admin CSRF header. Accept `200 {data: ImportResult}`; show **total_rows / inserted / skipped / rejected** and issue table with `row, field, code, message`. If `truncated=true`, show warning that displayed issues are incomplete. On `422 CSV_HEADER_INVALID` or `CSV_EMPTY`, show blocking file-level message; on `413`/`415`, show upload guidance; on `401`/`403`, follow session lifecycle. Do not implement preview, job polling, or a second import endpoint.

CSV may contain invalid prices, duplicate SKUs, blank rows, negative stock, missing fields; the UI does not normalize or repair them. It reports server issues so reviewers can understand what happened. After import, refresh admin catalog/search state.

## 10. Same-origin proxy requirements and handoff

Implement a small explicit Next.js route handler forwarding `/api/v1/[...path]` requests to `API_INTERNAL_URL` + `/api/v1/<path>`, supporting `GET`, `POST`, `PATCH`, and `DELETE`. Handle encoded paths and query strings safely; do not permit caller-provided arbitrary upstream URLs, protocol, host, or path traversal. Disable caching and body transformation for auth/order/mutations. For multipart, forward untouched raw request body and existing multipart `Content-Type` boundary. Preserve upstream HTTP status and safe response headers, especially all `Set-Cookie` values. Forward `Cookie`, `Origin`, `Content-Type`, `X-CSRF-Token`, `Idempotency-Key`, and `Accept` as applicable; never forward hop-by-hop headers, untrusted host or arbitrary authorization to other destinations.

**Cookie nuance:** Since backend session cookies originate from internal `api:8000`, ensure Symfony generates host-only `Path=/` cookies without an internal `Domain` attribute. Test in browser that Next.js re-emits those cookies on `localhost:3000`; if any `Domain=api` appears, coordinate a backend/config fix rather than patching credentials into JS. Coordinate proxy health checks and Docker `API_INTERNAL_URL` ownership with DevOps. If generic rewrite alternative is proposed, require proof it forwards `Set-Cookie`, multipart data and custom headers before accepting it.

## 11. Accessible responsive interaction rules

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one primary heading per page, proper label/control associations, descriptive actions and visible focus styles.
- Keyboard access for menus, modal confirmation, form submits, pagination, quantity adjustments and navigation. Use native `<button>` and `<a>`; do not make decorative cards the only interactive click target.
- Error alerts use `role="alert"` when appropriate; loading statuses announce politely; avoid unexpected focus resets on search.
- Mobile-first: no horizontal viewport overflow; product grid 1→2→3/4 columns by width; admin table may scroll within contained area; buttons and controls comfortably touchable.
- Loading skeleton/spinner, empty-state, API-error retry and not-found state on each data-driven route. Stock 0 clearly marked and purchase disabled in UI; server still validates.
- Product/card photos are optional; placeholder styling should remain legible. Do not claim categories are sustainable unless supported by product data.

## 12. Tests owned by Frontend Agent (targeted, not exhaustive)

Use lightweight component/utility tests with chosen test runner (e.g. Vitest + React Testing Library) only if setup is quick. QA owns broader browser smoke checks in `scripts/smoke/**`; coordinate E2E harness rather than duplicating it.

| ID | Test / validation | Required result |
|---|---|---|
| F-01 | Typecheck and production build | `tsc --noEmit` and `next build` pass |
| F-02 | Search parameters and pagination | Exact API query, URL persists, page resets on filters |
| F-03 | Money display / edit conversion | 2999 cents displays $29.99; editable string `29.99` |
| F-04 | Cart reload and malformed localStorage | Valid cart persists; corrupt storage recovers safely |
| F-05 | Cart unavailable item | Useful warning/removal; checkout not falsely guaranteed |
| F-06 | Checkout successful 201 / replay 200 | Clear cart only after confirmation; navigate with token |
| F-07 | Checkout network uncertainty | Stable idempotency key for identical retry; no duplicate submission |
| F-08 | Receipt missing/wrong token | Neutral inaccessible message; no data leak |
| F-09 | Admin login & CSRF lifecycle | Bootstrap then login, new CSRF, protected mutation header |
| F-10 | Expired auth / bad CSRF | 401 redirects; 403 refetches and asks to retry manually |
| F-11 | CRUD form validation and delete | Field errors and confirm dialog; correct HTTP methods |
| F-12 | CSV upload + import report | FormData `file`, counts and row errors rendered |
| F-13 | Responsive keyboard smoke | Navigation, product controls, admin forms operable |
| F-14 | Same-origin proxy integration | Cookies, multipart and custom headers preserved |

**Critical manual browser smoke:** browse → search → product → cart → checkout → receipt refresh; separately login → create/edit/delete → CSV upload → logout. No hardcoded fixture catalog in final delivery. QA validates against seeded real CSV.

## 13. Agent task queue and parallelism

Each task is a small mergeable deliverable. Report branch/commit, changed files, commands, test evidence, blockers and next dependency to Orchestrator. Agent may begin F1–F3 using frozen mocks typed from API while backend runs; swap to real API before Phase 5 gate.

| Task | Work and output | Dependency | Gate |
|---|---|---|---|
| **F0 — Contract acknowledgment** | Read 00–05; list unresolved ambiguities; copy DTOs and route matrix; request amendments rather than guessing | Phase 1 freeze | A |
| **F1 — UI foundation** | Next.js scaffold, Tailwind/daisyUI theme, app shell, header/footer, image placeholders, shared states | F0; DevOps scaffold coordination | B |
| **F2 — Typed API + proxy** | Typed `fetch` wrapper, DTOs, error mapper, cookie-safe same-origin proxy; test `/health`, `/products` | F0; internal API URL from DevOps | B/C |
| **F3 — Storefront & catalog** | Landing, product list/search/filter/sort/pages, product detail, reusable cards | F1 + F2; Backend catalog DTO | C/D |
| **F4 — Cart & checkout** | Cart provider/storage, cart page, buyer form, idempotency, receipt and privacy headers | F2 + F3; Backend order DTO | D/E |
| **F5 — Admin** | AdminSessionProvider, login, protected layout, product CRUD UI, CSV upload and issue table | F1 + F2; Backend auth/CRUD/import | D/E |
| **F6 — Hardening & handoff** | Responsive/keyboard review, error states, targeted tests, production build, integration fixes | F3–F5 | E/F |

**Parallel work within the frontend role:** F3 and F5 can be delegated to temporary helpers only if the Orchestrator explicitly approves separate non-overlapping file ownership; cart/checkout may proceed in parallel once API integration is stable. Do not launch unmanaged nested agents. Backend and Frontend work in separate branches/worktrees, integrate at agreed checkpoints, and do not change frozen API unilaterally.

**Suggested effort budget:** F0–F2 ~45–75 min, F3 ~45–60 min, F4 ~45–60 min, F5 ~45–75 min, F6 ~30–45 min. These are aggressive targets for agent-assisted implementation and not guarantees. When running late, prioritize complete functionality and deterministic flow over decorative detail.

## 14. Handoffs and blocking issues

**Required Backend handoff to Frontend:** running internal API URL, migration+seed commands/results, tested routes, exact auth cookie/CSRF behavior, one valid sample product ID, any known violations of `04-API.md`, and checkout happy-path receipt example. Never ask Backend to implement frontend-only sorting or localStorage.

**Required DevOps handoff:** usable `apps/web` environment variables (`API_INTERNAL_URL` server-only), proxy network hostname, Docker Compose service, build command, health readiness/port mapping, and agreed files (Dockerfile vs Next.js route handler). Do not put `RECEIPT_SECRET`, `ADMIN_PASSWORD_HASH` or database path into `NEXT_PUBLIC_*` variables.

**Frontend completion handoff template:**

```text
TASK: F# — <name>
STATUS: PASS | BLOCKED | NEEDS REVIEW
BRANCH / COMMIT: <ref>
CHANGED FILES: <paths>
ROUTES SCREENS: <UI paths>
CONTRACTS USED: 04-API.md sections <n>
VALIDATION: <commands + actual results>
BROWSER EVIDENCE: <journeys observed, if available>
UNRESOLVED: <none or exact blocker / owner / suggested resolution>
```

**Escalate immediately** if endpoints/statuses diverge, session cookies fail through proxy, Symfony rejects browser Origin, CSRF bootstrap/login rotation behaves differently, multipart upload breaks, receipt token is missing, or product DTO differs. Orchestrator decides documented change and notifies all agents; Frontend must not invent fallback auth or fake success.

## 15. Phase gates and final frontend definition of done

- **Gate A (Phase 1):** DTOs, routes, auth/CSRF, idempotency, visual tokens and ownership acknowledged by Backend, Frontend, DevOps and QA.
- **Gate B (Phase 2):** Next.js starts via Compose; browser can reach `/api/v1/health`, cookie bootstrap preserves `Set-Cookie`, build/theme loads.
- **Gate C (Phase 3):** Catalog client handles seeded Symfony product/category endpoints and errors without changing API contract.
- **Gate D (Phase 4):** All P0 routes render and core UI tasks work; temporary fixtures removed from shipped flows.
- **Gate E (Phase 5):** Real seeded CSV drives browsing; successful purchase and receipt refresh; admin CRUD/CSV/login/logout; key error and retry cases checked; no severe accessibility/mobile blockers.
- **Gate F (Phase 6):** Production build and clean Docker startup reproducible; QA receives actual browser test results and known limitations for README.

**Frontend is complete only when:**

- [ ] Every required public and admin UI works against the real Symfony API.
- [ ] Catalog UI matches API filtering/sorting/pagination and refresh behavior.
- [ ] Responsive visual system reflects the supplied mockup without inventing product claims.
- [ ] Cart stores only IDs/quantities and uses server-authoritative checkout totals.
- [ ] Checkout handles uncertain network outcomes with stable idempotency key and preserves the cart until confirmed success.
- [ ] Receipt lookup requires token and page enforces no-store/no-referrer privacy.
- [ ] Admin uses Symfony session and CSRF correctly; login, CRUD, delete and CSV import work.
- [ ] Loading, empty, invalid, unauthorized, unavailable, not-found and error states are understandable.
- [ ] Typecheck, production build, frontend targeted tests and QA smoke pass, or documented failing cases are escalated before claiming done.
- [ ] No secrets, internal Docker hosts, hardcoded admin credentials or bearer receipt tokens leak into source/client logs.

**Timebox rule:** If time runs short, reduce nonessential visuals and abstraction; never quietly omit required screens, real API integration, transaction-safe checkout behavior, responsive usability or security contract. The Orchestrator alone approves any P0 trade-off.
