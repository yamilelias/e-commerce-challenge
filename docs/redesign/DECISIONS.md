# Homepage redesign implementation contract

Frozen 2026-10-16 by the orchestrator before parallel implementation. The existing API contract and storefront routes remain authoritative.

## Composition and ownership

- `apps/web/src/app/page.tsx` remains a server component and composes `HomeHero`, then `HomeSections`. The existing `apps/web/src/app/layout.tsx` supplies the shared header, `<main id="main-content">`, and footer.
- Section order and anchors are `hero`, `collections`, `featured`, `story`. `HomeHero` owns `#hero`. `HomeSections` owns the three remaining sections in that order.
- `HomeHero` is the named export of `apps/web/src/components/home/hero/index.ts`. Its optional props are `headline`, `description`, `ctaHref`, and `ctaLabel` (all strings); defaults use truthful generic copy and `/products`.
- `CollectionEditorial`, `FeaturedProducts`, `BrandStory`, and `HomeSections` are named exports of `apps/web/src/components/home/sections/index.ts`. `CollectionEditorial` receives `{ categories: Category[] }`; `FeaturedProducts` receives `{ products: Product[]; loading?: boolean; error?: boolean }`; `BrandStory` has no props. Their anchors are within the components.
- `HomeSections` is the only homepage data client. It calls the existing `getCategories()` and `getProducts({ page: 1, per_page: 8 })` once each, passes typed DTOs to the sections, and provides truthful loading, empty, and error states. Categories and products fail independently. No seeded fixture or invented listing is rendered.
- Existing `StoreHeader` remains the shared export in `apps/web/src/components/layout/StoreHeader.tsx`. It may apply the editorial homepage treatment based on the current route while keeping `/products`, `/cart`, and all other route links and cart count intact. No separate `HomeHeader` is needed.
- The existing footer in `layout.tsx` remains shared; the homepage may tune its surrounding spacing through scoped classes only.

## Visual and motion contract

- Keep the current daisyUI `garden` tokens and palette. The orchestrator alone edits `apps/web/src/app/globals.css` and `layout.tsx`; agents request token changes rather than editing those files.
- The hero uses an original CSS composition and existing placeholder style. It does not require a particular product image or a new asset. Catalog photos remain in real product cards. No Lovable source code or assets are copied.
- `Reveal` is the named export of `apps/web/src/components/home/motion/Reveal.tsx` and accepts `{ children: React.ReactNode; index?: number; className?: string }`. It observes once, uses opacity/transform only, and leaves content visible without JavaScript or with reduced motion. Its implementation uses no new dependency. The hero and navigation may use scoped CSS entrance rules instead.
- `apps/web/src/app/globals.css` owns shared motion duration/easing variables and `prefers-reduced-motion` overrides. Stagger is capped at six steps; no motion is required to read or use content.

## Integration rules

- Work is split across disjoint paths on the shared branch because managed per-agent worktrees are unavailable in this collaboration session. Agents commit only their owned paths; the orchestrator reviews commits and owns final composition.
- No backend, API, schema, cart, checkout, admin, product-detail, or catalog route changes are authorized by this redesign.
- Required proof: typecheck, lint, production build, Docker rebuild, browser checks at 320/375/768/1024/1440 widths, keyboard menu, reduced motion, and legacy route smoke. Record any check that cannot run as `NOT RUN`.
