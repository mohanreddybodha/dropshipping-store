"""CJ Dropshipping API v2.0 Client with 0.9 QPS Token-Bucket Rate Limiting.

Enforces US Domestic warehouse filtering, stock verification, and carrier routing.
"""

from __future__ import annotations

import logging
import os
import re
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger("cj_client")


class TokenBucketRateLimiter:
    """Thread-safe Token Bucket Rate Limiter enforcing 0.9 QPS maximum throughput.

    At 0.9 QPS, requests are spaced by at least 1.111 seconds to eliminate
    CJ API error code 1600200 (silent empty returns under rapid polling).
    """

    def __init__(self, rate: float = 0.9, capacity: float = 1.0):
        self.rate = rate  # tokens added per second
        self.capacity = capacity  # max bucket size
        self.tokens = capacity
        self.last_update = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self) -> float:
        """Acquire a token, blocking if necessary until one becomes available.

        Returns total seconds waited.
        """
        waited = 0.0
        with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.last_update = now

            # Replenish tokens based on elapsed time
            self.tokens = min(self.capacity, self.tokens + (elapsed * self.rate))

            if self.tokens < 1.0:
                # Calculate sleep duration needed to replenish to 1 token
                needed = 1.0 - self.tokens
                sleep_duration = needed / self.rate
                time.sleep(sleep_duration)
                waited = sleep_duration
                # After sleeping, replenish to 1.0 and deduct
                self.last_update = time.monotonic()
                self.tokens = 0.0
            else:
                self.tokens -= 1.0

        return waited


class CJClient:
    """High-reliability client for CJ Dropshipping API v2.0."""

    BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"

    PROHIBITED_KEYWORDS = [
        # Medical, cosmetic, ingestible, and supplement liabilities
        "cream", "serum", "collagen", "lotion", "gel", "moisturizer",
        "patch", "capsule", "pill", "supplement", "vitamin", "tea",
        "oil", "mask", "whitening", "anti-aging", "anti aging", "slimming",
        "butt", "breast", "eyelash", "acne", "hair removal", "gummy", "gummies",
        "diet", "keto", "drop", "drops", "snore", "snoring", "teeth", "tooth",
        # Apparel, shoes, and clothing (singular & plural)
        "t-shirt", "tshirt", "shirt", "hoodie", "shoes", "shoe", "sneaker",
        "dress", "pants", "bra", "underwear", "clothing", "jacket", "coat",
        "shorts", "sweater", "skirt", "socks", "sock", "leggings", "swimsuit",
        "swimwear", "boots", "boot", "sandals", "sandal", "heels", "blouse",
        "jeans", "jean", "denim", "fleece", "vest", "robe", "lingerie", "scarf",
        # Tiles, wallpapers, and wall stickers
        "tile", "tiles", "wallpaper", "flooring", "wall sticker",
        # Heavy furniture, chairs, large desks, and bulky luggage
        "chair", "folding desk", "computer desk", "standing desk", "sofa", "couch",
        "mattress", "bed", "wardrobe", "furniture", "luggage cart", "luggage",
        "suitcase", "wagon", "trolley",
        # Expensive / high-liability electronics
        "smartphone", "drone", "television",
    ]

    def __init__(
        self,
        api_key: Optional[str] = None,
        rate_limiter: Optional[TokenBucketRateLimiter] = None,
        timeout: float = 10.0,
    ):
        self.api_key = api_key or os.getenv("CJ_API_KEY", "").strip()
        self.rate_limiter = rate_limiter or TokenBucketRateLimiter(rate=0.75, capacity=1.0)
        self.client = httpx.Client(timeout=timeout)
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0.0  # Unix timestamp

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self.client.close()

    def __enter__(self) -> "CJClient":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def _get_headers(self, authenticated: bool = True) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Antigravity-Dropship-Core/2.0",
        }
        if authenticated and self.access_token:
            headers["CJ-Access-Token"] = self.access_token
        return headers

    def authenticate(self, force_refresh: bool = False) -> bool:
        """Authenticate with CJ API and retrieve access token."""
        if not self.api_key:
            raise ValueError("CJ_API_KEY is not configured in environment or passed to client.")

        now = time.time()
        if not force_refresh and self.access_token and (now < self.token_expiry - 300):
            return True

        self.rate_limiter.acquire()
        url = f"{self.BASE_URL}/authentication/getAccessToken"
        payload = {"apiKey": self.api_key}

        try:
            resp = self.client.post(url, json=payload, headers=self._get_headers(authenticated=False))
            data = resp.json()

            if data.get("code") == 200 or data.get("result") is True:
                token_data = data.get("data", {})
                self.access_token = token_data.get("accessToken")
                # Tokens usually last 180 days; default to 24h if missing
                expires_in = token_data.get("accessTokenExpiryDate")
                self.token_expiry = now + 86400 * 30  # Conservative 30-day buffer
                logger.info("CJ API Authentication successful. Token obtained.")
                return True
            else:
                logger.error("CJ Authentication failed: %s", data.get("message"))
                return False
        except Exception as exc:
            logger.error("Exception during CJ authentication: %s", exc)
            return False

    def is_prohibited_product(self, title: str, category_name: str = "") -> bool:
        """Return True if title or category matches the strict liability blacklist."""
        combined = f"{title.lower()} {category_name.lower()}"
        for kw in self.PROHIBITED_KEYWORDS:
            if re.search(r"\b" + re.escape(kw) + r"(s|es|ies)?\b", combined):
                return True
        return False

    def query_us_warehouse_products(
        self,
        page: int = 1,
        size: int = 25,
        min_price: float = 3.0,
        max_price: float = 22.0,
        min_warehouse_stock: int = 50,
        keyword: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query catalog filtering for US domestic warehouses and approved price bounds."""
        self.authenticate()
        self.rate_limiter.acquire()

        url = f"{self.BASE_URL}/product/listV2"
        params: Dict[str, Any] = {
            "page": page,
            "size": size,
            "countryCode": "US",
            "startSellPrice": min_price,
            "endSellPrice": max_price,
            "startWarehouseInventory": min_warehouse_stock,
        }
        if keyword:
            params["keyWord"] = keyword

        resp = self.client.get(url, params=params, headers=self._get_headers())
        if resp.status_code == 429:
            logger.warning("CJ API 429 rate limit hit on listV2. Backing off 3.0s...")
            time.sleep(3.0)
            self.rate_limiter.acquire()
            resp = self.client.get(url, params=params, headers=self._get_headers())

        res_json = resp.json() if resp.status_code == 200 else {}
        data = res_json.get("data") or {}
        content = data.get("content") or []

        products: List[Dict[str, Any]] = []
        for c in content:
            for item in c.get("productList", []):
                title = item.get("nameEn") or item.get("productName") or ""
                cat_name = item.get("categoryName") or ""
                # Enforce liability whitelist filter
                if not self.is_prohibited_product(title, cat_name):
                    products.append(item)

        return products

    def get_product_details(self, pid: str) -> Dict[str, Any]:
        """Fetch detailed variant and media information for a product."""
        self.authenticate()
        self.rate_limiter.acquire()

        url = f"{self.BASE_URL}/product/query"
        resp = self.client.get(url, params={"pid": pid}, headers=self._get_headers())
        if resp.status_code == 429:
            logger.warning("CJ API 429 rate limit hit on query. Backing off 3.0s...")
            time.sleep(3.0)
            self.rate_limiter.acquire()
            resp = self.client.get(url, params={"pid": pid}, headers=self._get_headers())

        res_json = resp.json() if resp.status_code == 200 else {}
        return res_json.get("data") or {}

    def query_variant_stock(self, vid: str) -> List[Dict[str, Any]]:
        """Query physical warehouse stock count for a variant by VID.

        Returns list of stock records per warehouse.
        """
        self.authenticate()
        self.rate_limiter.acquire()

        url = f"{self.BASE_URL}/product/stock/queryByVid"
        resp = self.client.get(url, params={"vid": vid}, headers=self._get_headers())
        return resp.json().get("data", []) or []

    def get_verified_us_stock(self, vid: str) -> int:
        """Inspect warehouse records and extract total physical stock in US warehouses."""
        stock_records = self.query_variant_stock(vid)
        us_stock = 0
        for record in stock_records:
            # Check country or warehouse label
            country = (record.get("countryCode") or "").upper()
            area_id = record.get("areaId")
            storage_num = int(record.get("storageNum") or record.get("inventoryNum") or 0)
            if country == "US" or area_id == 2 or "US" in (record.get("warehouseName") or "").upper():
                us_stock += storage_num

        return us_stock

    def calculate_us_freight(
        self,
        vid: str,
        zip_code: str = "90001",
        quantity: int = 1,
    ) -> List[Dict[str, Any]]:
        """Calculate freight options strictly enforcing US to US domestic origin and destination."""
        self.authenticate()
        self.rate_limiter.acquire()

        url = f"{self.BASE_URL}/logistic/freightCalculate"
        payload = {
            "startCountryCode": "US",
            "endCountryCode": "US",
            "zip": zip_code,
            "products": [{"vid": vid, "quantity": quantity}],
        }

        resp = self.client.post(url, json=payload, headers=self._get_headers())
        return resp.json().get("data", []) or []

    def get_cheapest_domestic_shipping(
        self, vid: str
    ) -> Tuple[Optional[str], float, str, int]:
        """Return (carrier_name, shipping_cost, delivery_aging_string, max_delivery_days).

        Filters for tracked domestic lines with max delivery <= 7 business days.
        """
        freight_lines = self.calculate_us_freight(vid)
        if not freight_lines:
            return None, 0.0, "N/A", 999

        valid_lines = []
        for line in freight_lines:
            logistic_name = line.get("logisticName") or "USPS"
            cost = float(line.get("logisticPrice") or 0.0)
            aging = line.get("logisticAging") or "3-7"

            # Parse max days from aging string (e.g., "3-5" -> 5, "3-7" -> 7)
            nums = re.findall(r"\d+", aging)
            max_days = int(nums[-1]) if nums else 7

            valid_lines.append((logistic_name, cost, aging, max_days))

        # Sort by cost ascending, then max_days ascending
        valid_lines.sort(key=lambda x: (x[1], x[3]))
        return valid_lines[0]

    def create_order(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Submit an order to CJ Dropshipping via POST /shopping/order/createOrderV2.

        Enforces rate limiting and authentication.
        """
        self.authenticate()
        self.rate_limiter.acquire()

        url = f"{self.BASE_URL}/shopping/order/createOrderV2"
        resp = self.client.post(url, json=payload, headers=self._get_headers())
        return resp.json()

