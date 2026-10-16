# 02 — Header, Navigation & Mobile Menu

**Project:** Homepage editorial redesign · **Status:** agent-ready specification · **Timebox:** 6–8 focused elapsed hours (parallel agents)

## Shared project contract
- This is an **incremental homepage-only redesign**, not a new storefront or replatform. Implement in `apps/web` (Next.js App Router + TypeScript + Tailwind CSS 4 + daisyUI 5). Keep Symfony, `/api/v1` proxy, product DTOs, admin, cart, checkout, and existing URLs unchanged.
- Normative existing definitions: `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`. These redesign documents supplement—not replace—the originals. Any conflict goes to the orchestrator; the existing API contract wins.
- Preserve existing palette: forest `#174D3D`, sage `#96A68B`, cream `#F5F3E9`, charcoal `#202822`, gold `#D6C45A`, paper `#FFFFFF`. Retain existing semantic daisyUI theme and readable sans/body + restrained editorial serif/hero. Use 4px spacing scale and existing rounded forms; do not adopt Lovable's terracotta palette or shadcn/ui.
- Lovable reference: https://lovable.dev/templates/websites/ecommerce/maison-artisan-home-lifestyle-store-template ; linked live preview https://scandi-haven-shop.lovable.app/. The listing describes parallax/Ken Burns hero, scroll-triggered reveals, asymmetric 12-column collection layouts, and animated mobile navigation. The live preview could not be fully inspected frame-by-frame: treat exact timings/order as our *proposed implementation*, not verified template facts.
- Source content comes from existing catalog endpoints `GET /api/v1/products` and `GET /api/v1/categories`; don't fabricate product categories, imagery, claims, reviews or promotions. Product images may use existing placeholders. No new backend endpoints or data migrations.
- Accessibility: semantic landmarks, visible focus, keyboard navigation, `prefers-reduced-motion` support, readable contrast, no essential meaning hidden behind an animation. Avoid heavy JS on initial load and cumulative layout shift.
- Scope exclusions: cart behavior, checkout, product detail imagery/gallery, product CRUD, admin UI, wishlist, CMS, new APIs and data model changes. Existing links must keep working.

## Ownership and files
Agent A owns `apps/web/src/components/home/navigation/**` and coordinates edits to existing `apps/web/src/components/layout/StoreHeader.tsx`; owns no other route. Do not change CartProvider logic or URLs.

## Required structure
- Desktop announcement strip **optional** if meaningful and truthful content available; otherwise omit. Brand wordmark or existing logo, browse catalog link, other existing primary links and cart link retained.
- Header sticky at top with compact state triggered after modest scroll (`~24px` threshold proposed). Preserve background/foreground contrast against both hero and cream content.
- Mobile: accessible menu button (`aria-expanded`, `aria-controls`) opens an overlay/drawer below header; vertical navigation with staggered intro, closes on link selection, Escape and explicit close.
- Scroll locking only while mobile menu is open; restore previous state after unmount. Avoid obscure focus behavior.

## Motion contract
- On page load header reveals with gentle fade + y-offset, 300–450ms.
- State change (top → scrolled): surface, shadow and height transition 180–250ms, no layout shift or sticky jitter.
- Mobile links staged 30–50ms apart with total reveal <=500ms; reduce to immediate state changes when reduced motion is requested.
- Use `data-scrolled`, `data-open` attributes and shared easing tokens. Animations must not block clicks.

## Accessibility & responsiveness
Keyboard tab sequence logical; menu focus moves to first focusable link when opened and returns to trigger on Escape/close; background must not remain keyboard-interactive when menu is modal. Prefer native `<dialog>`/daisyUI drawer carefully implemented; do not layer untested focus traps. At 320px wordmark and menu fit with 44px target sizes.

## Agent tasks
N1 audit existing header/link targets/cart badge. N2 implement responsive desktop header and scroll state. N3 build mobile menu with exit/entry. N4 tests and screenshots. Submit only owned files; document any required changes to shared theme.

## Acceptance
No navigation regressions on `/products`, `/cart`, `/admin`; links are real; mobile menu operates by keyboard and touch; reduced motion works; no hydration warnings; scroll listener uses passive input + cleanup or IntersectionObserver; screenshots supplied.
