"""
Icecat Open Product Data enrichment utility.

Open Icecat is free — register at https://icecat.biz to get your shopname/username.
Set ICECAT_USERNAME in back/.env to enable enrichment.

Usage (admin endpoint or CLI):
    from app.utils.icecat import enrich_product
    specs = await enrich_product(ean="0190198842213")   # HPE DL380 Gen10 EAN
"""

import os
import json
import httpx
from typing import Optional

ICECAT_USERNAME = os.getenv("ICECAT_USERNAME", "")

# EAN codes for seeded products — add more as needed
PRODUCT_EANS = {
    "HPE-P28948-B21":    "0190017381855",
    "HPE-P26359-B21":    "0190017247297",
    "CISCO-C9300-48P-E": "0882658743375",
    "DELL-R750XA-8GPU":  "0884116411413",
    "NETAPP-AFF-A250":   "",  # NetApp not in open catalog
}


async def fetch_icecat_product(ean: str, lang: str = "en") -> Optional[dict]:
    """Fetch product data from Open Icecat by EAN. Returns parsed dict or None."""
    if not ICECAT_USERNAME:
        raise ValueError("ICECAT_USERNAME not set in .env")
    if not ean:
        return None

    url = (
        f"https://icecat.us/index.cgi"
        f"?shopname={ICECAT_USERNAME}&ean_upc={ean}&lang={lang}&output=productxml&limit=1"
    )

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, auth=(ICECAT_USERNAME, ""))
        if resp.status_code != 200:
            return None

    try:
        import xml.etree.ElementTree as ET
        root = ET.fromstring(resp.text)
        product_el = root.find(".//Product")
        if product_el is None:
            return None

        specs = {}
        for feat in root.findall(".//ProductFeature"):
            name_el  = feat.find("Feature/Name/Value")
            value_el = feat.find("LocalValue/Value")
            if name_el is not None and value_el is not None:
                specs[name_el.text.strip()] = value_el.text.strip()

        return {
            "name":        product_el.get("Title", ""),
            "description": product_el.get("LongDesc", product_el.get("ShortDesc", "")),
            "brand":       product_el.get("BrandName", ""),
            "image_url":   product_el.get("HighPic", ""),
            "specs":       specs,
        }
    except Exception:
        return None


def enrich_product_sync(ean: str) -> Optional[dict]:
    """Synchronous wrapper — for use in scripts/migrations."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(fetch_icecat_product(ean))
    except RuntimeError:
        return asyncio.run(fetch_icecat_product(ean))
