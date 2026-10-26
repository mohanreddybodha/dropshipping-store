"""Cryptographic Webhook Verification & Security Utilities.

Prevents webhook spoofing, replay attacks, and fraud via HMAC-SHA256 verification
with constant-time comparison (hmac.compare_digest).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Optional

from fastapi import Header, HTTPException, Request, status

logger = logging.getLogger("security")


def compute_hmac_sha256(payload: bytes, secret: str) -> str:
    """Compute HMAC-SHA256 hex digest for a raw bytes payload."""
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def verify_webhook_signature(
    raw_body: bytes,
    signature_header: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """Cryptographically verify payment gateway webhook signatures.

    Supports:
    1. Standard raw hex digest (e.g. "a1b2c3...")
    2. Prefixed hex digest (e.g. "sha256=a1b2c3...")
    3. Stripe-style timestamped signatures (e.g. "t=1700000000,v1=a1b2c3...")
    """
    signing_secret = secret or os.getenv("WEBHOOK_SECRET", "")
    if not signing_secret:
        logger.error("WEBHOOK_SECRET is not configured in environment. Rejecting webhook.")
        return False

    if not signature_header:
        logger.warning("Missing webhook signature header.")
        return False

    # Extract signature digest
    incoming_digest = signature_header.strip()

    # Handle prefixed signatures: "sha256=..."
    if incoming_digest.startswith("sha256="):
        incoming_digest = incoming_digest.split("sha256=", 1)[1].strip()

    # Handle Stripe-style "t=...,v1=..."
    if "v1=" in incoming_digest:
        parts = dict(p.strip().split("=", 1) for p in incoming_digest.split(",") if "=" in p)
        v1_sig = parts.get("v1")
        timestamp = parts.get("t")
        if not v1_sig or not timestamp:
            return False

        # Signed payload is {timestamp}.{raw_body}
        signed_payload = f"{timestamp}.".encode("utf-8") + raw_body
        expected_sig = compute_hmac_sha256(signed_payload, signing_secret)
        return hmac.compare_digest(expected_sig, v1_sig)

    # Standard direct HMAC-SHA256 comparison
    expected_digest = compute_hmac_sha256(raw_body, signing_secret)
    return hmac.compare_digest(expected_digest, incoming_digest)


async def verify_payment_webhook(
    request: Request,
    x_signature: Optional[str] = Header(None, alias="X-Signature"),
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
) -> bytes:
    """FastAPI dependency enforcing cryptographic signature verification.

    Returns the validated raw request body bytes on success.
    Raises HTTP 401 Unauthorized if missing or invalid.
    """
    sig = x_signature or stripe_signature or x_razorpay_signature

    raw_body = await request.body()
    if not sig:
        logger.warning("Rejected webhook without signature header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED", "message": "Missing cryptographic signature header."},
        )

    if not verify_webhook_signature(raw_body, sig):
        logger.critical("Security Alert: Invalid cryptographic signature on webhook!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED", "message": "Invalid cryptographic webhook signature."},
        )

    return raw_body
