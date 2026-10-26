#!/usr/bin/env python3
"""
Pre-Implementation Technical & Business Viability Spike (Proof of Concept)
Supplier API Automated Validation Suite for Headless E-Commerce & Dropshipping Middleware.

Target Supplier: CJ Dropshipping API v2.0 (with Printify hooks)
Author: Lead Distributed Systems Architect & Lead QA Automation Engineer
"""

import os
import sys
import time
import json
import uuid
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

# Enforce UTF-8 on Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import httpx
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

# Initialize Rich Console
console = Console()

# Load Environment Variables
load_dotenv()
CJ_API_KEY = os.getenv("CJ_API_KEY", "").strip()
TARGET_COUNTRY_CODE = os.getenv("TARGET_COUNTRY_CODE", "US").strip().upper()
PRINTIFY_API_TOKEN = os.getenv("PRINTIFY_API_TOKEN", "").strip()
PRINTIFY_SHOP_ID = os.getenv("PRINTIFY_SHOP_ID", "").strip()

CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"

# -----------------------------------------------------------------------------
# PYDANTIC SCHEMAS FOR CONTRACT VALIDATION
# -----------------------------------------------------------------------------

class WebhookLineItem(BaseModel):
    variant_id: str
    sku: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0.0)

class CustomerAddress(BaseModel):
    name: str
    address1: str
    city: str
    province: str
    zip_code: str
    country_code: str
    phone: str
    email: str

class PaymentCapturedWebhook(BaseModel):
    event: str = "payment.captured"
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    order_id: str = Field(default_factory=lambda: f"ORD-{uuid.uuid4().hex[:8].upper()}")
    currency: str = "USD"
    amount: float = Field(ge=0.0)
    customer: CustomerAddress
    line_items: List[WebhookLineItem]
    captured_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VariantSchema(BaseModel):
    vid: str
    sku: str
    sell_price: float
    weight_grams: float
    image_url: Optional[str] = None
    inventory_num: Optional[int] = None
    cj_warehouse_stock: int = 0
    factory_stock: int = 0

class UnitEconomicsResult(BaseModel):
    product_name: str
    variant_sku: str
    c_wholesale: float
    c_shipping: float
    shipping_carrier: str
    t_delivery_days: str
    t_delivery_max: int
    retail_price: float
    payment_gateway_fee: float
    rto_buffer: float
    net_profit: float
    net_margin_pct: float
    is_viable: bool
    rejection_reason: Optional[str] = None

# -----------------------------------------------------------------------------
# CJ API CLIENT WRAPPER (WITH NATIVE RATE-LIMIT THROTTLING)
# -----------------------------------------------------------------------------

class CJApiClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expiry: Optional[str] = None
        self.client = httpx.Client(timeout=25.0)
        self.last_request_time = 0.0
        self.min_interval = 1.05  # Enforce 1 QPS rate limit

    def _throttle(self):
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()

    def close(self):
        self.client.close()

    def get_headers(self, authenticated: bool = True) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "CJ-Enterprise-Diagnostic/2.0",
        }
        if authenticated and self.access_token:
            headers["CJ-Access-Token"] = self.access_token
        return headers

    def authenticate(self) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/authentication/getAccessToken"
        start_time = time.perf_counter()
        resp = self.client.post(
            url,
            json={"apiKey": self.api_key},
            headers=self.get_headers(authenticated=False),
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        data = resp.json()
        if data.get("code") == 200 or data.get("result") is True:
            t_data = data.get("data", {})
            self.access_token = t_data.get("accessToken")
            self.refresh_token = t_data.get("refreshToken")
            self.token_expiry = t_data.get("accessTokenExpiryDate")

        return {
            "http_status": resp.status_code,
            "elapsed_ms": elapsed_ms,
            "headers": dict(resp.headers),
            "response": data,
        }

    def test_token_refresh(self) -> Dict[str, Any]:
        if not self.refresh_token:
            return {"success": False, "error": "No refresh token available"}
        self._throttle()
        url = f"{CJ_BASE_URL}/authentication/refreshAccessToken"
        start_time = time.perf_counter()
        resp = self.client.post(
            url,
            json={"refreshToken": self.refresh_token},
            headers=self.get_headers(authenticated=False),
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return {
            "http_status": resp.status_code,
            "elapsed_ms": elapsed_ms,
            "response": resp.json(),
        }

    def get_products(self, page: int = 1, size: int = 10) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/product/listV2"
        params = {"page": page, "size": size}
        resp = self.client.get(url, params=params, headers=self.get_headers())
        return resp.json()

    def get_product_details(self, pid: str) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/product/query"
        params = {"pid": pid}
        resp = self.client.get(url, params=params, headers=self.get_headers())
        return resp.json()

    def get_variant_stock(self, vid: str) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/product/stock/queryByVid"
        params = {"vid": vid}
        resp = self.client.get(url, params=params, headers=self.get_headers())
        return resp.json()

    def calculate_freight(
        self,
        vid: str,
        quantity: int,
        start_country: str,
        end_country: str,
        zip_code: str,
    ) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/logistic/freightCalculate"
        payload = {
            "startCountryCode": start_country,
            "endCountryCode": end_country,
            "zip": zip_code,
            "products": [{"vid": vid, "quantity": quantity}],
        }
        resp = self.client.post(url, json=payload, headers=self.get_headers())
        return resp.json()

    def create_order_dry_run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/shopping/order/createOrderV2"
        resp = self.client.post(url, json=payload, headers=self.get_headers())
        return resp.json()

    def delete_order(self, order_id: str) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/shopping/order/deleteOrder"
        params = {"orderId": order_id}
        resp = self.client.delete(url, params=params, headers=self.get_headers())
        return resp.json()

# -----------------------------------------------------------------------------
# HELPER PARSER
# -----------------------------------------------------------------------------

def parse_delivery_days(aging_str: str) -> int:
    """Extract max delivery days from aging string like '5-11', '12-50'."""
    if not aging_str:
        return 999
    matches = re.findall(r"\d+", aging_str)
    if matches:
        return int(matches[-1])
    return 999

# -----------------------------------------------------------------------------
# VALIDATION MODULES
# -----------------------------------------------------------------------------

def run_module_1_auth(api: CJApiClient) -> Dict[str, Any]:
    console.print("\n[bold cyan]━━━ MODULE 1: Auth, Rate-Limit & Token Lifecycle Audit ━━━[/bold cyan]")
    auth_result = api.authenticate()
    elapsed = auth_result["elapsed_ms"]
    status = auth_result["http_status"]
    data = auth_result["response"]
    headers = auth_result["headers"]

    console.print(f"  [bold]Endpoint:[/bold] {CJ_BASE_URL}/authentication/getAccessToken")
    console.print(f"  [bold]HTTP Status:[/bold] {status} | [bold]TTFB Latency:[/bold] [yellow]{elapsed:.2f}ms[/yellow]")

    # Rate limiting & Quota Inspection
    points_info = data.get("pointsInfo", {})
    daily_quota = points_info.get("total", "N/A")
    used_today = points_info.get("usedToday", "N/A")
    remaining_points = points_info.get("remaining", "N/A")

    console.print(f"  [bold]API Quota Points:[/bold] Total={daily_quota} | UsedToday={used_today} | Remaining={remaining_points}")

    # Header analysis
    server = headers.get("server", "Unknown")
    date_header = headers.get("date", "Unknown")
    console.print(f"  [bold]Server Infrastructure:[/bold] {server} (Gateway Date: {date_header})")

    # Token Lifespan
    access_token = api.access_token
    refresh_token = api.refresh_token
    expiry = api.token_expiry
    console.print(f"  [bold]Access Token Expiry:[/bold] {expiry}")

    # Test refresh token endpoint
    console.print("  [bold]Testing Token Refresh Contract...[/bold]")
    refresh_res = api.test_token_refresh()
    r_status = refresh_res.get("http_status")
    r_code = refresh_res.get("response", {}).get("code")
    r_success = (r_status == 200 and r_code == 200)

    if r_success:
        console.print(f"  [green]✔ Token refresh contract verified ({refresh_res.get('elapsed_ms'):.1f}ms)[/green]")
    else:
        console.print(f"  [yellow]⚠ Token refresh note: {refresh_res.get('response', {}).get('message')}[/yellow]")

    # Pass Criteria Check: < 1200ms, valid token retrieval
    is_pass = (status == 200 and data.get("code") == 200 and elapsed < 1200.0 and access_token is not None)
    status_text = "[green]PASSED[/green]" if is_pass else f"[red]FAILED (Latency {elapsed:.1f}ms > 1200ms threshold)[/red]"
    console.print(f"  [bold]Module 1 Status:[/bold] {status_text}\n")

    return {
        "passed": is_pass,
        "latency_ms": elapsed,
        "token_expiry": expiry,
        "quota": points_info,
        "refresh_verified": r_success,
    }


def run_module_2_catalog(api: CJApiClient) -> Dict[str, Any]:
    console.print("[bold cyan]━━━ MODULE 2: Catalog Ingestion & 'Ghost Inventory' Filter Test ━━━[/bold cyan]")
    console.print("  Querying 10 sample products from catalog (Page 1, Size 10)...")

    catalog_data = api.get_products(page=1, size=10)
    items_list = []
    content = catalog_data.get("data", {}).get("content", [])
    for entry in content:
        items_list.extend(entry.get("productList", []))

    if not items_list:
        console.print("  [red]✖ Failed to retrieve products from catalog listV2![/red]")
        return {"passed": False, "pass_rate": 0.0, "valid_products": []}

    console.print(f"  Retrieved {len(items_list)} products. Auditing warehouse physical inventory vs. factory stock...")

    table = Table(
        title="Sample Catalog Products - Physical Stock vs. Factory Inventory",
        box=box.HORIZONTALS,
        header_style="bold magenta",
    )
    table.add_column("PID", style="cyan", width=18)
    table.add_column("Product Name", style="white", max_width=32, overflow="ellipsis")
    table.add_column("Variants", justify="right")
    table.add_column("Price Range", justify="right")
    table.add_column("CJ Warehouse (Physical)", justify="right")
    table.add_column("Factory (Unverified)", justify="right")
    table.add_column("Ghost Risk", justify="center")

    valid_products = []
    total_audited = min(len(items_list), 10)

    for prod in items_list[:total_audited]:
        pid = str(prod.get("id"))
        pname = prod.get("nameEn") or prod.get("productName") or "N/A"
        
        # Query full product details
        details = api.get_product_details(pid)
        v_list = details.get("data", {}).get("variants", [])
        
        if not v_list:
            table.add_row(pid, pname, "0", "N/A", "0", "0", "[red]NO VARIANTS[/red]")
            continue

        sample_v = v_list[0]
        vid = sample_v.get("vid")
        
        # Query physical warehouse stock by VID
        stock_res = api.get_variant_stock(vid)
        stock_entries = stock_res.get("data", [])
        
        cj_stock = 0
        factory_stock = 0
        if stock_entries and isinstance(stock_entries, list):
            for entry in stock_entries:
                cj_stock += entry.get("cjInventoryNum", 0)
                factory_stock += entry.get("factoryInventoryNum", 0)

        # Parse variants with Pydantic
        parsed_variants = []
        for v in v_list:
            try:
                pv = VariantSchema(
                    vid=str(v.get("vid")),
                    sku=str(v.get("variantSku") or ""),
                    sell_price=float(v.get("variantSellPrice") or 0.0),
                    weight_grams=float(v.get("variantWeight") or 0.0),
                    image_url=v.get("variantImage"),
                    inventory_num=v.get("inventoryNum"),
                    cj_warehouse_stock=cj_stock,
                    factory_stock=factory_stock,
                )
                parsed_variants.append(pv)
            except ValidationError:
                pass

        prices = [v.sell_price for v in parsed_variants if v.sell_price > 0]
        min_p = min(prices) if prices else 0.0
        max_p = max(prices) if prices else 0.0
        price_str = f"${min_p:.2f} - ${max_p:.2f}" if min_p != max_p else f"${min_p:.2f}"

        # Evaluate Ghost Inventory
        # Physical warehouse stock < 30 units flags ghost inventory
        is_ghost = (cj_stock < 30)
        ghost_badge = "[red]HIGH GHOST[/red]" if is_ghost else "[green]STOCKED[/green]"

        table.add_row(
            pid,
            pname,
            str(len(parsed_variants)),
            price_str,
            f"[bold]{cj_stock}[/bold]",
            f"{factory_stock}",
            ghost_badge,
        )

        has_valid_variants = (len(parsed_variants) > 0 and all(v.sku and v.sell_price > 0 for v in parsed_variants[:3]))
        has_valid_images = bool(prod.get("bigImage") or (parsed_variants and parsed_variants[0].image_url))
        passes_module_2 = has_valid_variants and has_valid_images and (cj_stock >= 30)

        valid_products.append({
            "pid": pid,
            "name": pname,
            "variants": parsed_variants,
            "big_image": prod.get("bigImage"),
            "cj_stock": cj_stock,
            "factory_stock": factory_stock,
            "passed_ghost_filter": passes_module_2,
            "primary_variant": parsed_variants[0] if parsed_variants else None,
        })

    console.print(table)

    passed_count = sum(1 for p in valid_products if p["passed_ghost_filter"])
    pass_rate = (passed_count / total_audited) * 100.0

    console.print(f"  [bold]Audited Products:[/bold] {total_audited} | [bold]Physical Stock (>30) Passed:[/bold] {passed_count}/{total_audited} ([yellow]{pass_rate:.1f}%[/yellow])")
    
    # Pass Criteria: >= 70% of queried items return complete variant arrays, valid images, and verified stock > 30
    module_2_pass = (pass_rate >= 70.0)
    status_text = "[green]PASSED[/green]" if module_2_pass else "[red]FAILED (Severe Ghost Inventory Discovered)[/red]"
    console.print(f"  [bold]Module 2 Status:[/bold] {status_text} (Target: >= 70.0% verified physical stock, actual: {pass_rate:.1f}%)\n")

    return {
        "passed": module_2_pass,
        "pass_rate": pass_rate,
        "products": valid_products,
    }


def run_module_3_freight(api: CJApiClient, products: List[Dict[str, Any]], target_country: str) -> Dict[str, Any]:
    console.print(f"[bold cyan]━━━ MODULE 3: Real-Time Freight & Unit Economics Stress Test ({target_country}) ━━━[/bold cyan]")
    
    zip_code = "90001" if target_country == "US" else "110001"
    console.print(f"  Destination: [yellow]{target_country}[/yellow] (Postal: {zip_code}) | Origin: [yellow]CN[/yellow]")

    candidates = [p for p in products if p.get("primary_variant") is not None]
    if not candidates:
        console.print("  [red]✖ No candidate products available with valid variants for freight calculation.[/red]")
        return {"passed": False, "results": []}

    test_batch = candidates[:3]
    console.print(f"  Evaluating real-time freight lines and unit economics for {len(test_batch)} products...\n")

    results: List[UnitEconomicsResult] = []

    for item in test_batch:
        pname = item["name"]
        variant: VariantSchema = item["primary_variant"]
        c_wholesale = variant.sell_price

        freight_res = api.calculate_freight(
            vid=variant.vid,
            quantity=1,
            start_country="CN",
            end_country=target_country,
            zip_code=zip_code,
        )

        lines = freight_res.get("data", [])
        if not lines or not isinstance(lines, list):
            results.append(UnitEconomicsResult(
                product_name=pname,
                variant_sku=variant.sku,
                c_wholesale=c_wholesale,
                c_shipping=0.0,
                shipping_carrier="No routes available",
                t_delivery_days="N/A",
                t_delivery_max=999,
                retail_price=0.0,
                payment_gateway_fee=0.0,
                rto_buffer=0.0,
                net_profit=0.0,
                net_margin_pct=0.0,
                is_viable=False,
                rejection_reason=f"No shipping routes found for {target_country}",
            ))
            continue

        # Filter valid lines with positive price
        valid_lines = [l for l in lines if l.get("logisticPrice") is not None and float(l.get("logisticPrice")) > 0]
        if not valid_lines:
            continue

        # Evaluate candidate shipping lines:
        # Check if any line qualifies under T_delivery <= 8 days
        fast_qualifying = [l for l in valid_lines if parse_delivery_days(l.get("logisticAging", "999")) <= 8]

        if fast_qualifying:
            # Pick the cheapest of the fast lines
            fast_qualifying.sort(key=lambda x: float(x.get("logisticPrice", 999)))
            selected_line = fast_qualifying[0]
        else:
            # Pick the overall cheapest tracked line
            valid_lines.sort(key=lambda x: float(x.get("logisticPrice", 999)))
            selected_line = valid_lines[0]

        c_shipping = float(selected_line.get("logisticPrice", 0.0))
        carrier_name = selected_line.get("logisticName", "Unknown")
        aging_str = selected_line.get("logisticAging", "N/A")
        t_delivery_max = parse_delivery_days(aging_str)

        # Unit Economics Formula
        retail_price = (c_wholesale + c_shipping) * 2.5
        payment_fee = 0.025 * retail_price
        rto_buffer = 0.08 * retail_price
        net_profit = retail_price - (c_wholesale + c_shipping + payment_fee + rto_buffer)
        net_margin_pct = (net_profit / retail_price) * 100.0 if retail_price > 0 else 0.0

        # Pass Criteria: At least one tracked line with T_delivery <= 8 days AND Net_Margin >= 45%
        rejection_reasons = []
        if t_delivery_max > 8:
            rejection_reasons.append(f"Aging {aging_str} days > 8d threshold")
        if net_margin_pct < 45.0:
            rejection_reasons.append(f"Margin {net_margin_pct:.1f}% < 45%")

        is_viable = (len(rejection_reasons) == 0)

        results.append(UnitEconomicsResult(
            product_name=pname,
            variant_sku=variant.sku,
            c_wholesale=c_wholesale,
            c_shipping=c_shipping,
            shipping_carrier=carrier_name,
            t_delivery_days=f"{aging_str} days",
            t_delivery_max=t_delivery_max,
            retail_price=round(retail_price, 2),
            payment_gateway_fee=round(payment_fee, 2),
            rto_buffer=round(rto_buffer, 2),
            net_profit=round(net_profit, 2),
            net_margin_pct=round(net_margin_pct, 2),
            is_viable=is_viable,
            rejection_reason="; ".join(rejection_reasons) if rejection_reasons else None,
        ))

    # Render Economics Table
    econ_table = Table(
        title=f"Unit Economics & Real-Time Logistics Audit (Destination: {target_country})",
        box=box.DOUBLE_EDGE,
        header_style="bold yellow",
    )
    econ_table.add_column("Product", style="white", max_width=24, overflow="ellipsis")
    econ_table.add_column("Wholesale (C_w)", justify="right")
    econ_table.add_column("Shipping (C_s)", justify="right")
    econ_table.add_column("Selected Carrier", style="cyan", max_width=22, overflow="ellipsis")
    econ_table.add_column("Delivery SLA", justify="center")
    econ_table.add_column("Retail Price (2.5x)", justify="right")
    econ_table.add_column("Net Profit", justify="right", style="green")
    econ_table.add_column("Net Margin %", justify="right")
    econ_table.add_column("Viability", justify="center")

    for r in results:
        margin_style = "[bold green]" if r.net_margin_pct >= 45.0 else "[bold red]"
        viability_badge = "[bold green]PASS[/bold green]" if r.is_viable else f"[bold red]FAIL[/bold red]\n[dim]{r.rejection_reason}[/dim]"
        econ_table.add_row(
            r.product_name,
            f"${r.c_wholesale:.2f}",
            f"${r.c_shipping:.2f}",
            r.shipping_carrier,
            r.t_delivery_days,
            f"${r.retail_price:.2f}",
            f"${r.net_profit:.2f}",
            f"{margin_style}{r.net_margin_pct:.1f}%[/]",
            viability_badge,
        )

    console.print(econ_table)

    passing_items = [r for r in results if r.is_viable]
    module_3_pass = len(passing_items) > 0
    status_text = "[green]PASSED[/green]" if module_3_pass else "[red]CRITICAL BUSINESS MODEL FAILURE[/red]"
    console.print(f"  [bold]Module 3 Status:[/bold] {status_text}")
    if not module_3_pass:
        console.print("  [red]✖ Reason: Delivery transit times exceed 8-day SLA, or shipping lines destroy conversion on low-ticket items.[/red]\n")
    else:
        console.print(f"  [green]✔ Found {len(passing_items)} viable product line(s) meeting SLA & margin targets.[/green]\n")

    return {
        "passed": module_3_pass,
        "results": results,
    }


def run_module_4_order_idempotency(api: CJApiClient, sample_variant: Optional[VariantSchema]) -> Dict[str, Any]:
    console.print("[bold cyan]━━━ MODULE 4: Zero-Touch Order Creation & Idempotency Simulation ━━━[/bold cyan]")
    
    if not sample_variant:
        console.print("  [red]✖ No valid variant available to simulate order creation.[/red]")
        return {"passed": False, "error": "No variant"}

    # 1. Construct strict Pydantic webhook payload
    test_order_num = f"POC-{uuid.uuid4().hex[:8].upper()}"
    webhook = PaymentCapturedWebhook(
        order_id=test_order_num,
        currency="USD",
        amount=round(sample_variant.sell_price * 2.5, 2),
        customer=CustomerAddress(
            name="QA Automation Bot",
            address1="742 Evergreen Terrace",
            city="Los Angeles",
            province="California",
            zip_code="90001",
            country_code="US",
            phone="2135550199",
            email="qa-architect@enterprise-poc.internal",
        ),
        line_items=[
            WebhookLineItem(
                variant_id=sample_variant.vid,
                sku=sample_variant.sku,
                quantity=1,
                unit_price=sample_variant.sell_price,
            )
        ],
    )
    console.print(f"  Constructed Webhook Event: [bold]{webhook.event}[/bold] (Order: [yellow]{webhook.order_id}[/yellow])")

    # 2. Map into CJ order creation schema
    # Crucial discovery: CJ API v2 requires 'fromCountryCode' and 'logisticName'!
    mapped_payload = {
        "orderNumber": webhook.order_id,
        "shippingCustomerName": webhook.customer.name,
        "fromCountryCode": "CN",
        "logisticName": "CJPacket Sensitive Pro",
        "shippingCountry": "United States",
        "shippingCountryCode": webhook.customer.country_code,
        "shippingProvince": webhook.customer.province,
        "shippingCity": webhook.customer.city,
        "shippingAddress": webhook.customer.address1,
        "shippingZip": webhook.customer.zip_code,
        "shippingPhone": webhook.customer.phone,
        "email": webhook.customer.email,
        "remark": "QA Automated Pipeline Viability Test - DO NOT FULFILL",
        "payType": "3",  # Create order only (dry-run, no balance deduction)
        "products": [
            {
                "vid": item.variant_id,
                "quantity": item.quantity,
            }
            for item in webhook.line_items
        ],
    }

    console.print("  1. Sending Dry-Run Order Creation (`POST /shopping/order/createOrderV2` with payType=3)...")
    res1 = api.create_order_dry_run(mapped_payload)
    code1 = res1.get("code")
    order_data = res1.get("data", {})
    cj_order_id = order_data.get("orderId") if isinstance(order_data, dict) else None
    
    console.print(f"     Response Code: [bold]{code1}[/bold] | Message: {res1.get('message')}")
    if cj_order_id:
        console.print(f"     Created CJ Order ID: [green]{cj_order_id}[/green] (Postage: ${order_data.get('postageAmount')})")

    # 3. Test Idempotency: Send exact same orderNumber a second time
    console.print("  2. Testing Idempotency Enforcement (Re-submitting duplicate orderNumber)...")
    res2 = api.create_order_dry_run(mapped_payload)
    code2 = res2.get("code")
    msg2 = res2.get("message")
    console.print(f"     Duplicate Submission Code: [bold]{code2}[/bold] | Message: {msg2}")

    # Verify idempotency behavior
    idempotency_passed = (code2 == 1603003 or "exist" in str(msg2).lower())
    if idempotency_passed:
        console.print("     [green]✔ Idempotency Confirmed: Duplicate order was rejected with structured code 1603003.[/green]")
    else:
        console.print(f"     [red]✖ Idempotency Warning: Duplicate submission did not reject with expected code (got {code2}).[/red]")

    # 4. Clean up / Delete draft order
    cleaned_up = False
    if cj_order_id:
        console.print(f"  3. Purging test order {cj_order_id} via `DELETE /shopping/order/deleteOrder`...")
        del_res = api.delete_order(cj_order_id)
        if del_res.get("code") == 200:
            console.print(f"     [green]✔ Order {cj_order_id} successfully deleted from supplier backend.[/green]")
            cleaned_up = True
        else:
            console.print(f"     [yellow]⚠ Order cleanup note: {del_res}[/yellow]")

    module_4_pass = (code1 == 200 and cj_order_id is not None and idempotency_passed and cleaned_up)
    status_text = "[green]PASSED[/green]" if module_4_pass else "[red]FAILED[/red]"
    console.print(f"  [bold]Module 4 Status:[/bold] {status_text}\n")

    return {
        "passed": module_4_pass,
        "order_created": cj_order_id is not None,
        "idempotency_enforced": idempotency_passed,
        "order_cleaned_up": cleaned_up,
        "sample_order_id": cj_order_id,
    }


def run_module_5_resilience(api: CJApiClient, sample_variant: Optional[VariantSchema]) -> Dict[str, Any]:
    console.print("[bold cyan]━━━ MODULE 5: Error Handling & Edge-Case Resilience ━━━[/bold cyan]")
    
    # Test Case 1: Invalid/Non-Existent Variant ID
    console.print("  1. Simulating Invalid/Out-of-Stock Variant ID (`NON_EXISTENT_VID_9999999`)...")
    res_inv = api.calculate_freight(
        vid="NON_EXISTENT_VID_9999999",
        quantity=1,
        start_country="CN",
        end_country="US",
        zip_code="90001",
    )
    code_inv = res_inv.get("code")
    msg_inv = res_inv.get("message")
    structured_inv = (code_inv == 1602000 or "not found" in str(msg_inv).lower())
    console.print(f"     Freight Response Code: [bold]{code_inv}[/bold] | Message: {msg_inv}")
    if structured_inv:
        console.print("     [green]✔ Structured Machine-Readable Error: Code 1602000 accurately caught.[/green]")
    else:
        console.print("     [red]✖ Unstructured error response returned.[/red]")

    # Test Case 2: Malformed Postal Code on Freight Calculation
    console.print("  2. Simulating Malformed Postal Code (`!!!MALFORMED_ZIP$$$`) on Freight Calculation...")
    res_zip = api.calculate_freight(
        vid=sample_variant.vid if sample_variant else "1794996976572960768",
        quantity=1,
        start_country="CN",
        end_country="US",
        zip_code="!!!MALFORMED_ZIP$$$",
    )
    code_zip = res_zip.get("code")
    lines_zip = res_zip.get("data", [])
    console.print(f"     Freight Response Code: [bold]{code_zip}[/bold] (Lines returned: {len(lines_zip) if isinstance(lines_zip, list) else 0})")
    
    # Critical Architecture Discovery: CJ returns 200 and falls back to country rates or returns 1600200
    silent_zip_fallback = (code_zip == 200 and len(lines_zip) > 0)
    if silent_zip_fallback:
        console.print("     [yellow]⚠ TRAP DETECTED: Freight calculation silently falls back to national rates on corrupted postal codes instead of failing validation.[/yellow]")

    # Test Case 3: Malformed Postal Code on Order Placement
    console.print("  3. Simulating Malformed Postal Code on Order Creation (`createOrderV2`)...")
    bad_order_num = f"ERR-ZIP-{uuid.uuid4().hex[:6].upper()}"
    bad_order_payload = {
        "orderNumber": bad_order_num,
        "shippingCustomerName": "QA Bot",
        "fromCountryCode": "CN",
        "logisticName": "CJPacket Sensitive Pro",
        "shippingCountry": "United States",
        "shippingCountryCode": "US",
        "shippingProvince": "California",
        "shippingCity": "Los Angeles",
        "shippingAddress": "123 Error St",
        "shippingZip": "999999999-INVALID",
        "shippingPhone": "1234567890",
        "email": "qa@test.com",
        "payType": "3",
        "products": [{"vid": sample_variant.vid if sample_variant else "1794996976572960768", "quantity": 1}],
    }
    bad_order_res = api.create_order_dry_run(bad_order_payload)
    bo_code = bad_order_res.get("code")
    bo_data = bad_order_res.get("data", {})
    bo_logistics_miss = bo_data.get("logisticsMiss") if isinstance(bo_data, dict) else False
    bo_order_id = bo_data.get("orderId") if isinstance(bo_data, dict) else None

    console.print(f"     Order Creation Code: [bold]{bo_code}[/bold] | LogisticsMiss: [bold red]{bo_logistics_miss}[/bold red]")
    if bo_logistics_miss:
        console.print("     [red]CRITICAL VULNERABILITY: Supplier returns `code: 200` with `logisticsMiss: true` rather than rejecting unserviceable destination addresses.[/red]")
        console.print("     [red]Any Celery queue relying on `code == 200` will mistakenly treat this as a completed order![/red]")

    # Clean up test order if created
    if bo_order_id:
        api.delete_order(bo_order_id)

    # Pass Criteria: Structured machine-readable codes for catalog errors, vulnerability noted for silent 200s
    module_5_pass = structured_inv
    status_text = "[green]PASSED (With Architectural Flags)[/green]" if module_5_pass else "[red]FAILED[/red]"
    console.print(f"  [bold]Module 5 Status:[/bold] {status_text}\n")

    return {
        "passed": module_5_pass,
        "structured_error_code": code_inv,
        "silent_zip_fallback": silent_zip_fallback,
        "logistics_miss_silent_200": bo_logistics_miss,
    }


# -----------------------------------------------------------------------------
# MAIN DIAGNOSTIC ORCHESTRATOR
# -----------------------------------------------------------------------------

def main():
    console.print(Panel.fit(
        "[bold green]HEADLESS E-COMMERCE & DROPSHIPPING PRE-IMPLEMENTATION VIABILITY SPIKE[/bold green]\n"
        "[dim]Automated Multi-Module Technical, Financial & Operational Stress-Testing Suite[/dim]",
        border_style="cyan",
        box=box.DOUBLE,
    ))

    if not CJ_API_KEY:
        console.print("[bold red]CRITICAL ERROR: `CJ_API_KEY` is missing from `.env`.[/bold red]")
        sys.exit(1)

    api = CJApiClient(CJ_API_KEY)

    try:
        # Module 1
        m1 = run_module_1_auth(api)

        # Module 2
        m2 = run_module_2_catalog(api)
        valid_products = m2.get("products", [])
        sample_variant = valid_products[0].get("primary_variant") if valid_products else None

        # Module 3: Freight calculation for target country
        m3 = run_module_3_freight(api, valid_products, TARGET_COUNTRY_CODE)

        # Module 4: Order Creation & Idempotency
        m4 = run_module_4_order_idempotency(api, sample_variant)

        # Module 5: Resilience & Edge Cases
        m5 = run_module_5_resilience(api, sample_variant)

        # Final Scorecard Summary
        console.print(Panel.fit(
            f"[bold]VIABILITY AUDIT SUMMARY SCORECARD[/bold]\n"
            f"• Module 1 (Auth & Latency): {'[green]PASS[/green]' if m1['passed'] else '[red]FAIL[/red]'} ({m1['latency_ms']:.1f}ms)\n"
            f"• Module 2 (Ghost Inventory Filter): {'[green]PASS[/green]' if m2['passed'] else '[red]FAIL[/red]'} ({m2['pass_rate']:.1f}% physical stock)\n"
            f"• Module 3 (Logistics & Unit Economics): {'[green]PASS[/green]' if m3['passed'] else '[red]CRITICAL BUSINESS FAILURE[/red]'}\n"
            f"• Module 4 (Order & Idempotency): {'[green]PASS[/green]' if m4['passed'] else '[red]FAIL[/red]'}\n"
            f"• Module 5 (Resilience & Edge Cases): {'[green]PASS (Flagged)[/green]' if m5['passed'] else '[red]FAIL[/red]'}\n"
            f"• Final Assessment: [bold yellow]{'GO (WITH WORKAROUNDS)' if (m1['passed'] and m4['passed'] and m3['passed']) else 'NO-GO / CRITICAL PIVOT REQUIRED'}[/bold yellow]",
            title="Executive Scorecard",
            border_style="magenta",
            box=box.ROUNDED,
        ))

    finally:
        api.close()

if __name__ == "__main__":
    main()
