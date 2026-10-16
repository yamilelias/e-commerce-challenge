# 00 — Redesign Orchestrator Operating Plan

**Project:** Homepage editorial redesign · **Status:** agent-ready specification · **Timebox:** 6–8 focused elapsed hours (parallel agents)

## Shared project contract
- This is an **incremental homepage-only redesign**, not a new storefront or replatform. Implement in `apps/web` (Next.js App Router + TypeScript + Tailwind CSS 4 + daisyUI 5). Keep Symfony, `/api/v1` proxy, product DTOs, admin, cart, checkout, and existing URLs unchanged.
- Normative existing definitions: `00-ORCHESTRATOR.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `04-API.md`, `05-FRONTEND.md`. These redesign documents supplement—not replace—the originals. Any conflict goes to the orchestrator; the existing API contract wins.
- Preserve existing palette: forest `#174D3D`, sage `#96A68B`, cream `#F5F3E9`, charcoal `#202822`, gold `#D6C45A`, paper `#FFFFFF`. Retain existing semantic daisyUI theme and readable sans/body + restrained editorial serif/hero. Use 4px spacing scale and existing rounded forms; do not adopt Lovable's terracotta palette or shadcn/ui.
- Lovable reference: https://lovable.dev/templates/websites/ecommerce/maison-artisan-home-lifestyle-store-template ; linked live preview https://scandi-haven-shop.lovable.app/. The listing describes parallax/Ken Burns hero, scroll-triggered reveals, asymmetric 12-column collection layouts, and animated mobile navigation. The live preview could not be fully inspected frame-by-frame: treat exact timings/order as our *proposed implementation*, not verified template facts.
- Source content comes from existing catalog endpoints `GET /api/v1/products` and `GET /api/v1/categories`; don't fabricate product categories, imagery, claims, reviews or promotions. Product images may use existing placeholders. No new backend endpoints or data migrations.
- Accessibility: semantic landmarks, visible focus, keyboard navigation, `prefers-reduced-motion` support, readable contrast, no essential meaning hidden behind an animation. Avoid heavy JS on initial load and cumulative layout shift.
- Scope exclusions: cart behavior, checkout, product detail imagery/gallery, product CRUD, admin UI, wishlist, CMS, new APIs and data model changes. Existing links must keep working.

## Mission and measurable outcome
Restructure `/` to echo the Lovable template's **composition and motion** while retaining our own design system. At delivery: a responsive homepage with header/navigation, hero, collection grid, real-product highlights, brand/editorial transition and footer; reduced-motion and mobile QA; existing commerce journeys untouched.

## Team and work ownership
- **Orchestrator (integrator):** freezes section order, named exports, design tokens, motion API; owns `apps/web/src/app/page.tsx` final composition and architecture decisions; merges worktrees, runs full build and approves release.
- **Agent A — Header & Navigation:** `apps/web/src/components/layout/StoreHeader.tsx` and `apps/web/src/components/home/navigation/**`; owns `02-HEADER-NAVIGATION.md` tasks. Coordinate before modifying shared `StoreHeader` used elsewhere.
- **Agent B — Hero:** `apps/web/src/components/home/hero/**`; owns `03-HERO-SECTION.md` tasks. Does not edit `page.tsx`.
- **Agent C — Content Sections:** `apps/web/src/components/home/sections/**`; owns `04-HOMEPAGE-SECTIONS.md` tasks. Does not edit catalog page or API client.
- **Agent D — Motion & QA:** `apps/web/src/lib/motion/**`, `apps/web/src/components/home/motion/**`, `apps/web/src/tests/home/**`, and `docs/qa/home-redesign.md`; owns `05-MOTION-SYSTEM.md` and `06-INTEGRATION-QUALITY.md`; does not edit section JSX without permission.
- **Shared theme/globals:** orchestrator is sole editor of `apps/web/src/app/globals.css` and `apps/web/src/app/layout.tsx`; Agent D submits token changes as a patch request.

## Contract freeze: before delegation
Record in `docs/redesign/DECISIONS.md`: section order and IDs (`hero`, `collections`, `featured`, `story`); component exports (`HomeHero`, `CollectionEditorial`, `FeaturedProducts`, `BrandStory`); `HomeHeader`/existing `StoreHeader` compatibility; animation helpers (`Reveal`, `useReducedMotion` if introduced); section props and data ownership. Decide if imagery is placeholder; do not block on it.

## Delivery phases (wall-clock estimates; parallel)
| Gate | Elapsed window | Work | Pass condition |
|---|---|---|---|
| R0 Reference & freeze | 0–45 min | Orchestrator reviews old `05-FRONTEND.md`, records contracts, snapshots current screenshot | Contract committed; links/pages baseline documented |
| R1 Foundation | 45–90 min | Agent D motion primitives; orchestrator tokens; A/B/C scaffolds | `npm run build` passes with placeholder section imports |
| R2 Parallel sections | 1.5–4.5 h | A header, B hero, C remaining sections; D tests/a11y | Each agent supplies screenshots, API usage, reduced-motion checks |
| R3 Integration | 4.5–6 h | Orchestrator composes `/`, resolves responsive gutters/section rhythm | 320/768/1440px views, no broken links or compile errors |
| R4 Polish & handoff | 6–8 h | D accessibility/performance regression; orchestrator fixes blockers | QA checklist complete; README note; evidence & known gaps |

## Execution policy
1. Each agent gets its own worktree/branch (`redesign/nav`, `redesign/hero`, `redesign/sections`, `redesign/motion-qa`) branched from a common base. If worktrees unavailable, use disjoint files on one branch with orchestrator-controlled merges.
2. Every assignment includes file ownership, accepted exported interfaces, responsive layout requirements, no-go areas, verification commands, and a 20-minute escalation threshold.
3. Never copy Lovable source code or assets. The public listing is inspiration; implement original markup, CSS and motion logic.
4. No new animation package by default. Agent D proposes Motion for React only if already installed or justified by meaningful simplification; the orchestrator decides and pins the dependency.
5. Do not change any server-side business logic. A homepage edit must not break catalog/admin/cart routes.
6. Missing catalog data must render graceful empty state, not fake listings.
7. Freeze optional visual extras at elapsed hour 5; after that fix only integration, a11y and bugs.

## Handoff template (every agent)
`Task ID / owner / branch / commit SHA / touched files / exported API / commands run + result / screenshots (desktop & mobile) / keyboard & reduced-motion results / blocked items / deviations`.

## Blocking severity
- **P0:** build fails, route broken, data fabricated, inaccessible navigation, crashes or introduces backend breaking change → release blocked.
- **P1:** serious mobile overflow, invisible content under reduced-motion, animation jank, nav regressions → fix before release.
- **P2:** copy polish, minor timing/spacing differences → document, may defer.

## Final approval commands
From `apps/web`: `npm ci`, `npm run lint` (if configured), `npx tsc --noEmit`, `npm run build`; run existing browser/E2E smoke tests if configured. Verify with Compose when available. Never claim PASS for tests not run.
