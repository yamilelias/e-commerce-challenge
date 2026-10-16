# Execution decisions

## 2026-10-15 — Initial contract freeze

The orchestrator approved the existing schema and integration boundaries in `02-ARCHITECTURE.md` and the HTTP contract in `04-API.md` for parallel implementation. The API document governs exact wire shapes where implementation guides use examples. Notable fixed choices are USD integer cents, uppercase ASCII SKU uniqueness, soft deletion, create-only partial CSV import, session and CSRF protected admin writes, and one atomic `POST /orders` fake purchase with an idempotency key and receipt capability. Any change to these shared shapes requires a written amendment here, synchronized spec/code/test updates, and notice to Backend, Frontend, DevOps, and QA.

## 2026-10-15 — Container runtime choice

Use `dunglas/frankenphp:1-php8.3-bookworm` for the API container, with Caddy `php_server` on the internal port 8000, and `node:22-bookworm-slim` for the standalone Next.js web container. FrankenPHP gives Symfony a single PHP HTTP runtime for this small Compose setup; the alternative PHP-FPM plus a separate web server would add configuration and potentially a third service. The trade-off is a less conventional PHP runtime and a Docker image build that still needs verification. Container startup, health and persistence are **NOT VERIFIED** because the local Docker daemon is unavailable.
## 2026-10-16 — Image catalog extension

The original image placeholder decision is superseded for the valid seeded products. A curated `data/product-images.json` maps normalized SKUs to direct Wikimedia Commons HTTPS thumbnail URLs and their source, creator, and free-license metadata. A nullable product-schema migration and idempotent enrichment command populate the database after seed. The frontend displays the URL with attribution and retains a placeholder when no usable image loads. The supplied CSV and product write contract remain unchanged. See `memory/decisions/remote-product-images.md` for rationale and consequences.
