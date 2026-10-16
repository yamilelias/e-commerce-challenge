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
- [`structure/frontend.md`](structure/frontend.md): Next.js routes, proxy, UI components, and verification state.
- [`decisions/frontend-foundation.md`](decisions/frontend-foundation.md): catalog and same-origin proxy choices.
- [`structure/qa.md`](structure/qa.md): acceptance matrix and smoke check locations.
- [`decisions/product-storage.md`](decisions/product-storage.md): normalized product validation and catalog storage decisions.
- [`decisions/frontend-checkout.md`](decisions/frontend-checkout.md): cart, checkout retry, and receipt handling.
- [`decisions/admin-session.md`](decisions/admin-session.md): backend session, CSRF, and origin protection.
- [`decisions/frontend-admin.md`](decisions/frontend-admin.md): browser admin session and catalog management UI.
- [`decisions/csv-import.md`](decisions/csv-import.md): create-only CSV import and seed behavior.
- [`decisions/atomic-checkout.md`](decisions/atomic-checkout.md): stock transaction, idempotency, and receipt capability.
- [`decisions/remote-product-images.md`](decisions/remote-product-images.md): curated Commons URLs, attribution, migration, and idempotent image enrichment.
- [`structure/image-catalog.md`](structure/image-catalog.md): checked-in SKU image metadata and its relationship to the seed fixture.
- [`decisions/homepage-redesign.md`](decisions/homepage-redesign.md): frozen section, data, and motion choices for the homepage redesign.
- [`structure/redesign-navigation.md`](structure/redesign-navigation.md): shared storefront header and mobile navigation behavior.
- [`structure/redesign-hero.md`](structure/redesign-hero.md): editorial homepage hero and its responsive media composition.
- [`structure/redesign-sections.md`](structure/redesign-sections.md): homepage category/product data loader and content sections.
- [`structure/redesign-motion.md`](structure/redesign-motion.md): shared reveal observer and reduced-motion behavior.

Add an entry here when creating a new memory record. Update memory in the same commit as the implementation or contract change it describes.
