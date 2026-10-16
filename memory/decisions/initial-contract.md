# Initial contract freeze

- Date: 2026-10-15
- Status: Active
- Context: Four implementation roles need stable schema and HTTP shapes before parallel work.
- Decision: Approve `docs/02-ARCHITECTURE.md` schema and `docs/04-API.md` v1 exactly as written. The API contract resolves wire shape details where implementation guides are less precise.
- Reason: Prevent backend, frontend, infrastructure, and QA from implementing divergent purchase, import, authentication, or product flows.
- Alternatives considered: Let each worker resolve ambiguities during implementation; delay implementation for more specification. Both increase delivery risk for a weekend MVP.
- Consequences: Shared shapes are locked. Changes require orchestrator coordination and updates to consuming code/tests. Implementation has not yet begun.
- Affected contracts/files: `docs/02-ARCHITECTURE.md`, `docs/04-API.md`, `docs/decisions.md`, `docs/task-board.md`.
