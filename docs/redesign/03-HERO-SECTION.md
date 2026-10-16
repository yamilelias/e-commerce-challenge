# 03 — Homepage Hero Composition & Parallax

**Project:** Homepage editorial redesign · **Status:** agent-ready specification · **Timebox:** 6–8 focused elapsed hours (parallel agents)

## Shared project contract
- This is an **incremental homepage-only redesign**, not a new storefront or replatform. Implement in `apps/web` (Next.js App Router + TypeScript + Tailwind CSS 4 + daisyUI 5). Keep Symfony, `/api/v1` proxy, product DTOs, admin, cart, checkout, and existing URLs unchanged.
- Normative existing definitions: `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`. These redesign documents supplement—not replace—the originals. Any conflict goes to the orchestrator; the existing API contract wins.
- Preserve existing palette: forest `#174D3D`, sage `#96A68B`, cream `#F5F3E9`, charcoal `#202822`, gold `#D6C45A`, paper `#FFFFFF`. Retain existing semantic daisyUI theme and readable sans/body + restrained editorial serif/hero. Use 4px spacing scale and existing rounded forms; do not adopt Lovable's terracotta palette or shadcn/ui.
- Lovable reference: https://lovable.dev/templates/websites/ecommerce/maison-artisan-home-lifestyle-store-template ; linked live preview https://scandi-haven-shop.lovable.app/. The listing describes parallax/Ken Burns hero, scroll-triggered reveals, asymmetric 12-column collection layouts, and animated mobile navigation. The live preview could not be fully inspected frame-by-frame: treat exact timings/order as our *proposed implementation*, not verified template facts.
- Source content comes from existing catalog endpoints `GET /api/v1/products` and `GET /api/v1/categories`; don't fabricate product categories, imagery, claims, reviews or promotions. Product images may use existing placeholders. No new backend endpoints or data migrations.
- Accessibility: semantic landmarks, visible focus, keyboard navigation, `prefers-reduced-motion` support, readable contrast, no essential meaning hidden behind an animation. Avoid heavy JS on initial load and cumulative layout shift.
- Scope exclusions: cart behavior, checkout, product detail imagery/gallery, product CRUD, admin UI, wishlist, CMS, new APIs and data model changes. Existing links must keep working.

## Ownership & export
Agent B: `apps/web/src/components/home/hero/**`, export `HomeHero` from `index.ts`; no changes to `app/page.tsx`, navigation or API client. Input props optional concise `headline`, `description`, `ctaHref`, `ctaLabel`; image slot/placeholder provided by existing asset strategy.

## Structure
Desktop hero: spacious asymmetric text/media layout with high-contrast display headline, supporting paragraph, primary `Shop products` action to `/products`, secondary optional scroll cue. Use a visual block that works even with a placeholder image. Mobile: stack copy before media; maintain useful first-screen CTA.

## Proposed motion (inspired by Lovable's documented behavior)
- Entrance: eyebrow 0ms, headline +80ms, body +150ms, CTA +220ms; opacity 0→1 + translateY(12–20px); 450–700ms overall; no delayed display beyond initial interaction.
- Media: very subtle Ken Burns scale 1.00→1.04 over 10–16 seconds using CSS, optionally pause/disable when tab hidden; never animate layout geometry.
- Parallax: optional translateY within ±24px based on scroll progress, desktop only; use transform, clamp values and requestAnimationFrame or Motion values, avoid sync layout measurement in scroll loops.
- Reduced motion: **no Ken Burns or parallax**, text appears without stagger; animations must not be prerequisite to content visibility.

## Responsive behavior
At widths <=768px, remove parallax and crop aggressively only when image has safe subject placement; fixed aspect-ratio to prevent CLS. At 320px ensure headline wraps naturally without clipping. CTA must remain above the fold where feasible.

## Agent tasks
H1 semantic hero markup/content; H2 responsive geometry; H3 staged entrance; H4 slow media movement and optional parallax; H5 verify reduced motion and screenshots. Build with no product imagery dependency; do not download/copy Lovable assets.

## Acceptance
Rendered `/` begins with meaningful H1 and real CTA; hero works sans image; no overflow/mobile content overlap; no body horizontal scroll; reduced-motion experience shows all content; motion smooth on a midrange mobile simulation.
