# Project memory

This directory holds concise, durable facts needed to continue the e-commerce MVP work. The specifications in `docs/` remain the source of truth for requirements and contracts; memory records where implemented behavior lives and why consequential choices were made.

## Index

- [`structure/README.md`](structure/README.md): implemented routes, components, commands, schema, and file locations.
- [`decisions/README.md`](decisions/README.md): consequential choices and revisions.
- [`decisions/initial-contract.md`](decisions/initial-contract.md): initial schema and API freeze.
- [`decisions/infrastructure-runtime.md`](decisions/infrastructure-runtime.md): API and web container runtime and startup choice.
- [`structure/infrastructure.md`](structure/infrastructure.md): implemented Compose and Docker file map.
- [`structure/backend.md`](structure/backend.md): Symfony routes, entities, schema, and verification state.
- [`decisions/backend-foundation.md`](decisions/backend-foundation.md): backend scaffold and SQLite connection choices.

Add an entry here when creating a new memory record. Update memory in the same commit as the implementation or contract change it describes.
