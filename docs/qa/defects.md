# Defect and integration blocker log

These findings began with static review of the committed foundation at `940c5df` on 2026-10-15 (America/Chihuahua). Later retests are identified per entry. Runtime behavior remains **NOT VERIFIED** except where an exact command/result is recorded. Owners should retest against the current integrated commit.

## QA-001 — Docker build references absent Composer lockfile

- Severity: **P0**; status: **VERIFIED** for the image-build defect at BE-02b `f58e45c`; owner: Backend; related: AC-01, AC-21, Gate B.
- Reproduce: `test -f apps/api/composer.lock` exits 1, while `apps/api/Dockerfile` contains `COPY apps/api/composer.json apps/api/composer.lock ./` in dependency and test stages.
- Expected: The lockfile exists in the build context, allowing deterministic Composer installation.
- Original static observation: The referenced source path was absent. Docker must resolve `COPY` before running Composer, so the API image could not build from that checkout.
- Retest evidence: BE-02b committed `apps/api/composer.lock`. Orchestrator ran `docker compose --env-file .env.example build api` from the repository root with escalated Docker access; exit 0 and final output `e-commerce-challenge-api Built`. API startup and health remain separate pending checks.

## QA-002 — API startup invokes an unavailable seed command

- Severity: **P0**; status: **OPEN**; owner: Backend (command), DevOps (startup integration); related: AC-01–03, C-02, Gate B.
- Reproduce: `rg -n 'app:products:seed' infra/docker/api/start.sh` finds the startup invocation; `rg -n 'AsCommand|app:products:seed' apps/api/src` finds no command declaration in the committed foundation.
- Expected: The same importer exposed by a registered `app:products:seed` command runs successfully after migrations, including row-level rejects.
- Actual static observation: `start.sh` has `set -eu` and invokes the command before FrankenPHP. An unknown command will stop the API container; this is a pending BE-02/INF-01 dependency.
- Retest: With image built, run the seed command in an isolated API container and `docker compose up --build -d`; record command exits, seed report, and proxied health.

## QA-003 — Proxy drops product creation Location header

- Severity: **P1** contract discrepancy; status: **READY_FOR_RETEST** after FE-02a `2cfc2d4`; owner: Frontend; related: C-06, AC-04.
- Original reproduction: In FE-01 `7923f45`, inspect `apps/web/src/app/api/v1/[...path]/route.ts`: the response-header allowlist omitted `location`. The frozen `docs/04-API.md` Section 6.3 requires `Location: /api/v1/products/{id}` on `POST /products` success.
- Expected: Browser-facing proxy returns the backend's `Location` value with the 201 response.
- Original static observation: `forward()` created a new `Headers` object and copied only the listed headers plus `Set-Cookie`, discarding `Location`. FE-02a now copies a `Location` matching `/api/v1/products/{positive-id}`; this is a **static fix only**, with no HTTP evidence yet.
- Retest: After authenticated create, inspect proxied 201 response headers and verify the documented path. Avoid logging credentials or CSRF values.

## QA-004 — SQLite search Unicode casefold limitation

- Severity: **P1** known limitation; status: **DEFERRED** by Orchestrator under `docs/03-BACKEND.md` Section 8; owner: Backend (implementation scope), QA (documentation); related: AC-09, C-03.
- Reproduce: `ProductService::list()` uses `LOWER(p.name) LIKE :q` and lowercases the search term with `mb_strtolower()`. In a local SQLite check, `SELECT lower('Élan') LIKE '%élan%'` returns `0`, while `SELECT lower('Steel Bottle') LIKE '%steel%'` returns `1`.
- Expected: A valid product named `Élan` is returned when searching for `élan`, under the frozen case-insensitive name-search rule.
- Actual static/local SQLite observation: SQLite's built-in `LOWER()` does not fold the accented capital letter. The product input accepts Unicode names, so this query excludes a valid matching product.
- Acceptance scope: AC-09 uses supported ASCII mixed-case names/SKUs from the supplied CSV. Document this SQLite limitation in README. Unicode casefold is outside the weekend MVP; no P0 release block from this observation alone.
