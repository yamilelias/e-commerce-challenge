# Homepage redesign verification

The checks below cover the homepage changes in `docs/redesign/06-INTEGRATION-QUALITY.md`. `NOT RUN` means no result has been observed yet. Record the date, command or browser setup, and actual result before changing a status.

| ID | Scenario | Status | Evidence |
|---|---|---|---|
| UI-01 | `/` with no catalog data has graceful empty sections | NOT RUN | — |
| UI-02 | `/` with catalog data shows real categories and products | NOT RUN | — |
| UI-03 | Hero CTA reaches `/products` | NOT RUN | — |
| UI-04 | Desktop navigation remains usable while scrolling | NOT RUN | — |
| UI-05 | Mobile menu opens, closes, handles Escape and restores focus | NOT RUN | — |
| UI-06 | 320, 375, 768, 1024 and 1440px widths have no horizontal overflow or clipped headings | NOT RUN | — |
| UI-07 | Reduced-motion preference shows content without parallax, ambient scale or stagger | NOT RUN | — |
| UI-08 | Keyboard order and focus visibility work without traps | NOT RUN | — |
| UI-09 | Slow connection and disabled JavaScript do not leave reveal content hidden | NOT RUN | — |
| UI-10 | `/products`, `/cart`, `/checkout`, `/admin/login` and `/admin/products` remain reachable | NOT RUN | — |
| UI-11 | No hydration errors or broken assets in browser | NOT RUN | — |
| UI-12 | Docker Compose rebuild and startup succeed | NOT RUN | — |

## Motion-specific checks

| ID | Scenario | Status | Evidence |
|---|---|---|---|
| M-01 | Reveal enters once as a below-viewport section intersects | NOT RUN | — |
| M-02 | Initial viewport content is visible before hydration | NOT RUN | — |
| M-03 | Disabled JavaScript leaves all Reveal children visible | NOT RUN | — |
| M-04 | Switching to reduced motion while waiting or animating shows content immediately | NOT RUN | — |
| M-05 | Scroll through top, middle and bottom without layout shift or visible jank | NOT RUN | — |
| M-06 | Added JS and performance observations recorded | NOT RUN | — |

## Build checks

| Check | Status | Evidence |
|---|---|---|
| `npm ci` | NOT RUN | — |
| `npm run typecheck` | PASS | 2026-10-16, `apps/web`, exit 0 during parallel section work. |
| `npm run lint` | PASS | 2026-10-16, `apps/web`, exit 0 during parallel section work. |
| `npm run build` | BLOCKED | 2026-10-16, Turbopack could not bind a PostCSS worker port in the local sandbox (`Operation not permitted`); rerun through Docker or unrestricted environment. |
| `npm run build -- --webpack` | BLOCKED | 2026-10-16, concurrent `StoreHeader.tsx` references navigation `MobileMenu` before its file exists; rerun after agent integration. |

The integration owner should update this record after the composed homepage and Docker stack are available. Screenshots, if captured, should identify viewport dimensions and browser setup.
