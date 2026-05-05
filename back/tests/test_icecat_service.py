"""
Unit tests for app.services.icecat_service.

Tests:
  - parse_icecat_url: multiple URL formats
  - map_to_internal: correct field mapping
  - MockIcecatProvider: known + unknown product IDs
  - import/preview endpoint: happy path + invalid URL
  - import/confirm endpoint: create + duplicate SKU + update_existing
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from app.services.icecat_service import (
    ParsedIcecatRef,
    MockIcecatProvider,
    map_to_internal,
    parse_icecat_url,
    _normalise_category,
)


# ─── parse_icecat_url ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("url,expected_id", [
    ("https://icecat.biz/p/hpe-proliant-dl380-gen10-83791490.html",  "83791490"),
    ("https://icecat.us/p/cisco-catalyst-c9300-48p-e-61034977.html", "61034977"),
    ("https://icecat.biz/api/products/12345",                        "12345"),
    ("https://icecat.biz/product/search/99999",                      "99999"),
    ("83791490",                                                      "83791490"),
])
def test_parse_icecat_url_valid(url, expected_id):
    ref = parse_icecat_url(url)
    assert isinstance(ref, ParsedIcecatRef)
    assert ref.product_id == expected_id
    assert ref.source_url  # non-empty


def test_parse_icecat_url_invalid():
    with pytest.raises(ValueError, match="No se pudo extraer"):
        parse_icecat_url("https://example.com/no-id-here")


def test_parse_icecat_url_strips_whitespace():
    ref = parse_icecat_url("  83791490  ")
    assert ref.product_id == "83791490"


# ─── _normalise_category ──────────────────────────────────────────────────────

@pytest.mark.parametrize("input_cat,expected", [
    ("Servers",         "servers"),
    ("Rack Servers",    "servers"),
    ("Network Switches","networking"),
    ("NAS",             "storage"),
    ("Workstations",    "workstations"),
    ("Unknown Thing",   "servers"),  # fallback
])
def test_normalise_category(input_cat, expected):
    assert _normalise_category(input_cat) == expected


# ─── MockIcecatProvider ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mock_provider_known_product():
    provider = MockIcecatProvider()
    raw = await provider.fetch("83791490")
    assert raw is not None
    assert raw.product_id == "83791490"
    assert "HPE" in raw.brand
    assert raw.specs  # has at least one spec


@pytest.mark.asyncio
async def test_mock_provider_unknown_product_returns_default():
    provider = MockIcecatProvider()
    raw = await provider.fetch("0")
    assert raw is not None
    assert raw.product_id == "0"


# ─── map_to_internal ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_map_to_internal_fields():
    provider = MockIcecatProvider()
    raw = await provider.fetch("83791490")
    mapped = map_to_internal(raw, "https://icecat.biz/p/test.html")

    assert mapped.name            == raw.title
    assert mapped.brand           == raw.brand
    assert mapped.category        in {"servers","storage","networking","workstations","accessories"}
    assert mapped.source_product_id == "83791490"
    assert mapped.source_url      == "https://icecat.biz/p/test.html"
    assert isinstance(mapped.technical_specs, dict)
    assert mapped.sku.startswith("HPE")      # suggestion from brand


@pytest.mark.asyncio
async def test_map_to_internal_description_fallback():
    """If long_desc is empty, falls back to short_desc."""
    provider = MockIcecatProvider()
    raw = await provider.fetch("83791490")
    raw.long_desc = ""
    mapped = map_to_internal(raw, "https://icecat.biz/p/test.html")
    assert mapped.description  # still has something


# ─── Import endpoints (integration) ──────────────────────────────────────────

def test_import_preview_valid_url(client, admin_token):
    resp = client.post(
        "/api/admin/products/import/preview",
        data={"icecat_url": "83791490", "remove_bg": "false"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["icecat_product_id"] == "83791490"
    assert body["name"]
    assert body["brand"]
    assert isinstance(body["technical_specs"], dict)
    assert body["base_price"] == 0.0  # admin must set it


def test_import_preview_invalid_url(client, admin_token):
    resp = client.post(
        "/api/admin/products/import/preview",
        data={"icecat_url": "https://example.com/no-id"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "No se pudo extraer" in resp.json()["detail"]


def test_import_preview_requires_admin(client, user_token):
    resp = client.post(
        "/api/admin/products/import/preview",
        data={"icecat_url": "83791490"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


def test_import_confirm_creates_product(client, admin_token):
    payload = {
        "icecat_product_id": "83791490",
        "source_url":        "https://icecat.biz/p/test-83791490.html",
        "sku":               "TEST-IC83791490",
        "name":              "HPE ProLiant DL380 Gen10 Plus",
        "brand":             "HPE",
        "category":          "servers",
        "description":       "Test description",
        "technical_specs":   {"CPU": "Xeon Silver"},
        "base_price":        5200.0,
        "stock_status":      "available",
    }
    resp = client.post(
        "/api/admin/products/import/confirm",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["action"] == "created"
    assert body["sku"]    == "TEST-IC83791490"


def test_import_confirm_duplicate_sku_rejected(client, admin_token, server_product):
    payload = {
        "icecat_product_id": "83791490",
        "source_url":        "https://icecat.biz/p/test.html",
        "sku":               server_product.sku,   # already exists
        "name":              "Duplicate",
        "brand":             "HPE",
        "category":          "servers",
        "base_price":        5200.0,
        "stock_status":      "available",
    }
    resp = client.post(
        "/api/admin/products/import/confirm",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 409
    body = resp.json()
    assert "ya existe" in body["detail"]["message"]
    assert "existing_id" in body["detail"]


def test_import_confirm_update_existing(client, admin_token, server_product):
    payload = {
        "icecat_product_id": "83791490",
        "source_url":        "https://icecat.biz/p/test.html",
        "sku":               server_product.sku,
        "name":              "Updated Name",
        "brand":             "HPE",
        "category":          "servers",
        "base_price":        6000.0,
        "stock_status":      "available",
        "update_existing":   True,
    }
    resp = client.post(
        "/api/admin/products/import/confirm",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["action"] == "updated"
    assert body["id"] == server_product.id
