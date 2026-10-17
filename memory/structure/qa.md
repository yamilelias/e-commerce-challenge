# QA evidence structure

As of 2026-10-16, `scripts/smoke/public_api.py` checks proxied health, catalog, categories, empty search/pagination, query errors, and anonymous admin access. `scripts/smoke/admin_api.py` logs in with a private password file and tests session/CSRF/Origin protection, product CRUD/validation, and repeat CSV upload using a disposable SKU. `scripts/smoke/checkout_api.py` creates a fake paid order and checks price snapshots, stock, idempotent retry, oversell rollback, client-price rejection, and receipt access including malformed tokens. All use Python's standard library and target the browser-facing `/api/v1` proxy.

`docs/qa/acceptance-matrix.md` tracks AC-01–AC-21 and C-01–C-16 status. `docs/qa/verification.md` records actual command results and manual browser checks. `docs/qa/defects.md` tracks fixes and the documented Unicode search limitation. `README.md` holds the local Compose setup, usage, tests, reset, and architectural trade-offs. See `docs/07-QUALITY.md` for the full contract.

QA-04 extends `docs/qa/acceptance-matrix.md` and `docs/qa/verification.md` with remote image catalog, database/API, startup, and browser evidence. The setup and image dependency are documented in `README.md`; `docs/06-INFRASTRUCTURE.md` names the two data fixtures copied into the API image.

`scripts/smoke/product_image_catalog.py` checks all 85 seeded image records, their two alternates, metadata and direct URL shape before import. `docs/qa/products-redesign.md` records catalog/gallery browser checks and the API runtime limitation for the products redesign.
