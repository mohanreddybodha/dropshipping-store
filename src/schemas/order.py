"""Strict Pydantic v2 Input Validation & Schema Sanitization.

Enforces:
1. Strict regex validation for US Postal Codes and Phone Numbers.
2. Hard string length constraints preventing buffer overflows / truncation attacks.
3. extra="forbid" to automatically reject unexpected or malicious injection fields.
"""

from __future__ import annotations

import re
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Common validation regex patterns
US_ZIP_REGEX = re.compile(r"^\d{5}(-\d{4})?$")
PHONE_REGEX = re.compile(r"^\+?[0-9\s\-\(\)\.]{7,25}$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class StrictBaseModel(BaseModel):
    """Base schema rejecting unexpected extra fields."""
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )


class OrderLineItemSchema(StrictBaseModel):
    variant_id: str = Field(..., min_length=1, max_length=128, description="CJ Variant ID (vid)")
    sku: Optional[str] = Field(None, max_length=128, description="Product SKU")
    quantity: int = Field(default=1, ge=1, le=100, description="Quantity ordered (1-100 units)")
    unit_price: float = Field(default=0.0, ge=0.0, description="Customer price per unit")


class ShippingAddressSchema(StrictBaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Customer full name")
    address1: str = Field(..., min_length=3, max_length=200, description="Street address line 1")
    address2: Optional[str] = Field("", max_length=100, description="Apartment/suite number")
    city: str = Field(..., min_length=2, max_length=100, description="City")
    province: str = Field(..., min_length=2, max_length=50, description="State or Province")
    zip_code: str = Field(..., min_length=5, max_length=10, description="US 5-digit or 9-digit postal code")
    country_code: str = Field(default="US", min_length=2, max_length=2, description="ISO-2 Country code")
    phone: str = Field(default="2135550199", min_length=7, max_length=25, description="Contact phone number")
    email: str = Field(..., min_length=5, max_length=150, description="Customer email address")

    @field_validator("zip_code")
    @classmethod
    def validate_zip_code(cls, v: str) -> str:
        clean_zip = v.strip()
        if not US_ZIP_REGEX.match(clean_zip):
            raise ValueError(f"Invalid US postal code format: '{v}'. Must match 12345 or 12345-6789.")
        return clean_zip

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean_phone = v.strip()
        if not PHONE_REGEX.match(clean_phone):
            raise ValueError(f"Invalid phone number format: '{v}'.")
        return clean_phone

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean_email = v.strip().lower()
        if not EMAIL_REGEX.match(clean_email):
            raise ValueError(f"Invalid email address format: '{v}'.")
        return clean_email

    @field_validator("country_code")
    @classmethod
    def validate_country(cls, v: str) -> str:
        code = v.strip().upper()
        if code != "US":
            raise ValueError(f"Destination country '{code}' is not supported. Platform operates strictly in US Domestic market.")
        return code


class PaymentWebhookPayload(StrictBaseModel):
    """Secure webhook payload representing captured payment event."""

    event: str = Field(default="payment.captured", min_length=3, max_length=64)
    order_id: str = Field(..., min_length=4, max_length=128, description="Deterministic internal order number")
    amount: float = Field(..., gt=0.0, description="Total amount paid by customer in USD")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_intent_id: Optional[str] = Field(None, max_length=256, description="Stripe/PayPal reference ID")
    customer: ShippingAddressSchema
    line_items: List[OrderLineItemSchema] = Field(..., min_length=1, max_length=25)
    carrier_preference: Optional[str] = Field("USPS US to US", max_length=100)


class OrderCreateRequest(StrictBaseModel):
    """Direct order creation request schema."""

    order_id: Optional[str] = Field(None, max_length=128)
    customer: ShippingAddressSchema
    line_items: List[OrderLineItemSchema] = Field(..., min_length=1)
    carrier_name: str = Field(default="USPS US to US", max_length=100)
    remark: Optional[str] = Field("Headless Storefront Order", max_length=255)
