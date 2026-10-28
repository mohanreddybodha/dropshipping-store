"""PayPal REST API v2 Integration Service.

Production-grade payment processing with:
1. Strict idempotency keys (PayPal-Request-Id) to prevent double charges on retries.
2. Self-healing capture: checks for already-completed orders if network drops mid-flight.
3. Automated refund support for fulfillment failure recovery (ADR-003).
4. Memory-cached OAuth2 tokens with pre-emptive expiry rotation.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
import urllib.request
import urllib.error
import urllib.parse
from typing import Any, Dict, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("paypal_service")


class PayPalServiceException(Exception):
    """Base exception for PayPal API operations."""
    pass


class PayPalService:
    def __init__(self):
        self._cached_token: Optional[str] = None
        self._token_expiry: float = 0.0

    @property
    def mode(self) -> str:
        return os.environ.get("PAYPAL_MODE", "sandbox").lower()

    @property
    def client_id(self) -> str:
        return os.environ.get("PAYPAL_CLIENT_ID", "").strip()

    @property
    def client_secret(self) -> str:
        return os.environ.get("PAYPAL_CLIENT_SECRET", "").strip()

    @property
    def base_url(self) -> str:
        if self.mode == "live":
            return "https://api-m.paypal.com"
        return "https://api-m.sandbox.paypal.com"

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def get_access_token(self) -> str:
        """Retrieve valid OAuth2 Bearer token from PayPal, utilizing in-memory cache."""
        now = time.time()
        if self._cached_token and now < self._token_expiry - 60:
            return self._cached_token

        if not self.is_configured():
            raise PayPalServiceException("PayPal credentials (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET) are not configured.")

        url = f"{self.base_url}/v1/oauth2/token"
        req = urllib.request.Request(url, data=b"grant_type=client_credentials")
        auth_bytes = f"{self.client_id}:{self.client_secret}".encode("utf-8")
        auth_header = base64.b64encode(auth_bytes).decode("utf-8")
        req.add_header("Authorization", f"Basic {auth_header}")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status != 200:
                    raise PayPalServiceException(f"Failed to authenticate with PayPal: HTTP {response.status}")
                data = json.loads(response.read().decode("utf-8"))
                self._cached_token = data["access_token"]
                expires_in = data.get("expires_in", 3600)
                self._token_expiry = now + expires_in
                return self._cached_token
        except Exception as exc:
            logger.error("PayPal token acquisition failed: %s", exc)
            raise PayPalServiceException(f"PayPal authentication error: {exc}") from exc

    def create_order(
        self,
        amount: float,
        currency: str = "USD",
        internal_order_number: Optional[str] = None,
        return_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create an authorized PayPal checkout order with strict idempotency."""
        token = self.get_access_token()
        url = f"{self.base_url}/v2/checkout/orders"

        order_ref = internal_order_number or f"ORD-{int(time.time() * 1000)}"
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": order_ref,
                    "description": f"Domestic Direct Order {order_ref}",
                    "amount": {
                        "currency_code": currency.upper(),
                        "value": f"{amount:.2f}",
                    },
                }
            ],
            "application_context": {
                "brand_name": "Domestic Direct",
                "landing_page": "NO_PREFERENCE",
                "user_action": "PAY_NOW",
            },
        }

        if return_url and cancel_url:
            payload["application_context"]["return_url"] = return_url
            payload["application_context"]["cancel_url"] = cancel_url

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes)
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")
        # Idempotency Key: Prevents duplicate orders if client retries creation
        req.add_header("PayPal-Request-Id", f"create-{order_ref}")

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return result
        except Exception as exc:
            logger.error("PayPal order creation failed for [%s]: %s", order_ref, exc)
            raise PayPalServiceException(f"Failed to create PayPal order: {exc}") from exc

    def get_order_details(self, paypal_order_id: str) -> Dict[str, Any]:
        """Fetch status and details of an existing PayPal order."""
        token = self.get_access_token()
        url = f"{self.base_url}/v2/checkout/orders/{paypal_order_id}"

        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            logger.error("PayPal order lookup failed for [%s]: %s", paypal_order_id, exc)
            raise PayPalServiceException(f"Failed to fetch PayPal order: {exc}") from exc

    def capture_order(self, paypal_order_id: str) -> Dict[str, Any]:
        """Capture payment for an approved PayPal order with self-healing recovery."""
        # 1. Pre-flight self-healing check: Has this order already been captured?
        # (Handles network timeout where PayPal captured successfully but response dropped)
        try:
            existing = self.get_order_details(paypal_order_id)
            if existing.get("status") == "COMPLETED":
                logger.info("Order [%s] already captured in previous cycle. Returning verified state.", paypal_order_id)
                return existing
        except Exception as pre_err:
            logger.debug("Pre-capture lookup ignored: %s", pre_err)

        token = self.get_access_token()
        url = f"{self.base_url}/v2/checkout/orders/{paypal_order_id}/capture"

        req = urllib.request.Request(url, data=b"{}")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")
        # Idempotency Key: Prevents duplicate card charges on retry
        req.add_header("PayPal-Request-Id", f"capture-{paypal_order_id}")

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                return result
        except urllib.error.HTTPError as http_err:
            # If PayPal returns 422 because order was already captured, fetch and return order details
            if http_err.code in (422, 400):
                try:
                    err_body = json.loads(http_err.read().decode("utf-8"))
                    issue = err_body.get("details", [{}])[0].get("issue", "")
                    if "ORDER_ALREADY_CAPTURED" in issue or "COMPLETED" in issue:
                        logger.info("Handling ORDER_ALREADY_CAPTURED for [%s] via self-healing fetch.", paypal_order_id)
                        return self.get_order_details(paypal_order_id)
                except Exception:
                    pass
            logger.error("PayPal order capture HTTP error [%s]: %s", paypal_order_id, http_err)
            raise PayPalServiceException(f"PayPal capture failed: {http_err}") from http_err
        except Exception as exc:
            logger.error("PayPal order capture failed for [%s]: %s", paypal_order_id, exc)
            raise PayPalServiceException(f"Failed to capture PayPal order: {exc}") from exc

    def refund_capture(self, capture_id: str, amount: Optional[float] = None, reason: str = "") -> Dict[str, Any]:
        """Trigger an automated refund for a captured payment (e.g. logisticsMiss failure)."""
        token = self.get_access_token()
        url = f"{self.base_url}/v2/payments/captures/{capture_id}/refund"

        payload: Dict[str, Any] = {"note_to_payer": reason or "Order fulfillment unavailable. Full refund issued."}
        if amount and amount > 0:
            payload["amount"] = {"value": f"{amount:.2f}", "currency_code": "USD"}

        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"))
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")
        req.add_header("PayPal-Request-Id", f"refund-{capture_id}")

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            logger.error("PayPal refund failed for capture [%s]: %s", capture_id, exc)
            raise PayPalServiceException(f"Failed to issue refund: {exc}") from exc
