# Product storage and search implementation

- Date: 2026-10-15
- Status: Active, pending PHP runtime verification
- Context: BE-02 needs one normalization path for admin writes and CSV rows, plus predictable SQLite catalog queries under the frozen API contract.
- Decision: Normalize SKU to uppercase ASCII and accept letters, digits, dots, underscores and hyphens; collapse category whitespace and derive a Unicode lowercase slug by replacing non-letter/digit runs with hyphens. Use DBAL SQL for narrow catalog/create/update/soft-delete queries while keeping Doctrine entities as the schema mapping. Escape `!`, `%`, and `_` in bound SQLite `LIKE` search terms.
- Reason: The supplied CSV uses those SKU characters; Unicode category slugs avoid an unneeded ASCII category restriction. Direct SQL keeps filtering and transaction boundaries explicit without another repository layer.
- Alternatives considered: Search via ORM query builder, slugger dependency, or free-form SKU punctuation. Those add dependencies or make uniqueness and literal search harder to reason about for this small data set.
- Consequences: Full Unicode case-insensitive search is not claimed because SQLite `LOWER` is ASCII-oriented. Category names without letters/digits cannot form slugs and are rejected.
- Affected files/contracts: `apps/api/src/Service/ProductInput.php`, `apps/api/src/Service/ProductService.php`, `apps/api/src/Controller/Api/V1/CatalogController.php`, `docs/04-API.md`.
