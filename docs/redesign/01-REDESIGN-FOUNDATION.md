# 01 — Homepage Structure & Design Foundation

**Project:** Homepage editorial redesign · **Status:** agent-ready specification · **Timebox:** 6–8 focused elapsed hours (parallel agents)

## Shared project contract
- This is an **incremental homepage-only redesign**, not a new storefront or replatform. Implement in `apps/web` (Next.js App Router + TypeScript + Tailwind CSS 4 + daisyUI 5). Keep Symfony, `/api/v1` proxy, product DTOs, admin, cart, checkout, and existing URLs unchanged.
- Normative existing definitions: `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`. These redesign documents supplement—not replace—the originals. Any conflict goes to the orchestrator; the existing API contract wins.
- Preserve existing palette: forest `#174D3D`, sage `#96A68B`, cream `#F5F3E9`, charcoal `#202822`, gold `#D6C45A`, paper `#FFFFFF`. Retain existing semantic daisyUI theme and readable sans/body + restrained editorial serif/hero. Use 4px spacing scale and existing rounded forms; do not adopt Lovable's terracotta palette or shadcn/ui.
- Lovable reference: https://lovable.dev/templates/websites/ecommerce/maison-artisan-home-lifestyle-store-template ; linked live preview https://scandi-haven-shop.lovable.app/. The listing describes parallax/Ken Burns hero, scroll-triggered reveals, asymmetric 12-column collection layouts, and animated mobile navigation. The live preview could not be fully inspected frame-by-frame: treat exact timings/order as our *proposed implementation*, not verified template facts.
- Source content comes from existing catalog endpoints `GET /api/v1/products` and `GET /api/v1/categories`; don't fabricate product categories, imagery, claims, reviews or promotions. Product images may use existing placeholders. No new backend endpoints or data migrations.
- Accessibility: semantic landmarks, visible focus, keyboard navigation, `prefers-reduced-motion` support, readable contrast, no essential meaning hidden behind an animation. Avoid heavy JS on initial load and cumulative layout shift.
- Scope exclusions: cart behavior, checkout, product detail imagery/gallery, product CRUD, admin UI, wishlist, CMS, new APIs and data model changes. Existing links must keep working.

## Layout contract / page anatomy
1. Header (`<header>`): brand/navigation, sticky/scroll-aware style, mobile menu.
2. Main: `#hero` immersive editorial split/overlap composition; lead text + primary browse CTA.
3. `#collections`: asymmetric cards/categories with a 12-column editorial grid.
4. `#featured`: curated grid of real products from existing API; intentional entrance staging.
5. `#story`: brief brand/message transition; truthful generic language, no unverifiable ethical claims.
6. Footer (`<footer>`): existing links and visual consistency (may reuse `StoreFooter`).

## Design tokens and density
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#174D3D` | header, CTA, hero accents |
| `--color-secondary` | `#96A68B` | calm panels |
| `--color-base-100` | `#F5F3E9` | base background |
| `--color-base-content` | `#202822` | headings and text |
| `--color-accent` | `#D6C45A` | sparing active/focus accents |
| `--color-paper` | `#FFFFFF` | card surface |
Maintain semantic daisyUI tokens; confirm actual theme variable naming in project before changing. Typography: readable modern sans for all functional content; editorial serif for major display headlines. Content max width `min(100% - 2rem, 80rem)`; mobile padding 16–20px, tablet 24–32px, desktop 32–48px; sections approx 56–96px apart desktop and 40–64px mobile, tuned visually.

## Layout rules
- Desktop: asymmetric 12-column grids; no forced pixel-perfect clone. A prominent hero with a restrained floating label, one clear CTA and imagery slot/placeholder.
- Tablet: reduce spans to 6-column or 2-column flexible layout. Mobile: single column, natural reading order, no hover dependency.
- Keep existing navbar/footer compatible with non-homepage routes; homepage enhancements may be opt-in via prop or route-aware wrapper.
- Use server components for data-bearing homepage sections where practical; client components only for navigation toggle, scroll motion or nontrivial interaction.
- Category data is real. If category count small, display only available categories; if none, hide collections rather than invent.

## Assets and content policy
Use existing images/placeholders only. Place visual slots with fixed aspect-ratio, `next/image` sizing when actual assets exist; original imagery may be added in a future separate task. Avoid hard-coded promises of natural/ethical origin across unrelated CSV categories. Brand copy should be generic and editable in one constants file.

## Acceptance
At viewport widths 320, 375, 768, 1024, 1440: no overflow; hierarchy legible; CTA links to `/products`; categories/products reflect API response; WCAG-conscious contrast; unchanged navigation semantics.
