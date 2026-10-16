# Backend foundation (BE-01)

- Status: Implemented in source; PHP/Composer execution and Docker boot are not verified in this environment. Product, admin, import, and order routes remain BE-02 work.
- Public route: `GET /api/v1/health` in `apps/api/src/Controller/Api/V1/HealthController.php` executes `SELECT 1` through Doctrine DBAL and returns the frozen `{data:{status,database}}` payload or a 503 error envelope.
- API entry points: `apps/api/public/index.php` boots `apps/api/src/Kernel.php`; `apps/api/bin/console` exposes Symfony CLI commands. Attribute routes are loaded by `apps/api/config/routes.yaml`. Unhandled API exceptions are mapped to generic JSON by `apps/api/src/Http/ApiExceptionSubscriber.php`.
- Persistence: `apps/api/migrations/Version20261015000000.php` creates `categories`, `products`, `orders`, and `order_items` with unique indexes, foreign keys, CHECK constraints, and the frozen `request_fingerprint` and `receipt_token_hash` columns. Matching Doctrine mapping classes are in `apps/api/src/Entity/{Category,Product,Order,OrderItem}.php`. `apps/api/src/Database/SqliteConnection.php` enables foreign keys and a 5-second busy timeout per SQLite connection; Doctrine wiring is in `apps/api/config/packages/doctrine.yaml`.
- Runtime: Requires PHP 8.3+, PDO SQLite, installed Composer dependencies, `DATABASE_URL`, `APP_SECRET`, `SESSION_COOKIE_SECURE`, and writable `/data/sessions`; DevOps owns container configuration. `apps/api/composer.json` defines dependencies, while a lockfile remains ungenerated until Composer/network access is available.
- Verification: Python SQLite executed all 12 migration `up()` SQL statements and rejected duplicate SKU, nonpositive price, and missing category FK. PHPUnit tests in `apps/api/tests/Integration/` exist but have not run.

See `docs/02-ARCHITECTURE.md`, `docs/03-BACKEND.md`, and `docs/04-API.md` for the frozen contracts.
