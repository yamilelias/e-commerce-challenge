# Infrastructure structure

- `compose.yaml` defines `api` and `web`. Only `web` publishes `127.0.0.1:${WEB_PORT:-3000}:3000`. `web` calls `api` at `http://api:8000` and waits for its health check. The `ecommerce_data` named volume mounts at `/data` in `api` only.
- `apps/api/Dockerfile` builds the PHP 8.3 FrankenPHP API image from the repository root context. It copies the unchanged fixture to `/app/data/products.csv`; `apps/api/Dockerfile.dockerignore` excludes private env files and local build/database outputs.
- `infra/docker/api/entrypoint.sh` validates required variables, prepares `/data/sessions` and `/app/var`, and drops to `www-data`. `infra/docker/api/start.sh` runs Doctrine migrations, then `app:products:seed --file=/app/data/products.csv`, then starts FrankenPHP using `infra/docker/api/Caddyfile` on port 8000. `infra/docker/api/health.php` checks the DB-aware `/api/v1/health` endpoint for HTTP 200.
- `apps/web/Dockerfile` builds Next.js standalone output with Node 22 and runs `server.js` as `node`; `apps/web/Dockerfile.dockerignore` excludes private files and local build outputs. `compose.yaml` supplies server-only `API_INTERNAL_URL=http://api:8000` and checks the public root route for HTTP success.
- `.env.example` lists local configuration inputs. Real `.env` values are untracked. Backend owns the health route, migration and seed command; frontend owns the `/api/v1/*` proxy. Their integration is pending a Docker runtime check.

Verification: `docker compose --env-file .env.example config --quiet` succeeded on 2026-10-15. Docker image builds, startup, health and persistence remain unverified because the Docker daemon was unavailable.
