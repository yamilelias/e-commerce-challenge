#!/usr/bin/env python3
"""Disposable admin CRUD and CSV smoke through the browser-facing proxy."""

import argparse
import http.cookiejar
import json
import sys
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import HTTPCookieProcessor, Request, build_opener


class SmokeFailure(Exception):
    pass


def expect(condition, message):
    if not condition:
        raise SmokeFailure(message)


class Client:
    def __init__(self, origin):
        self.origin = origin.rstrip("/")
        self.opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(self, method, path, body=None, headers=None):
        request = Request(self.origin + path, data=body, method=method,
                          headers={"Accept": "application/json", **(headers or {})})
        try:
            response = self.opener.open(request, timeout=15)
        except HTTPError as error:
            response = error
        except URLError as error:
            raise SmokeFailure("HTTP connection failed: " + str(error.reason)) from error
        with response:
            status = response.status
            location = response.headers.get("Location")
            raw = response.read()
        if status == 204:
            expect(raw == b"", "204 response has a body")
            return status, None, location
        try:
            payload = json.loads(raw)
        except (ValueError, UnicodeDecodeError) as error:
            raise SmokeFailure("response is not JSON") from error
        expect(isinstance(payload, dict), "response root is not an object")
        return status, payload, location

    def json(self, method, path, body, csrf=None, extra_headers=None):
        headers = {"Content-Type": "application/json", **(extra_headers or {})}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        return self.request(method, path, json.dumps(body).encode("utf-8"), headers)


def error_is(result, status, code):
    actual, payload, _ = result
    expect(actual == status, f"expected HTTP {status}, got {actual}")
    error = payload.get("error") if payload else None
    expect(isinstance(error, dict) and error.get("code") == code, f"expected {code} error")
    expect(isinstance(error.get("message"), str) and isinstance(error.get("fields"), dict), "invalid error envelope")


def upload_csv(client, path, csrf):
    boundary = "qa" + uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"products.csv\"\r\n"
            "Content-Type: text/csv\r\n\r\n").encode() + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    status, payload, _ = client.request("POST", "/api/v1/products/import", body, {
        "Content-Type": f"multipart/form-data; boundary={boundary}", "X-CSRF-Token": csrf,
    })
    expect(status == 200, f"CSV import returned HTTP {status}")
    result = payload.get("data")
    expect(isinstance(result, dict), "missing import data")
    for key in ("total_rows", "inserted", "skipped", "rejected"):
        expect(isinstance(result.get(key), int) and result[key] >= 0, f"invalid import {key}")
    expect(result["total_rows"] == result["inserted"] + result["skipped"] + result["rejected"], "CSV accounting invariant failed")
    expect(isinstance(result.get("issues"), list) and isinstance(result.get("truncated"), bool), "invalid import issues")
    return result


def run(args):
    password = Path(args.password_file).read_text(encoding="utf-8").rstrip("\r\n")
    expect(bool(password), "password file is empty")
    client = Client(args.base_url)
    product_id = None
    csrf = None
    passed = 0

    def check(label, condition, message):
        nonlocal passed
        expect(condition, message)
        print("PASS " + label)
        passed += 1

    try:
        error_is(client.request("GET", "/api/v1/admin/products"), 401, "UNAUTHENTICATED")
        check("anonymous admin read denied", True, "")
        error_is(client.json("POST", "/api/v1/products", {}), 401, "UNAUTHENTICATED")
        check("anonymous mutation denied", True, "")

        status, payload, _ = client.request("GET", "/api/v1/admin/session")
        session = payload.get("data")
        expect(status == 200 and isinstance(session, dict) and session.get("authenticated") is False,
               "anonymous session bootstrap failed")
        bootstrap_csrf = session.get("csrf_token")
        expect(isinstance(bootstrap_csrf, str) and len(bootstrap_csrf) >= 32, "missing CSRF token")
        check("session bootstrap", True, "")

        login = {"username": args.username, "password": password}
        error_is(client.json("POST", "/api/v1/admin/login", login), 403, "CSRF_INVALID")
        check("login CSRF required", True, "")

        status, payload, _ = client.json("POST", "/api/v1/admin/login", login, bootstrap_csrf)
        session = payload.get("data")
        expect(status == 200 and isinstance(session, dict) and session.get("authenticated") is True,
               "admin login failed")
        csrf = session.get("csrf_token")
        expect(isinstance(csrf, str) and csrf != bootstrap_csrf, "CSRF was not rotated on login")
        check("admin login and token rotation", True, "")

        error_is(client.json("POST", "/api/v1/products", {}, csrf,
                             {"Origin": "https://invalid.example"}), 403, "FORBIDDEN")
        check("wrong Origin denied", True, "")

        status, payload, _ = client.request("GET", "/api/v1/admin/products?per_page=1")
        check("authenticated admin list", status == 200 and isinstance(payload.get("data"), list), "admin list failed")

        sku = "QA-" + uuid.uuid4().hex[:12].upper()
        product = {"name": "QA Disposable Product", "sku": sku, "description": "QA fixture",
                   "category": "QA Disposable", "price": "12.34", "stock": 4, "weight_kg": "0.250"}
        status, payload, location = client.json("POST", "/api/v1/products", product, csrf)
        created = payload.get("data")
        expect(status == 201 and isinstance(created, dict) and isinstance(created.get("id"), int),
               "product create failed")
        product_id = created["id"]
        check("create and Location", location == f"/api/v1/products/{product_id}" and created.get("sku") == sku
              and created.get("price_cents") == 1234, "create response contract failed")

        error_is(client.json("POST", "/api/v1/products", product, csrf), 409, "SKU_CONFLICT")
        check("duplicate SKU denied", True, "")
        error_is(client.json("PATCH", f"/api/v1/products/{product_id}", {"stock": -1}, csrf), 422, "VALIDATION_ERROR")
        check("invalid stock denied", True, "")
        error_is(client.json("PATCH", f"/api/v1/products/{product_id}", {"price": "0"}, csrf), 422, "VALIDATION_ERROR")
        check("invalid price denied", True, "")
        error_is(client.json("PATCH", f"/api/v1/products/{product_id}", {"name": " "}, csrf), 422, "VALIDATION_ERROR")
        check("blank name denied", True, "")
        error_is(client.json("PATCH", f"/api/v1/products/{product_id}", {"weight_kg": "-1"}, csrf), 422, "VALIDATION_ERROR")
        check("invalid weight denied", True, "")

        status, payload, _ = client.json("PATCH", f"/api/v1/products/{product_id}",
                                         {"name": "QA Edited Product", "price": "13.50", "stock": 2}, csrf)
        edited = payload.get("data")
        check("patch values", status == 200 and edited.get("price_cents") == 1350
              and edited.get("stock") == 2 and edited.get("name") == "QA Edited Product", "patch failed")

        status, payload, _ = client.request("GET", "/api/v1/products?q=" + quote(sku.lower()))
        check("public SKU search", status == 200 and any(row.get("id") == product_id for row in payload.get("data", [])),
              "created product missing from public search")

        first = upload_csv(client, Path(args.csv), csrf)
        second = upload_csv(client, Path(args.csv), csrf)
        check("CSV import and repeat", first["total_rows"] > 0 and second["inserted"] == 0,
              "repeat CSV import inserted products")
        print("CSV counts: first inserted={inserted}, skipped={skipped}, rejected={rejected}; repeat inserted={again}".format(
            inserted=first["inserted"], skipped=first["skipped"], rejected=first["rejected"], again=second["inserted"]))

        status, _, _ = client.request("DELETE", f"/api/v1/products/{product_id}", headers={"X-CSRF-Token": csrf})
        check("soft delete", status == 204, "delete failed")
        product_id = None
        error_is(client.request("GET", f"/api/v1/products/{created['id']}"), 404, "NOT_FOUND")
        check("deleted product hidden publicly", True, "")

        status, payload, _ = client.request("POST", "/api/v1/admin/logout", headers={"X-CSRF-Token": csrf})
        check("logout", status == 204 and payload is None, "logout failed")
        error_is(client.request("GET", "/api/v1/admin/products"), 401, "UNAUTHENTICATED")
        check("session invalidated", True, "")
        error_is(client.request("POST", "/api/v1/products/import"), 401, "UNAUTHENTICATED")
        check("anonymous import denied", True, "")
        print(f"Summary: {passed}/21 passed")
        return 0
    finally:
        if product_id is not None and csrf:
            try:
                client.request("DELETE", f"/api/v1/products/{product_id}", headers={"X-CSRF-Token": csrf})
            except (SmokeFailure, OSError):
                print("Cleanup could not confirm deletion of the disposable QA product.", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:3000", help="browser-facing origin")
    parser.add_argument("--username", required=True, help="private test admin username")
    parser.add_argument("--password-file", required=True, help="private test admin password file")
    parser.add_argument("--csv", default="data/products.csv", help="original CSV path")
    args = parser.parse_args()
    try:
        return run(args)
    except (SmokeFailure, OSError) as error:
        print("FAIL: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
