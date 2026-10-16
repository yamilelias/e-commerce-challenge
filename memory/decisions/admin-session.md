# Admin session and CSRF policy

- Date: 2026-10-15
- Status: Active; browser proxy round trip pending verification
- Context: The frozen API requires administrator writes behind Symfony sessions, session-bound CSRF, and optional Origin validation without a user table.
- Decision: Store an authenticated username and random 32-byte CSRF token in Symfony's file-backed server session. Bootstrap the token from `GET /admin/session`; verify `X-CSRF-Token` and `PUBLIC_ORIGIN` for login and writes; rotate session ID/token on login and invalidate on logout. Read the administrator username and password hash only from server environment.
- Reason: This matches the same-origin proxy contract and keeps credential checks in the API. CSRF tokens alone never grant administrator access.
- Alternatives considered: Browser-only checks, a default password, JWT, and an admin user table. These weaken the boundary or add unnecessary scope.
- Consequences: The API container needs writable `/data/sessions`, stable `APP_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `PUBLIC_ORIGIN`, and `SESSION_COOKIE_SECURE`. Cookie forwarding through the Next.js proxy still needs an integration check.
- Affected files/contracts: `apps/api/src/Security/AdminSession.php`, `apps/api/src/Controller/Api/V1/AdminSessionController.php`, `apps/api/src/Controller/Api/V1/AdminProductController.php`, `apps/api/config/packages/framework.yaml`, `docs/04-API.md`.
