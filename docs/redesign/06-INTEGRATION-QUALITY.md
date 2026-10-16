# 06 — Integration, QA & Release Gates

**Project:** Homepage editorial redesign · **Status:** agent-ready specification · **Timebox:** 6–8 focused elapsed hours (parallel agents)

## Shared project contract
- This is an **incremental homepage-only redesign**, not a new storefront or replatform. Implement in `apps/web` (Next.js App Router + TypeScript + Tailwind CSS 4 + daisyUI 5). Keep Symfony, `/api/v1` proxy, product DTOs, admin, cart, checkout, and existing URLs unchanged.
- Normative existing definitions: `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`. These redesign documents supplement—not replace—the originals. Any conflict goes to the orchestrator; the existing API contract wins.
- Preserve existing palette: forest `#174D3D`, sage `#96A68B`, cream `#F5F3E9`, charcoal `#202822`, gold `#D6C45A`, paper `#FFFFFF`. Retain existing semantic daisyUI theme and readable sans/body + restrained editorial serif/hero. Use 4px spacing scale and existing rounded forms; do not adopt Lovable's terracotta palette or shadcn/ui.
- Lovable reference: https://lovable.dev/templates/websites/ecommerce/maison-artisan-home-lifestyle-store-template ; linked live preview https://scandi-haven-shop.lovable.app/. The listing describes parallax/Ken Burns hero, scroll-triggered reveals, asymmetric 12-column collection layouts, and animated mobile navigation. The live preview could not be fully inspected frame-by-frame: treat exact timings/order as our *proposed implementation*, not verified template facts.
- Source content comes from existing catalog endpoints `GET /api/v1/products` and `GET /api/v1/categories`; don't fabricate product categories, imagery, claims, reviews or promotions. Product images may use existing placeholders. No new backend endpoints or data migrations.
- Accessibility: semantic landmarks, visible focus, keyboard navigation, `prefers-reduced-motion` support, readable contrast, no essential meaning hidden behind an animation. Avoid heavy JS on initial load and cumulative layout shift.
- Scope exclusions: cart behavior, checkout, product detail imagery/gallery, product CRUD, admin UI, wishlist, CMS, new APIs and data model changes. Existing links must keep working.

## Responsibility / file ownership
Agent D owns tests and `docs/qa/home-redesign.md`; orchestrator owns `apps/web/src/app/page.tsx`, shared globals/layout and final sign-off. Never redesign other routes.

## Integration procedure
1. Verify frozen component exports and props. Merge `motion-qa` primitives first, then header, hero and sections (or use safe merges after all compile).
2. Wire `/` as a server component where possible. Fetch categories/products using existing client and frozen contract; pass typed props to section components. Preserve existing caching/error strategy. Wrap main with `id="main-content"` and stable section anchors.
3. Apply theme only via existing daisyUI tokens and scoped home classes. Verify header remains functional on every route.
4. Validate `/products`, `/cart`, `/checkout`, `/admin/login` and `/admin/products` still render (do not edit implementation).
5. Capture desktop/mobile screenshots, run keyboard walkthrough, reduced-motion emulation and smoke tests. Summarize remaining P2 polish items.

## Acceptance matrix
| Test ID | Scenario | Pass evidence |
|---|---|---|
| UI-01 | `/` loads with no catalog data | graceful empty sections, no crash |
| UI-02 | `/` has real catalog data | category links/product cards match DTOs |
| UI-03 | hero CTA | reaches `/products` |
| UI-04 | desktop header | nav and links remain usable while scrolling |
| UI-05 | mobile menu | open/close, Escape, focus return, click link |
| UI-06 | responsive 320/375/768/1024/1440 | no horizontal scroll or clipped headings |
| UI-07 | reduced-motion emulation | no parallax/Ken Burns/stagger, content visible |
| UI-08 | keyboard-only | focus visible, sensible order, no traps |
| UI-09 | slow connection/JS off | content is not permanently hidden by reveal |
| UI-10 | existing routes | catalog/cart/checkout/admin navigation unaffected |
| UI-11 | runtime | no hydration console errors or broken assets |
| UI-12 | container | existing Docker build/launch still succeeds |

## Commands to execute
From `apps/web`: `npm ci`, `npx tsc --noEmit`, `npm run lint` if script exists, `npm run build`. From repo root: `docker compose up --build -d` if Docker available, then smoke-check homepage and legacy pages. If Playwright exists run existing E2E; otherwise do not install an elaborate test harness just for this feature; documented manual browser checklist is acceptable for a weekend.

## Release gate / triage
- **Block:** failed build; a P0 route regression; inaccurate/fabricated inventory content; broken nav; focus trap; content inaccessible with reduced motion.
- **Fix by target deadline:** major mobile layout breakage, scrolling jank, hard-to-read contrast.
- **Defer:** tiny spacing mismatch, decorative animation nuance, template-perfect asset match.
- All checks record `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN` with evidence and who ran them. Do not claim a screenshot or benchmark you didn't capture.

## Handoff report format
Include base SHA, merge SHAs, changed-file list, commands + actual outcome, responsive screenshots where available, test matrix, known limitations, future options, and rollback `git revert` strategy. Orchestrator accepts only after explicit R4 sign-off.
