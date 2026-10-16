# Homepage redesign navigation (RD-01)

- `apps/web/src/components/layout/StoreHeader.tsx` remains the shared `StoreHeader` used by `apps/web/src/app/layout.tsx` on every route. It provides the brand link, `/products`, `/cart` with the cart count, a skip link to `#main-content`, and a sticky surface that reacts to scroll. On `/`, it also links to the homepage `#collections` and `#featured` sections.
- `apps/web/src/components/home/navigation/MobileMenu.tsx` renders the small-screen native modal `<dialog>`. It handles menu links, Escape and close, focus return, responsive close when the desktop breakpoint is reached, and temporary body scroll locking. Its link entrance animation is disabled when reduced motion is requested.
- `apps/web/src/components/home/navigation/navigation.module.css` provides the header and menu entrance animations, using the shared motion easing token and disabling both for reduced motion.
- The header does not change API calls, cart storage, admin routes, or other storefront routes. See `docs/redesign/02-HEADER-NAVIGATION.md` and `docs/redesign/DECISIONS.md` for the intended behavior.
