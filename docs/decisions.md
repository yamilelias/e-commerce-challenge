# Execution decisions

## 2026-10-15 — Initial contract freeze

The orchestrator approved the existing schema and integration boundaries in `02-ARCHITECTURE.md` and the HTTP contract in `04-API.md` for parallel implementation. The API document governs exact wire shapes where implementation guides use examples. Notable fixed choices are USD integer cents, uppercase ASCII SKU uniqueness, soft deletion, create-only partial CSV import, session and CSRF protected admin writes, and one atomic `POST /orders` fake purchase with an idempotency key and receipt capability. Any change to these shared shapes requires a written amendment here, synchronized spec/code/test updates, and notice to Backend, Frontend, DevOps, and QA.
