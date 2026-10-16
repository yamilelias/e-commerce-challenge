# Homepage hero (RD-02)

- Route: `/` imports the named `HomeHero` export from `apps/web/src/components/home/hero/index.ts` when the homepage composition is integrated. Until that import lands, the component is implemented but not yet rendered.
- `apps/web/src/components/home/hero/HomeHero.tsx` owns the `#hero` section, semantic `h1`, and the default CTA to `/products`. Optional string props are `headline`, `description`, `ctaHref`, and `ctaLabel`.
- `apps/web/src/components/home/hero/HomeHero.module.css` owns the responsive asymmetrical layout, CSS-only abstract media, staggered text entrance, slow media texture transform, and reduced-motion override. The decoration has no image or catalog dependency and is hidden from assistive technology.
- The copy and CTA are rendered before media at mobile widths. Product images and real catalog data remain the responsibility of other homepage sections.
- Contract: `docs/redesign/DECISIONS.md` and `docs/redesign/03-HERO-SECTION.md`.
