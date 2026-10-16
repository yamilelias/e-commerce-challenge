# Repository agent instructions

Read `docs/00-ORCHESTRATOR.md` before project implementation. Follow its contracts, ownership rules, and verification gates together with the instructions below.

## Project memory

Keep durable project knowledge in `memory/` so a future agent can resume work without reconstructing decisions from chat history. Read the relevant memory files before changing a feature, and update them in the same commit as the change they describe.

- `memory/structure/`: Record the implemented system map. For each feature, list routes or endpoints, names of important components/classes/commands, their exact repository paths, and how they connect. Update entries when files, APIs, or the schema change. Describe only what exists in code; mark unfinished work explicitly.
- `memory/decisions/`: Record consequential choices and revisions. Each decision should state its date, context, chosen approach, reason, alternatives considered, consequences, and affected files/contracts. If a decision changes, amend or supersede its record and update the matching structure entry.
- `memory/README.md`: Maintain a short index of memory records and explain how to find them. Add other memory areas only when a recurring type of vital information needs one.

Keep memory concise and factual. Link to detailed specifications in `docs/` instead of copying them. Never put secrets, credentials, or personal data in memory. When a public API or shared data shape changes, update the authoritative specification, dependent code/tests, and memory together, following the orchestrator's approval and coordination rules.

## Commits and handoffs

Commit every code change, including changes made by subagents. Commit related memory updates with the code they document. Use a descriptive commit subject that states the change, with a task ID when one has been assigned (for example, `BE-03: Add validated product CRUD endpoints`). Keep commits scoped; never include unrelated or pre-existing user files. Each subagent must report its commit hash, changed paths, and actual verification results in its handoff. Do not claim a change is complete until its required commit exists.
