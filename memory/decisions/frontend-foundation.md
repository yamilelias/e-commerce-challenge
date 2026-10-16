# Frontend foundation and catalog

- Date: 2026-10-15
- Status: Active
- Context: The CSV has mixed categories and no product image field. The browser must use same-origin `/api/v1` while the API is internal to Compose.
- Decision: Build a client-fetched catalog from frozen DTOs with URL-backed search/filter/sort/page state and deterministic category-letter visual placeholders. Use an explicit Next.js route handler for the API boundary, forwarding only contract-relevant headers and all session cookies.
- Reason: The catalog reflects real products and avoids invented metadata; URL state supports refresh and sharing; explicit proxy handling preserves the session and multipart semantics needed by later admin work.
- Alternatives considered: Embedded fixture catalog, remote stock images, and a generic rewrite. Fixtures would diverge from seeded data; remote images add a runtime dependency; rewrite behavior for multiple cookies and multipart headers was not established.
- Consequences: Browser pages require a running API for data. Product detail/cart/admin/checkout follow in FE-02. Proxy uses server-only `API_INTERNAL_URL`; DevOps sets that variable in Compose.
- Affected files/contracts: `apps/web/src/app/**`, `apps/web/src/components/**`, `apps/web/src/lib/**`, `apps/web/next.config.ts`, `docs/04-API.md` (consumed unchanged).
