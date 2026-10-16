#!/usr/bin/env python3
"""One disposable fake-purchase, replay, stock and receipt smoke."""

import argparse
import sys
import uuid
from urllib.parse import quote

from admin_api import Client, SmokeFailure, error_is, expect


def run(origin):
    client = Client(origin)
    status, listing, _ = client.request("GET", "/api/v1/products?per_page=100")
    expect(status == 200 and isinstance(listing.get("data"), list), "catalog unavailable")
    eligible = [product for product in listing["data"] if isinstance(product.get("stock"), int)
                and 2 <= product["stock"] < 999 and isinstance(product.get("price_cents"), int)]
    expect(bool(eligible), "no suitable in-stock test product")
    product = eligible[0]
    product_id = product["id"]
    initial_stock = product["stock"]
    body = {"buyer_name": "QA Shopper", "buyer_email": "qa-shopper@example.invalid",
            "items": [{"product_id": product_id, "quantity": 1}]}
    key = str(uuid.uuid4())

    status, payload, _ = client.json("POST", "/api/v1/orders", body,
                                     extra_headers={"Idempotency-Key": key})
    order = payload.get("data")
    expect(status == 201 and isinstance(order, dict) and order.get("status") == "paid", "first checkout did not create paid order")
    reference = order.get("reference")
    token = order.get("receipt_token")
    expect(isinstance(reference, str) and isinstance(token, str) and len(token) == 64, "missing receipt capability")
    expect(order.get("total_cents") == product["price_cents"], "server total is incorrect")
    lines = order.get("items")
    expect(isinstance(lines, list) and len(lines) == 1 and lines[0].get("unit_price_cents") == product["price_cents"]
           and lines[0].get("line_total_cents") == product["price_cents"], "purchase snapshot is incorrect")
    print("PASS paid order and server price snapshot")

    status, detail, _ = client.request("GET", f"/api/v1/products/{product_id}")
    expect(status == 200 and detail.get("data", {}).get("stock") == initial_stock - 1, "stock did not decrease once")
    print("PASS stock decreases once")

    status, replay, _ = client.json("POST", "/api/v1/orders", body,
                                    extra_headers={"Idempotency-Key": key})
    expect(status == 200 and replay.get("data", {}).get("reference") == reference
           and replay.get("data", {}).get("receipt_token") == token, "replay did not return same receipt")
    status, detail, _ = client.request("GET", f"/api/v1/products/{product_id}")
    expect(status == 200 and detail.get("data", {}).get("stock") == initial_stock - 1, "replay changed stock")
    print("PASS identical replay without extra stock deduction")

    changed = {**body, "buyer_name": "QA Different Shopper"}
    error_is(client.json("POST", "/api/v1/orders", changed,
                         extra_headers={"Idempotency-Key": key}), 409, "IDEMPOTENCY_CONFLICT")
    print("PASS changed-body idempotency conflict")

    too_many = {**body, "items": [{"product_id": product_id, "quantity": initial_stock}]}
    error_is(client.json("POST", "/api/v1/orders", too_many,
                         extra_headers={"Idempotency-Key": str(uuid.uuid4())}), 409, "INSUFFICIENT_STOCK")
    status, detail, _ = client.request("GET", f"/api/v1/products/{product_id}")
    expect(status == 200 and detail.get("data", {}).get("stock") == initial_stock - 1, "failed checkout changed stock")
    print("PASS insufficient stock rolls back")

    receipt_path = "/api/v1/orders/" + quote(reference)
    error_is(client.request("GET", receipt_path), 400, "BAD_QUERY")
    wrong = "0" * 64 if token != "0" * 64 else "1" * 64
    error_is(client.request("GET", receipt_path + "?token=" + wrong), 404, "NOT_FOUND")
    status, receipt, _ = client.request("GET", receipt_path + "?token=" + quote(token))
    expect(status == 200 and receipt.get("data", {}).get("reference") == reference
           and "receipt_token" not in receipt.get("data", {}), "receipt lookup leaked or failed")
    print("PASS receipt capability enforcement")
    print("Summary: 6/6 passed")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:3000", help="browser-facing origin")
    args = parser.parse_args()
    try:
        return run(args.base_url)
    except (SmokeFailure, OSError) as error:
        print("FAIL: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
