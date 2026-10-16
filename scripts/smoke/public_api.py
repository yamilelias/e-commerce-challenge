#!/usr/bin/env python3
"""Read-only smoke checks through the browser-facing /api/v1 proxy."""

import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


class SmokeFailure(Exception):
    pass


def expect(condition, message):
    if not condition:
        raise SmokeFailure(message)


def get_json(base_url, path):
    request = Request(urljoin(base_url.rstrip("/") + "/", path.lstrip("/")))
    request.add_header("Accept", "application/json")
    try:
        response = urlopen(request, timeout=10)
    except HTTPError as error:
        response = error
    except URLError as error:
        raise SmokeFailure("HTTP connection failed: " + str(error.reason)) from error
    with response:
        status = response.status
        content_type = response.headers.get("Content-Type", "")
        expect("application/json" in content_type, "expected JSON response")
        try:
            payload = json.load(response)
        except (ValueError, UnicodeDecodeError) as error:
            raise SmokeFailure("response is not valid JSON") from error
    expect(isinstance(payload, dict), "response root is not an object")
    return status, payload


def check_error(status, payload, expected_status, code):
    expect(status == expected_status, f"expected HTTP {expected_status}, got {status}")
    error = payload.get("error")
    expect(isinstance(error, dict), "missing error envelope")
    expect(error.get("code") == code, f"expected error.code={code}")
    expect(isinstance(error.get("message"), str), "missing error.message")
    expect(isinstance(error.get("fields"), dict), "missing error.fields object")


def check_health(base_url):
    status, body = get_json(base_url, "/api/v1/health")
    expect(status == 200, f"health returned HTTP {status}")
    expect(body.get("data") == {"status": "ok", "database": "ok"}, "health data differs from contract")


def check_catalog(base_url):
    status, body = get_json(base_url, "/api/v1/products?page=1&per_page=1")
    expect(status == 200, f"products returned HTTP {status}")
    expect(isinstance(body.get("data"), list), "products data is not an array")
    page = body.get("pagination")
    expect(isinstance(page, dict), "missing pagination")
    expect(page.get("page") == 1 and page.get("per_page") == 1, "pagination request was not honored")
    expect(all(isinstance(page.get(key), int) and page[key] >= 0 for key in ("total", "pages")), "invalid pagination totals")
    expect(len(body["data"]) <= 1, "per_page limit was not honored")
    if body["data"]:
        product = body["data"][0]
        expect(isinstance(product.get("id"), int) and product["id"] > 0, "invalid product ID")
        expect(isinstance(product.get("price_cents"), int) and product["price_cents"] > 0, "invalid product price_cents")
        expect(product.get("is_active") is True, "inactive product visible publicly")
        expect(isinstance(product.get("category"), dict), "missing product category")
        detail_status, detail = get_json(base_url, "/api/v1/products/" + str(product["id"]))
        expect(detail_status == 200 and detail.get("data", {}).get("id") == product["id"], "product detail mismatch")


def check_categories(base_url):
    status, body = get_json(base_url, "/api/v1/categories")
    expect(status == 200 and isinstance(body.get("data"), list), "invalid categories response")
    for category in body["data"]:
        expect(isinstance(category, dict) and all(key in category for key in ("id", "name", "slug")), "invalid category shape")


def check_rejections(base_url):
    status, body = get_json(base_url, "/api/v1/products?sort=unknown_sort")
    check_error(status, body, 400, "BAD_QUERY")
    status, body = get_json(base_url, "/api/v1/admin/products")
    check_error(status, body, 401, "UNAUTHENTICATED")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:3000", help="browser-facing origin (default: http://localhost:3000)")
    args = parser.parse_args()
    checks = (
        ("health", check_health),
        ("catalog", check_catalog),
        ("categories", check_categories),
        ("query and anonymous admin rejection", check_rejections),
    )
    passed = 0
    for label, check in checks:
        try:
            check(args.base_url)
        except (SmokeFailure, TimeoutError, OSError) as error:
            print(f"FAIL {label}: {error}", file=sys.stderr)
            print(f"Summary: {passed}/{len(checks)} passed", file=sys.stderr)
            return 1
        print(f"PASS {label}")
        passed += 1
    print(f"Summary: {passed}/{len(checks)} passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
