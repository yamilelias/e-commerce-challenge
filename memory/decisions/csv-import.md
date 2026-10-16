# Synchronous CSV import and seed

- Date: 2026-10-16
- Status: Active
- Context: The same dirty source CSV must support an administrator upload and repeatable container startup seeding under the frozen create-only import contract.
- Decision: Use one `CsvProductImporter` for HTTP and CLI. Read and preflight UTF-8/quote syntax and exact headers before any write; parse with PHP `fgetcsv` using no proprietary escape character. Normalize every row through `ProductInput`, create each valid row through `ProductService`'s transaction, and report logical data-record positions with at most 200 issues.
- Reason: Shared validation prevents seed/upload drift; preflight keeps whole-file failures atomic before row commits, while per-row transactions preserve earlier valid inserts when later data rows are invalid.
- Alternatives considered: Separate CLI and HTTP parsers, full-file transaction, upsert, asynchronous import. These conflict with create-only idempotency, partial success, or weekend scope.
- Consequences: A mid-process unexpected I/O/database error may leave earlier accepted rows committed; rerun skips those SKUs. An invalid UTF-8 or malformed quote file is rejected before writes. The API container can now run its migration-then-seed entrypoint.
- Affected files/contracts: `apps/api/src/Service/CsvProductImporter.php`, `apps/api/src/Controller/Api/V1/ImportController.php`, `apps/api/src/Command/SeedProductsCommand.php`, `docs/04-API.md`.
