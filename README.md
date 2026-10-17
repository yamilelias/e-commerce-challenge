# E-Commerce Challenge

A local e-commerce MVP with a Next.js storefront and admin UI, a Symfony API, and persistent SQLite. The supplied [product CSV](data/products.csv) seeds the catalog; the [landing-page image](docs/reference/landing-page.png) guided the responsive layout. Checkout simulates payment and creates a paid order; it does not charge a card.

> CSV data download date: Oct 14, 2026

## Prerequisites and setup

Install Docker Desktop (or Docker Engine with Compose v2) and Python 3. No host PHP or Node.js is needed. Keep the app on localhost: the development session cookie permits HTTP, and this stack is not configured for public deployment.

1. Copy `.env.example` to `.env`.
2. Generate two **different** secrets with `openssl rand -hex 32`; enter them as `APP_SECRET` and `RECEIPT_SECRET` in `.env`.
3. Choose a private `ADMIN_USERNAME`. Generate an admin password hash without placing the password on a command line:

   ```sh
   docker run --rm -it php:8.3-cli php -r '$password = trim(fgets(STDIN)); echo password_hash($password, PASSWORD_DEFAULT), PHP_EOL;'
   ```

   Type the password at the prompt, then copy only the resulting hash into `ADMIN_PASSWORD_HASH` in `.env`. Enclose the hash in single quotes so Compose does not interpret its `$` characters. Keep `.env` private; it is Git ignored.
4. Leave `WEB_PORT=3000` and `PUBLIC_ORIGIN=http://localhost:3000` together, or change both to the same port. Start from the repository root:

   ```sh
   docker compose up --build -d
   docker compose ps
   python3 scripts/smoke/public_api.py
   ```

Open <http://localhost:3000>. The `api` container runs migrations, the create-only CSV seed, and product image enrichment before it becomes healthy; the `web` container starts afterward. Only the web port is published, on loopback. Browser API calls go through the same-origin `/api/v1` proxy.

The homepage uses an editorial hero, live category collections, eight featured catalog products, and a short brand section. Its cards come from the existing API, with loading and empty states. The products catalog adds a photo hero, searchable and filterable editorial cards, and a contact banner. Product details show an image gallery, quantity control, and related items from the same category. Motion respects reduced-motion preferences. See the [homepage redesign plan](docs/redesign/00-REDESIGN-ORCHESTRATOR.md) and the [products verification record](docs/qa/products-redesign.md).

The original CSV has 97 data rows. A fresh seed inserts 85 products, skips 5 duplicate or blank rows, and rejects 7 invalid rows with reasons. A restart or repeat seed inserts none and preserves edits and purchased stock. Review the actual report with:

```sh
docker compose logs api
docker compose exec api php bin/console app:products:seed --file=/app/data/products.csv
docker compose exec api php bin/console app:products:images --file=/app/data/product-images.json
```

## Product photos

`data/product-images.json` maps each of the 85 seeded SKUs to a primary photo and at least two alternate Wikimedia Commons photos, each with a direct URL, source page, creator credit, and license link. The API stores these **URLs and attribution fields**, not image bytes. Startup enriches matching products after the CSV seed. Repeating the command above preserves existing primary photos and imported alternate slots; new admin products without a catalog entry use the visual fallback. The original CSV and admin product form do not accept image fields. Run `python3 scripts/smoke/product_image_catalog.py` to check catalog coverage and metadata.

The storefront requests thumbnails directly from Wikimedia Commons. Product detail links to each selected image's source and license and shows its creator credit. Catalog cards show an alternate photo on hover when available. A browser needs network access to Commons to show the photos; missing or unreachable images display a fallback. Commons can remove or change an image, so review its source and license when updating the catalog. Remote requests also expose the visitor's IP address to Wikimedia Commons.

## Use the application

- Browse or search at `/products`; open a product, choose a quantity, and add it to the cart. The cart persists in this browser. Checkout accepts a guest name and email, recalculates prices on the server, decrements stock once, and shows a token-protected paid receipt. Save the receipt URL privately if you need to revisit it.
- Sign in at `/admin/login` with the credentials configured in `.env`. Create, edit, or deactivate products at `/admin/products`. Import a CSV at `/admin/import`; the page shows inserted, skipped, and rejected counts plus row issues. Valid rows are accepted even when other rows are invalid. Reimporting an existing SKU does not overwrite it.
- Product deletion is a soft delete, so prior order snapshots remain intact. Admin mutations require a session, CSRF token, and matching browser origin.

## Tests and maintenance

These checks target the running stack. The admin smoke creates and deactivates its own disposable product; checkout smokes create fake paid orders and reduce stock. Keep the private password in a file readable only by you; do not paste it into the command line.

```sh
python3 scripts/smoke/public_api.py
python3 scripts/smoke/admin_api.py --username YOUR_ADMIN_USERNAME --password-file /path/to/private-password-file
python3 scripts/smoke/checkout_api.py
```

Run backend tests without host PHP, and web checks without host Node.js:

```sh
docker build --target test -t ecommerce-api-test -f apps/api/Dockerfile .
docker run --rm ecommerce-api-test vendor/bin/phpunit
docker run --rm -v "$PWD/apps/web:/app" -w /app node:22-bookworm-slim sh -c 'npm ci && npm run typecheck && npm run lint && npm run build'
```

The web check writes `node_modules` and `.next` inside the mounted workspace. If you have Node.js 22 locally, `cd apps/web && npm ci && npm run typecheck && npm run lint && npm run build` is equivalent. Check production dependency advisories with `npm audit --omit=dev` in `apps/web` when npm registry access is available.

Stop and restart without deleting data:

```sh
docker compose down
docker compose up -d
```

For a deliberate reset, `docker compose down -v` deletes the named SQLite volume; back up anything needed first. Then `docker compose up --build -d` creates and seeds a new database. For errors use `docker compose logs api`, `docker compose logs web`, and `docker compose ps`. A changed `WEB_PORT` needs a matching `PUBLIC_ORIGIN`, and Docker must be running before Compose commands.

## Architecture and decisions

```text
Browser → Next.js web (:3000, loopback) → /api/v1 proxy → Symfony API (internal :8000)
                                                    → Doctrine → SQLite named volume
```

Prices and order totals use integer cents; product write prices are decimal strings. SKUs are trimmed, uppercased, and unique. Checkout verifies server prices and stock in a SQLite transaction, stores item snapshots, and uses a UUID idempotency key so an identical retry returns the same paid order. A receipt token is a bearer capability; rotating `RECEIPT_SECRET` invalidates old links. See the [architecture](docs/02-ARCHITECTURE.md), [API contract](docs/04-API.md), and [decisions](docs/decisions.md).

SQLite and synchronous import keep setup small but limit write concurrency and large-file throughput. Built-in SQLite case folding does not match every accented uppercase product name. This MVP has one environment-configured admin, no customer accounts, shipping, taxes, card payments, email, or public deployment configuration. Five remaining npm high advisories are in the ESLint development dependency chain; `npm audit --omit=dev` reports zero production vulnerabilities on the verified lockfile.

## Project map and verification

- `apps/api/`: Symfony controllers, services, entities, migrations, tests, seed and image enrichment commands.
- `data/product-images.json`: curated image URLs and attribution metadata; no image files are stored.
- `apps/web/`: Next.js storefront, admin UI, cart, checkout, and API proxy.
- `compose.yaml` and `infra/`: the two-container runtime and persistent database volume.
- `docs/qa/`: [acceptance matrix](docs/qa/acceptance-matrix.md), [execution evidence](docs/qa/verification.md), and [defect log](docs/qa/defects.md).
- `memory/`: implemented structure and decision records for maintainers.
