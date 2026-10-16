# Guest cart and checkout retry

- Date: 2026-10-15
- Status: Active
- Context: Checkout may succeed server-side while the browser loses the response, and product prices/stock may change after a customer adds an item.
- Decision: Persist only product IDs and quantities in versioned localStorage; reread product details for cart display. Persist a UUID plus normalized original checkout body and fingerprint in sessionStorage. Replay an unresolved attempt with the original body/key, including after refresh; changing the cart or buyer fields requires resolving it or an explicit user reset before a new key is generated. Clear a definitively rejected attempt, or clear cart and attempt after a paid 201/replay 200. Receipt view fetches the server snapshot with its bearer token and sends no-store/no-referrer/noindex headers.
- Reason: Server totals and stock remain authoritative, while uncertain network outcomes can be retried without duplicate purchase. Receipt data stays gated by the capability URL.
- Alternatives considered: Store prices in cart, generate a new UUID on each submit, or show client-only confirmation. Each would violate the frozen purchase contract or risk misleading the purchaser.
- Consequences: Checkout requires a working API; local estimate can differ from the paid total. SessionStorage holds the purchase body until success, definitive rejection, explicit reset, or browser session end to recover the same attempt after refresh. Reset warns that an earlier purchase may have completed. Receipt links must be kept private by their holder.
- Affected files/contracts: `apps/web/src/features/cart/**`, `apps/web/src/features/checkout/**`, `apps/web/src/app/cart/**`, `apps/web/src/app/checkout/**`, `apps/web/src/app/orders/**`, `apps/web/next.config.ts`; consumes `docs/04-API.md` unchanged.
