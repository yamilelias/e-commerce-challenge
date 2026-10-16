# 05 — Shared Motion System & Performance

**Project:** Homepage editorial redesign · **Status:** agent-ready specification · **Timebox:** 6–8 focused elapsed hours (parallel agents)

## Shared project contract
- This is an **incremental homepage-only redesign**, not a new storefront or replatform. Implement in `apps/web` (Next.js App Router + TypeScript + Tailwind CSS 4 + daisyUI 5). Keep Symfony, `/api/v1` proxy, product DTOs, admin, cart, checkout, and existing URLs unchanged.
- Normative existing definitions: `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`. These redesign documents supplement—not replace—the originals. Any conflict goes to the orchestrator; the existing API contract wins.
- Preserve existing palette: forest `#174D3D`, sage `#96A68B`, cream `#F5F3E9`, charcoal `#202822`, gold `#D6C45A`, paper `#FFFFFF`. Retain existing semantic daisyUI theme and readable sans/body + restrained editorial serif/hero. Use 4px spacing scale and existing rounded forms; do not adopt Lovable's terracotta palette or shadcn/ui.
- Lovable reference: https://lovable.dev/templates/websites/ecommerce/maison-artisan-home-lifestyle-store-template ; linked live preview https://scandi-haven-shop.lovable.app/. The listing describes parallax/Ken Burns hero, scroll-triggered reveals, asymmetric 12-column collection layouts, and animated mobile navigation. The live preview could not be fully inspected frame-by-frame: treat exact timings/order as our *proposed implementation*, not verified template facts.
- Source content comes from existing catalog endpoints `GET /api/v1/products` and `GET /api/v1/categories`; don't fabricate product categories, imagery, claims, reviews or promotions. Product images may use existing placeholders. No new backend endpoints or data migrations.
- Accessibility: semantic landmarks, visible focus, keyboard navigation, `prefers-reduced-motion` support, readable contrast, no essential meaning hidden behind an animation. Avoid heavy JS on initial load and cumulative layout shift.
- Scope exclusions: cart behavior, checkout, product detail imagery/gallery, product CRUD, admin UI, wishlist, CMS, new APIs and data model changes. Existing links must keep working.

## Ownership
Agent D owns `apps/web/src/lib/motion/**` and `apps/web/src/components/home/motion/**`; coordinates token additions with orchestrator. No new package unless orchestrator approves.

## Motion tokens (proposed, not a literal copy of template)
| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion.fast` | 180ms | ease-out | controls, hover |
| `motion.standard` | 320ms | cubic-bezier(.22,1,.36,1) | menu state |
| `motion.reveal` | 560ms | cubic-bezier(.22,1,.36,1) | scroll entrance |
| `motion.hero` | 650ms | same | hero staged entrance |
| `motion.stagger` | 80ms | interval | card entrances |
| `motion.ambient` | 12s | ease-in-out | background Ken Burns only |

## Primitives to deliver
1. `<Reveal>` client wrapper, `once=true`, `threshold≈0.12`, uses IntersectionObserver, optional stagger index; content remains available in DOM and visible if JS is unavailable. Prefer CSS class/data-state toggle. Don't add blanket body opacity 0 before hydration.
2. `usePrefersReducedMotion` (only if required beyond CSS media query); on preference switch stop active animations and show content.
3. Scoped CSS custom properties for duration/easing in orchestrator-owned `globals.css` through proposed diff; avoid motion rules with `!important` everywhere.
4. Optional hero parallax helper, only with performance proof; default may be CSS Ken Burns + reveal if time constrained.

## Performance and accessibility budgets
- Animate **opacity and transform** rather than width/top/left/layout; `will-change` only during active animation, not all cards permanently.
- No scroll handlers per card; one shared IntersectionObserver implementation, cleaned up on unmount.
- No autoplay videos; no animation essential to content comprehension.
- Initial viewport readable without JS or after refresh, avoid hydration mismatch; do not pull entire home page into client components solely for motion.
- `@media (prefers-reduced-motion: reduce)` disables parallax, infinite scale, stagger and smooth-scroll animation; transitions <=0.01ms where necessary, but focus semantics remain.
- Keep added JS as small as possible. No new animations on cart/admin.

## Deliverables and tests
M1 token/proposal patch; M2 reusable reveal; M3 reduced motion behavior; M4 QA snapshots at top/mid/bottom scroll; M5 report performance observation (browser dev tools if accessible) and dependency budget. Build/test commands and agent handoff supplied.
