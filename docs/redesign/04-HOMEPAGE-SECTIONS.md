# 04 — Editorial Homepage Sections

**Project:** Homepage editorial redesign · **Status:** agent-ready specification · **Timebox:** 6–8 focused elapsed hours (parallel agents)

## Shared project contract
- This is an **incremental homepage-only redesign**, not a new storefront or replatform. Implement in `apps/web` (Next.js App Router + TypeScript + Tailwind CSS 4 + daisyUI 5). Keep Symfony, `/api/v1` proxy, product DTOs, admin, cart, checkout, and existing URLs unchanged.
- Normative existing definitions: `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`. These redesign documents supplement—not replace—the originals. Any conflict goes to the orchestrator; the existing API contract wins.
- Preserve existing palette: forest `#174D3D`, sage `#96A68B`, cream `#F5F3E9`, charcoal `#202822`, gold `#D6C45A`, paper `#FFFFFF`. Retain existing semantic daisyUI theme and readable sans/body + restrained editorial serif/hero. Use 4px spacing scale and existing rounded forms; do not adopt Lovable's terracotta palette or shadcn/ui.
- Lovable reference: https://lovable.dev/templates/websites/ecommerce/maison-artisan-home-lifestyle-store-template ; linked live preview https://scandi-haven-shop.lovable.app/. The listing describes parallax/Ken Burns hero, scroll-triggered reveals, asymmetric 12-column collection layouts, and animated mobile navigation. The live preview could not be fully inspected frame-by-frame: treat exact timings/order as our *proposed implementation*, not verified template facts.
- Source content comes from existing catalog endpoints `GET /api/v1/products` and `GET /api/v1/categories`; don't fabricate product categories, imagery, claims, reviews or promotions. Product images may use existing placeholders. No new backend endpoints or data migrations.
- Accessibility: semantic landmarks, visible focus, keyboard navigation, `prefers-reduced-motion` support, readable contrast, no essential meaning hidden behind an animation. Avoid heavy JS on initial load and cumulative layout shift.
- Scope exclusions: cart behavior, checkout, product detail imagery/gallery, product CRUD, admin UI, wishlist, CMS, new APIs and data model changes. Existing links must keep working.

## Ownership & exports
Agent C owns `apps/web/src/components/home/sections/**`; exports `CollectionEditorial`, `FeaturedProducts`, `BrandStory` from index. Component props typed from `lib/api/types.ts` without changing DTOs. Orchestrator owns composition order in `app/page.tsx`.

## Sections
### A. `#collections` / CollectionEditorial
Fetch/get category data from existing `GET /api/v1/categories` via existing typed client or accept server-fetched prop. Up to 3–5 live categories; unique ids/slug names from contract. Use a **12-column asymmetric editorial grid**: leading category card spans 7, adjacent spans 5; second row 5/7 if enough real categories. Tablet can use symmetric 2-col; mobile one col. Card link points to `/products?category=<encoded slug>` consistent with the existing catalog contract. If no categories, omit section with no misleading placeholders.

### B. `#featured` / FeaturedProducts
Use real `GET /api/v1/products` results (small page size, existing default sorting). Reuse existing `ProductCard` and price formatters; avoid duplicating product model and add-to-cart logic. 4–8 visible cards depending layout; 4-col desktop, 2-col tablet, 1–2-col mobile. If empty/loading/error, show real accessible states and link to `/products` rather than fake offers. No image-swaps or new gallery logic in this redesign.

### C. `#story` / BrandStory
Editorial half-and-half text/media or color-block transition, prominent short brand statement, secondary `Explore the catalog` CTA, sober copy without unsupported sustainability claims. Reuse existing local visual placeholder; can be text-only. No newsletter capture unless an existing implemented endpoint already exists (default omit).

### D. Existing footer
Re-use `StoreFooter` as is, only orchestrator-approved spacing/tokens updates. Do not invent policies/social links.

## Motion and section rhythm
Reveal headings and cards as they enter viewport (IntersectionObserver shared wrapper). Once-per-view reveal; 70–110ms stagger with <=600ms total section delay, simple 12–18px rise + fade. Collection hover: scale image wrapper 1.00→1.025 or subtle lift; honor reduced motion, never shift layout. Maintain alternating light/forest panels with high contrast and whitespace.

## Agent tasks
S1 scaffold sections and typed props; S2 live categories editorial grid; S3 real-featured products; S4 brand story; S5 responsive and empty/error states; S6 integrate shared Reveal after motion helper freeze.

## Acceptance
No invented categories or products; search/catalog URLs preserve API semantics; no image requirement to function; no duplicate product fetches if page-level data can be shared; no unsupported ecological marketing claims; all links and headings keyboard accessible.
