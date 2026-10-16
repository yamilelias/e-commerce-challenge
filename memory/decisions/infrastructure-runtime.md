# Local Docker runtime

- Date: 2026-10-15
- Status: Active, runtime verified in an isolated Compose project on 2026-10-16
- Context: The local demo needs two independent containers, a single browser port, DB-backed health and durable SQLite without host PHP or Node.
- Decision: Use FrankenPHP with PHP 8.3 and a Caddy `php_server` front controller for `api`; use Node 22 and Next.js standalone output for `web`. Mount a named Docker volume at `/data` only in `api`; perform migrations, idempotent CSV seed, and idempotent image URL enrichment at API startup before serving.
- Reason: This keeps the required two-container topology and gives Symfony a real concurrent HTTP server without a third proxy container. Startup initialization targets the mounted database and prevents web readiness before schema and seed are prepared.
- Alternatives considered: PHP built-in server (prohibited by `docs/06-INFRASTRUCTURE.md` for the shipped runtime); nginx plus PHP-FPM (adds a third container); bind-mounted SQLite (host locking differs by platform).
- Consequences: API is a single writer/replica. A failed migration, seed, or image catalog import prevents readiness. Symfony Runtime needs an empty `/app/.env` in the image even when private values come from Compose; the image uses production PHP settings and the API health check verifies the JSON body to avoid treating a PHP fatal HTTP 200 as ready. Stable `APP_SECRET` and `RECEIPT_SECRET` and the named volume must be preserved across normal restarts.
- Affected files/contracts: `compose.yaml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `infra/docker/api/*`, `.env.example`; topology and boot contract in `docs/06-INFRASTRUCTURE.md`.
