# Backend foundation choices

- Date: 2026-10-15
- Status: Active; PHP container verification complete, Compose integration pending
- Context: BE-01 needs a Symfony/Doctrine foundation and SQLite safety constraints before feature services are built. The host has no PHP/Composer or running Docker daemon.
- Decision: Use Symfony 7.4, Doctrine ORM 3, DBAL 3, and one hand-written SQLite migration. Pin DBAL 3 because `SqliteConnection::connect()` wraps its documented public boolean connection method to enable foreign keys and a busy timeout for HTTP, CLI, and migration connections. Keep the health endpoint as a DBAL `SELECT 1` probe.
- Reason: One migration matches the frozen schema, and connection-local pragmas protect all entry points without relying on each service to remember them. A DB-aware probe detects unavailable SQLite storage.
- Alternatives considered: Scattered PRAGMA calls in controllers and commands; relying on SQLite defaults; Doctrine-generated schema with weaker CHECK constraints. Each risks inconsistent connection behavior or loss of DB-level invariants.
- Consequences: DBAL 4 needs an intentional wrapper revision. Composer lockfile now targets PHP 8.3; PHP lint, PHPUnit, Doctrine migration and mapping validation passed in a PHP 8.5 container. Compose integration remains pending. No API contract change was made.
- Affected files/contracts: `apps/api/composer.json`, `apps/api/config/packages/doctrine.yaml`, `apps/api/src/Database/SqliteConnection.php`, `apps/api/migrations/Version20261015000000.php`, `docs/02-ARCHITECTURE.md`, `docs/04-API.md`.
