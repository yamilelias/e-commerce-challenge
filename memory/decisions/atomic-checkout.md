# Atomic fake-paid checkout and receipts

- Date: 2026-10-16
- Status: Active
- Context: Guest checkout must use server prices, avoid overselling under concurrent requests, recover from lost responses, and keep receipts private without a customer account.
- Decision: Normalize and fingerprint the request, then execute the idempotency lookup, active-product reads, conditional stock updates, fake payment, paid order and immutable line snapshots inside SQLite `BEGIN IMMEDIATE`/`COMMIT`. Retry a transient busy error once. Store a unique UUID checkout key and request fingerprint, and derive a receipt capability as `HMAC-SHA256(RECEIPT_SECRET, "receipt:v1:" + normalized key)`; persist only its SHA-256 hash.
- Reason: A single early SQLite writer lock and conditional updates prevent two buyers from committing the last unit. The stable derived token permits safe same-key replay after a lost response while keeping the bearer token out of the database.
- Alternatives considered: Read-then-write stock checks, separate pending/payment endpoint, storing receipt tokens in plaintext, client price totals. These violate the frozen transaction or privacy contract.
- Consequences: `RECEIPT_SECRET` must remain stable and at least 32 bytes; rotating it invalidates old receipt URLs. SQLite serializes writers; the MVP does not target high write throughput. Server/proxy access logs must not record receipt query tokens.
- Affected files/contracts: `apps/api/src/Service/CheckoutService.php`, `apps/api/src/Service/ReceiptTokenService.php`, `apps/api/src/Service/FakePaymentGateway.php`, `apps/api/src/Controller/Api/V1/OrderController.php`, `docs/04-API.md`.
