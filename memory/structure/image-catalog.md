# Curated product image catalog

- `data/product-images.json` contains one record for each of the 85 products accepted by the supplied `data/products.csv` seed. Its top-level keys are normalized uppercase SKUs. Each record contains exactly `image_url`, `image_source_url`, `image_attribution`, `image_license`, and `image_license_url`.
- `image_url` points to a direct HTTPS Wikimedia thumbnail. `image_source_url` points to its Commons file page. The creator credit is plain text; the license and HTTPS license URL are recorded from Commons file metadata. No image files are checked in.
- The catalog is static and curated. The image-enrichment command and API/UI wiring are tracked separately in the backend and frontend structure records once implemented. New products without a catalog entry have no curated image.
- Exact product variants were not available for every SKU. The test-fixture names on `XS-001`, `SQL-001`, `CI-001`, and `QI-001` use representative images based on their category or description. Those images are illustrative and should not imply a brand or exact item.

See [`../../docs/02-ARCHITECTURE.md`](../../docs/02-ARCHITECTURE.md), [`../../docs/04-API.md`](../../docs/04-API.md), and [`../decisions/remote-product-images.md`](../decisions/remote-product-images.md) for the contract and decision.
