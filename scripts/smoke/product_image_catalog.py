#!/usr/bin/env python3
"""Check checked-in product image coverage without fetching remote media."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[2]
FIELDS = (
    "image_url",
    "image_source_url",
    "image_attribution",
    "image_license",
    "image_license_url",
)


def check_url(value: str, host: str | None = None) -> bool:
    parts = urlsplit(value)
    return parts.scheme == "https" and bool(parts.path) and bool(parts.netloc) and (
        host is None or parts.hostname == host
    ) and parts.username is None and parts.password is None


def main() -> None:
    with (ROOT / "data/products.csv").open(newline="", encoding="utf-8-sig") as file:
        csv_skus = {row["sku"].strip().upper() for row in csv.DictReader(file)}
    catalog = json.loads((ROOT / "data/product-images.json").read_text(encoding="utf-8"))
    assert isinstance(catalog, dict) and len(catalog) == 85, "Expected all 85 seeded products"
    assert set(catalog) <= csv_skus, "Catalog contains a SKU absent from the seed CSV"

    for sku, entry in catalog.items():
        assert isinstance(entry, dict), f"{sku}: expected an object"
        assert set(entry) == set(FIELDS) | {"alternate_images"}, f"{sku}: unexpected fields"
        alternates = entry["alternate_images"]
        assert isinstance(alternates, list) and len(alternates) == 2, f"{sku}: exactly two alternates required"
        photos = [entry, *alternates]
        urls = []
        for position, photo in enumerate(photos):
            assert isinstance(photo, dict), f"{sku} image {position}: expected an object"
            expected_fields = set(FIELDS) | ({"alternate_images"} if position == 0 else set())
            assert set(photo) == expected_fields, f"{sku} image {position}: unexpected metadata fields"
            assert all(isinstance(photo[field], str) and photo[field].strip() for field in FIELDS), (
                f"{sku} image {position}: blank metadata"
            )
            assert check_url(photo["image_url"]) and urlsplit(photo["image_url"]).hostname in {
                "upload.wikimedia.org", "thumb.wikimedia.org"
            }, (
                f"{sku} image {position}: image must be a direct Wikimedia URL"
            )
            assert check_url(photo["image_source_url"], "commons.wikimedia.org"), (
                f"{sku} image {position}: source must be a Commons file page"
            )
            assert check_url(photo["image_license_url"]), f"{sku} image {position}: invalid license URL"
            urls.append(photo["image_url"])
        assert len(urls) == len(set(urls)), f"{sku}: duplicate image URLs"

    print(f"PASS: {len(catalog)} SKUs; at least {sum(len(x['alternate_images']) for x in catalog.values())} distinct-per-product alternates")


if __name__ == "__main__":
    main()
