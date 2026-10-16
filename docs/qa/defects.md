# Defect and integration blocker log

These findings are from static review of the committed foundation at `940c5df` on 2026-10-15 (America/Chihuahua). Runtime effects are **NOT VERIFIED** because Docker daemon and local HTTP are unavailable. Owners should retest against the current integrated commit and close an entry only with actual command results.

## QA-001 — Docker build references absent Composer lockfile

- Severity: **P0**; status: **OPEN**; owner: Backend; related: AC-01, AC-21, Gate B.
- Reproduce: `test -f apps/api/composer.lock` exits 1, while `apps/api/Dockerfile` contains `COPY apps/api/composer.json apps/api/composer.lock ./` in dependency and test stages.
- Expected: The lockfile exists in the build context, allowing deterministic Composer installation.
- Actual static observation: The referenced source path is absent. Docker must resolve `COPY` before running Composer, so the API image cannot build from this checkout.
- Retest: Commit the lockfile, then run `docker compose build api` and record exit/status. Do not claim build PASS from source inspection.

## QA-002 — API startup invokes an unavailable seed command

- Severity: **P0**; status: **OPEN**; owner: Backend (command), DevOps (startup integration); related: AC-01–03, C-02, Gate B.
- Reproduce: `rg -n 'app:products:seed' infra/docker/api/start.sh` finds the startup invocation; `rg -n 'AsCommand|app:products:seed' apps/api/src` finds no command declaration in the committed foundation.
- Expected: The same importer exposed by a registered `app:products:seed` command runs successfully after migrations, including row-level rejects.
- Actual static observation: `start.sh` has `set -eu` and invokes the command before FrankenPHP. An unknown command will stop the API container; this is a pending BE-02/INF-01 dependency.
- Retest: With image built, run the seed command in an isolated API container and `docker compose up --build -d`; record command exits, seed report, and proxied health.

## QA-003 — Proxy drops product creation Location header

- Severity: **P1** contract discrepancy; status: **OPEN**; owner: Frontend; related: C-06, AC-04.
- Reproduce: `rg -n 'content-type|content-disposition|referrer-policy|Location' 'apps/web/src/app/api/v1/[...path]/route.ts'` shows a response-header allowlist without `location`. The frozen `docs/04-API.md` Section 6.3 requires `Location: /api/v1/products/{id}` on `POST /products` success.
- Expected: Browser-facing proxy returns the backend's `Location` value with the 201 response.
- Actual static observation: `forward()` creates a new `Headers` object and copies only the listed headers plus `Set-Cookie`, discarding `Location`.
- Retest: After authenticated create, inspect proxied 201 response headers and verify the documented path. Avoid logging credentials or CSRF values.
