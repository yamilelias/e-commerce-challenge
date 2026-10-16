# Homepage content sections (RD-03)

- `apps/web/src/components/home/sections/index.ts` exports `HomeSections`, `CollectionEditorial`, `FeaturedProducts`, and `BrandStory` for `apps/web/src/app/page.tsx`.
- `HomeSections.tsx` is the only data client for these sections. On mount it calls `getCategories()` and `getProducts({ page: 1, per_page: 16 })` from `apps/web/src/lib/api/client.ts` once each with an `AbortController`; each response/error updates only its own section state. It displays up to eight distinct products with names free of angle-bracket markup from that API response.
- `CollectionEditorial.tsx` renders `#collections` with up to five actual `Category` DTOs in an asymmetric grid. Each card links to `/products?category=<encoded slug>`. Empty category data omits the section; `HomeSections` renders loading/error statuses separately.
- `FeaturedProducts.tsx` renders `#featured` with up to eight actual `Product` DTOs using `apps/web/src/components/products/ProductCard.tsx`, and loading/empty/error states. It does not own fetching.
- `BrandStory.tsx` renders the generic copy and catalog CTA at `#story`. Its art is CSS decoration, not an inventory claim or product photo.
- `sections.module.css` owns responsive section grids, spacing, category art, and story panel. Cards and headings use `apps/web/src/components/home/motion/Reveal.tsx` for once-per-view entrance with reduced-motion support.
- Contract: `docs/redesign/DECISIONS.md` and `docs/redesign/04-HOMEPAGE-SECTIONS.md`. No API, DTO, backend, or other route changes.
