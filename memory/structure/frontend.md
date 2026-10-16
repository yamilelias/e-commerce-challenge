# Frontend foundation and catalog (FE-01)

- UI routes: `/` in `apps/web/src/app/page.tsx` renders the landing and four real product results; `/products` in `apps/web/src/app/products/page.tsx` and `CatalogPageClient.tsx` renders URL-backed search, category, sort, and pagination controls.
- The shared shell is `apps/web/src/app/layout.tsx`; colors and daisyUI theme are in `apps/web/src/app/globals.css`. Product cards in `apps/web/src/components/products/ProductCard.tsx` show deterministic non-photo placeholders, stock status, and integer-cent USD prices.
- `apps/web/src/components/catalog/CatalogResults.tsx` fetches `/api/v1/products` with abortable requests and renders loading, empty, retryable error, and result states. `CategoryLinks.tsx` reads `/api/v1/categories` for landing shortcuts.
- Browser API functions, contract shapes, and error mapping live in `apps/web/src/lib/api/client.ts` and `types.ts`. They call same-origin routes. `apps/web/src/app/api/v1/[...path]/route.ts` forwards GET, POST, PATCH, DELETE to server-only `API_INTERNAL_URL`, preserving selected request headers, upstream status/body, and every `Set-Cookie` value.
- `apps/web/package.json` and lockfile pin Next.js, React, TypeScript, Tailwind CSS, and daisyUI. `next.config.ts` emits standalone output for the DevOps-owned Dockerfile. Local checks: `npm run typecheck`, `npm run lint`, `npm run build`.
- Unfinished: product detail and cart links await FE-02; checkout and admin screens are also FE-02. Live seeded API and browser journeys have not yet been verified.
