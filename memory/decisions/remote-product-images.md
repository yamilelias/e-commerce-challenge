# Remote product image catalog

- Date: 2026-10-16
- Status: Active
- Context: The supplied CSV has no image field, while the storefront now needs representative free-use photos for each valid seeded product without hosting image bytes.
- Decision: Curate a checked-in SKU-to-image metadata catalog from Wikimedia Commons. Add nullable image URL, source URL, creator credit, license name, and license URL columns through a new migration. After CSV seed, an idempotent command enriches matching products from the catalog without replacing an existing non-null image URL. Product reads expose the fields; the storefront loads the HTTPS thumbnails directly and shows credit and a fallback on failure.
- Reason: Static URLs keep image selection reproducible without a runtime search API, API key, or image bucket. Commons permits hotlinking and provides machine-readable free-license metadata; recording credit supports licenses that require attribution.
- Alternatives considered: Unsplash or Pexels API search needs credentials; dynamic query URLs are unstable; storing image bytes needs a bucket; adding URLs to the supplied CSV would alter the source fixture.
- Consequences: Browsers make requests to Commons and images may disappear or change. The URL catalog and credits must be reviewed when updated. New admin-created products without a curated catalog entry use the visual fallback. No image bytes enter Git, the app containers, or SQLite.
- Affected files/contracts: `docs/02-ARCHITECTURE.md`, `docs/04-API.md`, `data/product-images.json`, `apps/api/**`, `apps/web/**`, `infra/docker/api/start.sh`, `apps/api/Dockerfile`.

## Gallery revision (2026-10-16)

- Context: Catalog cards need another image on hover and detail pages need a gallery, including for existing seeded products.
- Decision: Keep the primary image and five flat Product response fields in `products` for compatibility. Store two ordered alternates in `product_images` with a unique `(product_id, position)` key. Add an `images` response array, primary first. The image import command accepts two alternates per SKU, validates before transaction, and fills only missing slots. Old five-field catalogs still import.
- Reason: Existing consumers and databases continue to work after additive migration, while rerunning enrichment preserves curated images.
- Alternatives considered: Replacing the primary columns with a unified table would require a data move and compatibility layer; embedding JSON in `products` would lose relational constraints.
- Consequences: Product reads make one batched alternate-image query per page. Rollback drops alternates but leaves primary image fields intact. Admin writes remain primary-image agnostic and cannot curate a gallery.
- Affected files/contracts: `apps/api/migrations/Version20261016010000.php`, `apps/api/src/Entity/ProductImage.php`, `apps/api/src/Service/ProductImageImporter.php`, `apps/api/src/Service/ProductService.php`, `docs/02-ARCHITECTURE.md`, `docs/04-API.md`, `data/product-images.json`.
