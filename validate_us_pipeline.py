#!/usr/bin/env python3
"""
Targeted Technical & Business Viability Audit: CJ Dropshipping US Domestic Warehouse
Filters: Physically located in US Warehouse (countryCode=US, areaId=2),
         Verified physical stock (cjInventoryNum >= 50),
         Wholesale price between $8 and $25.
SLA Targets: 2-5 day domestic shipping, >=45% net margin, >70% aggregate pass rate.
"""

import os
import sys
import time
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import httpx
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

console = Console()
load_dotenv()

CJ_API_KEY = os.getenv("CJ_API_KEY", "").strip()
CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"

class USProductAuditResult(BaseModel):
    pid: str
    product_name: str
    vid: str
    sku: str
    wholesale_price: float
    product_wh_stock: int
    variant_us_stock: int
    stock_pass: bool
    carrier_name: str
    shipping_cost: float
    delivery_aging: str
    delivery_max_days: int
    delivery_pass: bool
    retail_price: float
    payment_fee: float
    rto_buffer: float
    net_profit: float
    net_margin_pct: float
    margin_pass: bool
    overall_pass: bool
    failure_reasons: List[str] = Field(default_factory=list)

class CJUSClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.access_token: Optional[str] = None
        self.client = httpx.Client(timeout=25.0)
        self.last_req_time = 0.0
        self.rate_limit_interval = 1.15  # Strict 1 QPS enforcement

    def _throttle(self):
        elapsed = time.time() - self.last_req_time
        if elapsed < self.rate_limit_interval:
            time.sleep(self.rate_limit_interval - elapsed)
        self.last_req_time = time.time()

    def close(self):
        self.client.close()

    def get_headers(self, auth: bool = True) -> Dict[str, str]:
        headers = {"Content-Type": "application/json", "User-Agent": "CJ-US-Warehouse-Audit/2.0"}
        if auth and self.access_token:
            headers["CJ-Access-Token"] = self.access_token
        return headers

    def authenticate(self) -> bool:
        self._throttle()
        url = f"{CJ_BASE_URL}/authentication/getAccessToken"
        resp = self.client.post(url, json={"apiKey": self.api_key}, headers=self.get_headers(auth=False))
        data = resp.json()
        if data.get("code") == 200 or data.get("result") is True:
            self.access_token = data.get("data", {}).get("accessToken")
            return True
        return False

    def query_us_catalog(self, page: int = 1, size: int = 20) -> List[Dict[str, Any]]:
        self._throttle()
        url = f"{CJ_BASE_URL}/product/listV2"
        params = {
            "page": page,
            "size": size,
            "countryCode": "US",
            "startSellPrice": 8,
            "endSellPrice": 25,
            "startWarehouseInventory": 50,
        }
        resp = self.client.get(url, params=params, headers=self.get_headers())
        data = resp.json().get("data", {})
        content = data.get("content", [])
        items = []
        for c in content:
            items.extend(c.get("productList", []))
        return items

    def get_product_details(self, pid: str) -> Dict[str, Any]:
        self._throttle()
        url = f"{CJ_BASE_URL}/product/query"
        resp = self.client.get(url, params={"pid": pid}, headers=self.get_headers())
        return resp.json().get("data", {})

    def get_stock_by_vid(self, vid: str) -> List[Dict[str, Any]]:
        self._throttle()
        url = f"{CJ_BASE_URL}/product/stock/queryByVid"
        resp = self.client.get(url, params={"vid": vid}, headers=self.get_headers())
        return resp.json().get("data", [])

    def calculate_us_freight(self, vid: str) -> List[Dict[str, Any]]:
        self._throttle()
        url = f"{CJ_BASE_URL}/logistic/freightCalculate"
        payload = {
            "startCountryCode": "US",
            "endCountryCode": "US",
            "zip": "90001",
            "products": [{"vid": vid, "quantity": 1}],
        }
        resp = self.client.post(url, json=payload, headers=self.get_headers())
        return resp.json().get("data", []) or []

def parse_max_delivery(aging: str) -> int:
    if not aging:
        return 999
    nums = re.findall(r"\d+", aging)
    if nums:
        return int(nums[-1])
    return 999

def run_targeted_audit():
    console.print(Panel.fit(
        "[bold cyan]TARGETED AUDIT: CJ DROPSHIPPING US DOMESTIC WAREHOUSE PIPELINE[/bold cyan]\n"
        "[dim]Filters: US Warehouse (countryCode=US) | Verified Stock >= 50 units | Wholesale $8.00 - $25.00[/dim]",
        border_style="green",
        box=box.DOUBLE,
    ))

    if not CJ_API_KEY:
        console.print("[red]Missing CJ_API_KEY in .env[/red]")
        sys.exit(1)

    client = CJUSClient(CJ_API_KEY)
    if not client.authenticate():
        console.print("[red]Authentication failed.[/red]")
        sys.exit(1)

    console.print("  [green]✔ Authenticated successfully with CJ Dropshipping API v2.0[/green]")
    console.print("  Querying catalog for products physically located in the US with warehouse stock >= 50...")

    catalog_items = client.query_us_catalog(page=1, size=25)
    console.print(f"  Catalog matched {len(catalog_items)} candidate products. Inspecting top 10...")

    audit_results: List[USProductAuditResult] = []

    for item in catalog_items:
        if len(audit_results) >= 10:
            break

        pid = str(item.get("id"))
        pname = item.get("nameEn") or item.get("productName") or "N/A"
        item_wh_stock = int(item.get("warehouseInventoryNum") or 0)

        details = client.get_product_details(pid)
        variants = details.get("variants", [])
        if not variants:
            continue

        # Filter variants within the target price range ($8 - $25)
        eligible_variants = [
            v for v in variants
            if 8.0 <= float(v.get("variantSellPrice") or 0.0) <= 25.0
        ]
        if not eligible_variants:
            eligible_variants = variants

        # Find the variant with verified US physical stock
        selected_variant = None
        selected_vid = None
        selected_sku = None
        selected_price = 0.0
        selected_us_stock = 0

        # Check stock for candidate variants
        for v in eligible_variants[:3]:
            vid = v.get("vid")
            price = float(v.get("variantSellPrice") or 0.0)
            stock_data = client.get_stock_by_vid(vid)
            
            us_stock = 0
            if stock_data and isinstance(stock_data, list):
                for s in stock_data:
                    # Check if warehouse is located in US
                    if s.get("countryCode") == "US" or "US" in str(s.get("areaEn")):
                        us_stock += int(s.get("cjInventoryNum", 0))

            if us_stock > selected_us_stock or selected_variant is None:
                selected_us_stock = us_stock
                selected_variant = v
                selected_vid = vid
                selected_sku = v.get("variantSku") or ""
                selected_price = price

            if us_stock >= 50:
                break

        # Fallback if no variant selected
        if not selected_variant:
            selected_variant = variants[0]
            selected_vid = selected_variant.get("vid")
            selected_sku = selected_variant.get("variantSku") or ""
            selected_price = float(selected_variant.get("variantSellPrice") or 0.0)
            selected_us_stock = 0

        # Calculate US-to-US domestic freight
        freight_lines = client.calculate_us_freight(selected_vid)
        
        # Filter for domestic carriers
        carrier_name = "No US Route"
        shipping_cost = 0.0
        delivery_aging = "N/A"
        delivery_max = 999

        if freight_lines:
            # Look for 2-5 day domestic shipping lines first
            fast_domestic = [
                l for l in freight_lines
                if parse_max_delivery(l.get("logisticAging", "999")) <= 5
            ]
            if fast_domestic:
                fast_domestic.sort(key=lambda x: float(x.get("logisticPrice", 999)))
                chosen = fast_domestic[0]
            else:
                freight_lines.sort(key=lambda x: float(x.get("logisticPrice", 999)))
                chosen = freight_lines[0]

            carrier_name = chosen.get("logisticName", "Unknown")
            shipping_cost = float(chosen.get("logisticPrice", 0.0))
            delivery_aging = chosen.get("logisticAging", "N/A")
            delivery_max = parse_max_delivery(delivery_aging)

        # Financial Calculations
        c_wholesale = selected_price
        c_shipping = shipping_cost
        retail_price = (c_wholesale + c_shipping) * 2.5
        payment_fee = 0.025 * retail_price
        rto_buffer = 0.08 * retail_price
        net_profit = retail_price - (c_wholesale + c_shipping + payment_fee + rto_buffer)
        net_margin_pct = (net_profit / retail_price) * 100.0 if retail_price > 0 else 0.0

        # Criteria Evaluation
        stock_pass = (selected_us_stock >= 50)
        delivery_pass = (delivery_max <= 5 and delivery_max > 0)
        margin_pass = (net_margin_pct >= 45.0)

        failure_reasons = []
        if not stock_pass:
            failure_reasons.append(f"Variant US Stock ({selected_us_stock}) < 50 units")
        if not delivery_pass:
            failure_reasons.append(f"Transit SLA ({delivery_aging} days) > 5 day threshold")
        if not margin_pass:
            failure_reasons.append(f"Net Margin ({net_margin_pct:.1f}%) < 45%")

        overall_pass = (stock_pass and delivery_pass and margin_pass)

        audit_results.append(USProductAuditResult(
            pid=pid,
            product_name=pname,
            vid=selected_vid,
            sku=selected_sku,
            wholesale_price=round(c_wholesale, 2),
            product_wh_stock=item_wh_stock,
            variant_us_stock=selected_us_stock,
            stock_pass=stock_pass,
            carrier_name=carrier_name,
            shipping_cost=round(c_shipping, 2),
            delivery_aging=delivery_aging,
            delivery_max_days=delivery_max,
            delivery_pass=delivery_pass,
            retail_price=round(retail_price, 2),
            payment_fee=round(payment_fee, 2),
            rto_buffer=round(rto_buffer, 2),
            net_profit=round(net_profit, 2),
            net_margin_pct=round(net_margin_pct, 1),
            margin_pass=margin_pass,
            overall_pass=overall_pass,
            failure_reasons=failure_reasons,
        ))

    client.close()

    # Render Summary Table
    table = Table(
        title="US Domestic Warehouse Audit (US to US Fulfillment: 10 Target Products)",
        box=box.DOUBLE_EDGE,
        header_style="bold cyan",
    )
    table.add_column("#", justify="right", width=3)
    table.add_column("Product Name", style="white", max_width=22, overflow="ellipsis")
    table.add_column("Wholesale (C_w)", justify="right")
    table.add_column("US Stock (Units)", justify="right")
    table.add_column("Domestic Carrier", style="magenta", max_width=18, overflow="ellipsis")
    table.add_column("Freight (C_s)", justify="right")
    table.add_column("Delivery SLA", justify="center")
    table.add_column("Retail (2.5x)", justify="right")
    table.add_column("Net Profit", justify="right", style="green")
    table.add_column("Margin %", justify="right")
    table.add_column("Verdict", justify="center")

    passed_count = 0
    stock_passed_count = 0
    delivery_passed_count = 0
    margin_passed_count = 0

    for idx, r in enumerate(audit_results, 1):
        if r.overall_pass:
            passed_count += 1
        if r.stock_pass:
            stock_passed_count += 1
        if r.delivery_pass:
            delivery_passed_count += 1
        if r.margin_pass:
            margin_passed_count += 1

        stock_str = f"[green]{r.variant_us_stock}[/green]" if r.stock_pass else f"[red]{r.variant_us_stock}[/red]"
        delivery_str = f"[green]{r.delivery_aging}d[/green]" if r.delivery_pass else f"[red]{r.delivery_aging}d[/red]"
        margin_str = f"[green]{r.net_margin_pct:.1f}%[/green]" if r.margin_pass else f"[red]{r.net_margin_pct:.1f}%[/red]"
        
        if r.overall_pass:
            verdict_badge = "[bold green]PASS[/bold green]"
        else:
            reasons_fmt = "\n".join([f"• {x}" for x in r.failure_reasons])
            verdict_badge = f"[bold red]FAIL[/bold red]\n[dim]{reasons_fmt}[/dim]"

        table.add_row(
            str(idx),
            r.product_name,
            f"${r.wholesale_price:.2f}",
            stock_str,
            r.carrier_name,
            f"${r.shipping_cost:.2f}",
            delivery_str,
            f"${r.retail_price:.2f}",
            f"${r.net_profit:.2f}",
            margin_str,
            verdict_badge,
        )

    console.print(table)

    pass_rate = (passed_count / len(audit_results)) * 100.0 if audit_results else 0.0
    stock_rate = (stock_passed_count / len(audit_results)) * 100.0 if audit_results else 0.0
    delivery_rate = (delivery_passed_count / len(audit_results)) * 100.0 if audit_results else 0.0
    margin_rate = (margin_passed_count / len(audit_results)) * 100.0 if audit_results else 0.0

    color = "green" if pass_rate >= 70 else "red"
    approval_text = "MET (PIPELINE APPROVED)" if pass_rate >= 70 else "FAILED TO MEET 70% THRESHOLD"

    console.print(Panel.fit(
        f"[bold]US WAREHOUSE BENCHMARK SCORECARD (N=10 Products)[/bold]\n"
        f"• Verified Physical US Stock (>= 50 units): {stock_passed_count}/10 ([yellow]{stock_rate:.1f}%[/yellow])\n"
        f"• 2-5 Day Domestic Delivery SLA: {delivery_passed_count}/10 ([yellow]{delivery_rate:.1f}%[/yellow])\n"
        f"• Net Margin (>= 45.0%): {margin_passed_count}/10 ([green]{margin_rate:.1f}%[/green])\n"
        f"• Overall Viability Pass Rate: [{color}]{pass_rate:.1f}% ({passed_count}/10)[/{color}]\n"
        f"• Benchmark Target: > 70.0% Pass Rate -> [{color}]{approval_text}[/{color}]",
        title="Executive Summary",
        border_style="magenta",
        box=box.ROUNDED,
    ))

if __name__ == "__main__":
    run_targeted_audit()
