# E-Commerce Challenge

Weekend MVP in progress: a Next.js storefront and admin UI use a same-origin `/api/v1` proxy to reach a Symfony API backed by persistent SQLite. The supplied [CSV](data/products.csv) is the seed input; the [landing-page image](docs/reference/landing-page.png) is a visual reference. See the [orchestrator](docs/00-ORCHESTRATOR.md) and [frozen API contract](docs/04-API.md) for intended behavior.

## Current status

Foundation code is being implemented. Clean Docker startup, migrations, seed, feature flows, and the setup commands have **not been runtime verified**. Follow [QA evidence](docs/qa/verification.md) and the [acceptance matrix](docs/qa/acceptance-matrix.md) for actual results. This is a Phase 1–2 draft, not yet a reproducible installation guide.

## Planned local setup — NOT VERIFIED

The repository contains `.env.example` and `compose.yaml`. They define a web service on loopback port `WEB_PORT` (default `3000`), an internal API service, and a named SQLite volume. Required private values are `APP_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `RECEIPT_SECRET`, and `PUBLIC_ORIGIN`. Replace every placeholder in a private `.env`; never commit it. The exact password-hash generation and first-boot commands await runtime verification from Backend and DevOps. Do not use placeholder values as credentials.

Once prerequisites are established, the intended browser address is `http://localhost:3000`, with browser API requests at `http://localhost:3000/api/v1/*`. The API container is not exposed directly to the host. HTTP localhost is a development-only exception to HTTPS cookie security.

## Planned user journeys — NOT VERIFIED

- Browse/search products, adjust a cart, submit guest details, and see a fake-paid order confirmation.
- Sign in as administrator, create/edit/deactivate products, and upload CSV with row-level feedback.
- Seed the original CSV on first boot and rerun the create-only importer without overwriting products.

The source CSV intentionally contains invalid and duplicate records. Valid rows should be imported; rejected and skipped rows should be reported. Accepted-row totals must come from an actual run.

## Test plan

`python3 scripts/smoke/public_api.py` is a read-only proxy smoke check for health, catalog envelopes, categories, query errors, and anonymous admin access. It requires a running stack and Python 3. It exits nonzero on failure and never prints credentials. Its syntax is checked in [QA evidence](docs/qa/verification.md); an HTTP pass is pending.

Backend tests, authenticated CRUD/import, checkout replay/stock checks, browser journeys, restart persistence, and README-only cold setup remain pending. See [QA cases](docs/qa/acceptance-matrix.md), [quality requirements](docs/07-QUALITY.md), and [task board](docs/task-board.md). Docker and test runner commands will be added after their owners verify them.

## Architecture and decisions

The frozen contract uses Symfony/Doctrine with SQLite and Next.js/React/TypeScript/Tailwind/daisyUI. Product and order prices use integer cents; product write prices use decimal strings. SKUs are trimmed and uppercased; deletion is soft; checkout uses one atomic fake-payment request with an idempotency key and server-calculated prices. A receipt token acts as a bearer capability. [Architecture](docs/02-ARCHITECTURE.md) and [decisions](docs/decisions.md) explain the contract.

The MVP chooses SQLite over PostgreSQL, SQL search over a dedicated service, one environment-configured admin over hosted auth, fake payment over a gateway, one layered backend over microservices, and synchronous CSV import over a job queue. These choices keep local setup small. SQLite write concurrency and synchronous import throughput limit scale; the result is not production-ready. There are no customer accounts, shipping, taxes, or real charges. Rotating the receipt secret invalidates prior receipt links.

## Project layout

- `apps/api/` — Symfony API and database code (in progress).
- `apps/web/` — Next.js UI and proxy (in progress).
- `infra/` and `compose.yaml` — container setup (in progress).
- `data/products.csv` — supplied seed data.
- `docs/` — contracts, task board, QA evidence.
- `memory/` — implemented structure and decision records.
