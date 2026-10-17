# Homepage redesign verification

The checks below cover the homepage changes in `docs/redesign/06-INTEGRATION-QUALITY.md`. `NOT RUN` means no result has been observed yet. Record the date, command or browser setup, and actual result before changing a status.

| ID | Scenario | Status | Evidence |
|---|---|---|---|
| UI-01 | `/` with no catalog data has graceful empty sections | PASS | 2026-10-16: isolated `ecommerce-redesign-empty` Compose project on port 3302; after deleting only its seeded product/category rows, Chrome showed “There are no products to feature yet” and “Visit the catalog”; the collections section was absent, with no crash. Isolated project and volume removed with `docker compose -p ecommerce-redesign-empty down -v`. |
| UI-02 | `/` with catalog data shows real categories and products | PASS | 2026-10-16: Chrome on port 3300 showed five live categories and eight distinct live product cards: Air Purifier through Camping Chair. |
| UI-03 | Hero CTA reaches `/products` | PASS | 2026-10-16: clicked “Shop products” in Chrome; URL became `/products`, titled “Shop products | Field & Form”, with 12 of 85 products listed. |
| UI-04 | Desktop navigation remains usable while scrolling | PASS | 2026-10-16: Chrome at 1440px, at `#collections`, measured the sticky header at viewport top 0 with shared links present. |
| UI-05 | Mobile menu opens, closes, handles Escape and restores focus | PASS | 2026-10-16: Chrome at 320px: opening focused Home and locked body scroll; Escape closed and returned focus to the menu trigger; Collections click closed and navigated to `#collections`. |
| UI-06 | 320, 375, 768, 1024 and 1440px widths have no horizontal overflow or clipped headings | PASS | 2026-10-16: Chrome DOM measurements at all five widths found `scrollWidth === innerWidth`, H1 within viewport, and all four section IDs. |
| UI-07 | Reduced-motion preference shows content without parallax, ambient scale or stagger | NOT RUN | Browser media emulation was unavailable in this QA pass. Source CSS has reduced-motion overrides in `globals.css` and `Reveal.module.css`; runtime behavior remains unverified. |
| UI-08 | Keyboard order and focus visibility work without traps | PARTIAL | Mobile dialog Escape/focus return passed at 320px. A full Tab-order and visible-focus audit was not run. |
| UI-09 | Slow connection and disabled JavaScript do not leave reveal content hidden | NOT RUN | 2026-10-16: server HTML from port 3300 returned HTTP 200 with hero/collections/featured/story and CTA, and no `data-reveal-state` attributes. CSS defaults Reveal visible. Browser with JavaScript disabled and network throttling were not exercised. |
| UI-10 | `/products`, `/cart`, `/checkout`, `/admin/login` and `/admin/products` remain reachable | PASS | 2026-10-16: Chrome rendered catalog, cart, checkout, and admin login; `/admin/products` redirected to login as expected. HTTP smoke returned 200 for home, catalog, cart, checkout and login. |
| UI-11 | No hydration errors or broken assets in browser | PARTIAL | 2026-10-16: Chrome captured zero console errors during reveal and full-page visual inspection showed product photos. Complete network asset inspection was not run. |
| UI-12 | Docker Compose rebuild and startup succeed | PASS | 2026-10-16: `WEB_PORT=3300 PUBLIC_ORIGIN=http://localhost:3300 docker compose -p ecommerce-inf02 up --build -d web` exited 0; Turbopack build passed, API became healthy, web started, and proxied health returned database `ok`. An isolated empty-data stack on port 3302 was removed with its volume afterward. |

## Motion-specific checks

| ID | Scenario | Status | Evidence |
|---|---|---|---|
| M-01 | Reveal enters once as a below-viewport section intersects | PASS | 2026-10-16: Chrome DOM inspection found 16 waiting nodes at opacity 0 below the 1145px viewport; PageDown changed the first four to visible/opacity 1. After further scrolling, those nodes remained visible. |
| M-02 | Initial viewport content is visible before hydration | PASS | 2026-10-16: Chrome initial accessibility tree showed the hero heading and CTA; server HTML contains them and has no waiting reveal state. |
| M-03 | Disabled JavaScript leaves all Reveal children visible | NOT RUN | Server HTML contains no waiting reveal state, but a browser with JavaScript disabled was not run. |
| M-04 | Switching to reduced motion while waiting or animating shows content immediately | NOT RUN | Browser media preference switch was not available in this QA pass. |
| M-05 | Scroll through top, middle and bottom without layout shift or visible jank | NOT RUN | Collections scroll was visually inspected, but no complete top/mid/bottom or layout-shift measurement was captured. |
| M-06 | Added JS and performance observations recorded | NOT RUN | The implementation adds no package and uses one shared observer; bundle-size and performance measurements were not captured. |

## Build checks

| Check | Status | Evidence |
|---|---|---|
| `npm ci` | PASS | 2026-10-16, `apps/web`, exit 0; 437 pinned packages installed. |
| `npm run typecheck` | PASS | 2026-10-16, `apps/web`, exit 0 after clean install. |
| `npm run lint` | PASS | 2026-10-16, `apps/web`, exit 0 after clean install. |
| `npm run build` | PASS in Docker | 2026-10-16, Docker web image used default Turbopack and built all routes. Local Turbopack could not bind a PostCSS worker port in the sandbox (`Operation not permitted`). |
| `npm run build -- --webpack` | PASS | 2026-10-16, `apps/web`, exit 0 after integration; all routes compiled. |

The remaining `NOT RUN` and `PARTIAL` entries need browser preference or JavaScript/network emulation, a full keyboard and asset audit, or performance measurements. Source inspection is not counted as runtime proof.

## Featured card hover follow-up (2026-10-17)

The production web build on port 3100, backed by a disposable local product API fixture, rendered both images on the first homepage featured card. Browser inspection measured the alternate at opacity 0 initially, about 0.97 while the card was hovered, and about 0.01 after moving the pointer away. With the pointer off the card, keyboard focus on its link showed the alternate at opacity 1. Both images loaded. `npm run typecheck`, `npm run lint`, and `npm run build -- --webpack` passed after the card change. The reduced-motion CSS was reviewed in source but could not be emulated in this browser interface.
