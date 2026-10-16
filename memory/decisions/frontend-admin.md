# Browser admin session and CSV flow

- Date: 2026-10-16
- Status: Active
- Context: The frozen API uses a Symfony cookie session and a session-bound CSRF token for login and every admin mutation; CSV import must preserve its multipart boundary.
- Decision: Keep admin session and CSRF only in React memory, bootstrap with `GET /admin/session`, replace the token from login response, and send it on mutation requests. On 401, clear UI session and navigate to login; on `403 CSRF_INVALID`, refresh the session and require manual retry. Submit import via browser FormData with only a `file` field and no explicit Content-Type. Admin product forms send the write DTO, not the product response DTO.
- Reason: The backend remains the authorization boundary. Avoiding browser storage for credentials/tokens and automatic mutation retries follows the session and CSRF contract; FormData lets the browser set the correct boundary.
- Alternatives considered: Browser-stored admin flag/token, frontend-only guard, manual multipart header, or automatic CSRF retry. These weaken the boundary or can duplicate mutations.
- Consequences: Reloading admin routes always checks the server session. API unavailability blocks admin pages with a retry state. CSV report and validation messages come from the backend unchanged.
- Affected files/contracts: `apps/web/src/app/admin/**`, `apps/web/src/features/admin/**`, `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/api/types.ts`; consumes `docs/04-API.md` unchanged.
