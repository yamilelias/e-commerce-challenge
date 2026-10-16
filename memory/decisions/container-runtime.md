# Container runtime

- Date: 2026-10-15
- Status: Chosen, runtime verification pending
- Context: The MVP requires independent API and web containers, while keeping Compose small.
- Decision: Use FrankenPHP 1 with PHP 8.3 and Caddy `php_server` on internal port 8000 for Symfony; use Node 22 slim for Next.js standalone runtime.
- Reason: A single API image can serve Symfony directly, and the web runtime matches the Next.js standalone build.
- Alternatives considered: PHP-FPM plus Nginx/Caddy as another process or container; more configuration and another deployment component for this MVP.
- Consequences: Runtime images and boot scripts must be tested when Docker is available. Current host has no working Docker daemon, so startup, health and persistence are not verified.
- Affected contracts/files: `compose.yaml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `infra/`, `docs/decisions.md`.
