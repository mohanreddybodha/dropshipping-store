"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ArrowRight,
  Package,
  Truck,
  MapPin,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface ConfirmedOrderItem {
  product: {
    id?: string | number;
    title: string;
    hero_image_url?: string;
    images?: string[];
  };
  quantity: number;
  unitPrice: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface ConfirmedOrder {
  orderNumber: string;
  amount: number;
  shippingSla: string;
  items?: ConfirmedOrderItem[];
  paymentMethod?: string;
}

interface DeliveryForm {
  name: string;
  email: string;
  phoneCode?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip_code: string;
  country_code?: string;
}

interface OrderCelebrationProps {
  confirmedOrder: ConfirmedOrder;
  form: DeliveryForm;
}

export default function OrderCelebration({ confirmedOrder, form }: OrderCelebrationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyOrderNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(confirmedOrder.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadInvoice = () => {
    const formattedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const itemsRows = (confirmedOrder.items || [])
      .map((item) => {
        const title = item.product?.title || "Domestic Direct Item";
        const size = item.selectedSize ? ` (Size: ${item.selectedSize})` : "";
        const qty = item.quantity || 1;
        const price = Number(item.unitPrice || 0).toFixed(2);
        const lineTotal = (Number(item.unitPrice || 0) * qty).toFixed(2);
        return `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
              <strong style="color: #0f172a;">${title}</strong>${size ? `<br><span style="font-size: 11px; color: #64748b;">${size}</span>` : ""}
            </td>
            <td style="padding: 12px 0; text-align: center; border-bottom: 1px solid #f1f5f9; color: #334155;">${qty}</td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #f1f5f9; color: #334155;">$${price}</td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0f172a;">$${lineTotal}</td>
          </tr>
        `;
      })
      .join("");

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice - ${confirmedOrder.orderNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 32px 20px; color: #1e293b; max-width: 680px; margin: 0 auto; background: #fff; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .invoice-title { font-size: 14px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
    .meta-line { font-size: 12px; color: #475569; margin-top: 3px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .box-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
    .box-text { font-size: 12px; color: #1e293b; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 8px 0; border-bottom: 1px solid #cbd5e1; }
    .total-row td { font-weight: 800; font-size: 15px; border-top: 2px solid #0f172a; padding-top: 12px; color: #0f172a; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Domestic Direct</div>
      <div class="sub">US Domestic Logistics & Distribution Hub</div>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">Official Receipt</div>
      <div class="meta-line">Order: <strong>${confirmedOrder.orderNumber}</strong></div>
      <div class="meta-line">Date: ${formattedDate}</div>
      <div class="meta-line">Payment Method: <strong>${confirmedOrder.paymentMethod || "Credit / Debit Card"}</strong></div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Shipping Destination</div>
      <div class="box-text">
        <strong>${form.name || "Customer"}</strong><br>
        ${form.address1}${form.address2 ? ` Apt ${form.address2}` : ""}<br>
        ${form.city}, ${form.province} ${form.zip_code}, United States
      </div>
    </div>
    <div class="box">
      <div class="box-title">Carrier & Delivery</div>
      <div class="box-text">
        <strong>USPS Priority Domestic</strong><br>
        Transit SLA: 3–5 Business Days<br>
        Tracking Status: Electronic Notification Received
      </div>
    </div>
  </div>

  <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #0f172a;">Items in Package</div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      <tr>
        <td colspan="3" style="text-align: right; padding-top: 14px; font-size: 12px; color: #64748b;">Shipping (USPS Ground):</td>
        <td style="text-align: right; padding-top: 14px; font-size: 12px; color: #059669; font-weight: 700;">FREE</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;">Total Paid:</td>
        <td style="text-align: right; color: #059669;">$${confirmedOrder.amount.toFixed(2)} USD</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Domestic Direct • Automated Logistics Pipeline • Inquiries: support@domesticdirect.com
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice-${confirmedOrder.orderNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalItemsCount =
    confirmedOrder.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;

  return (
    <div className="max-w-xl mx-auto px-4 py-10 sm:py-14 text-center space-y-6">
      {/* ── MINIMAL ANIMATED SUCCESS CHECKMARK ── */}
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-600 flex items-center justify-center shadow-xs">
        <svg
          className="w-8 h-8 text-emerald-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline
            points="20 6 9 17 4 12"
            className="animate-[strokeDraw_0.4s_ease-out_forwards]"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: 0,
            }}
          />
        </svg>
      </div>

      {/* ── CLEAN HEADER COPY ── */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
          <Check className="w-3 h-3 text-emerald-600" />
          Order Confirmed
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Thank you for your order
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          We’ve received your order and queued it for immediate domestic dispatch. A confirmation summary is stored in your account.
        </p>
      </div>

      {/* ── SLEEK FULFILLMENT TIMELINE ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-left shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
          <span>Fulfillment Progress</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Packaging in Progress
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Step 1 */}
          <div className="text-center space-y-1">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-[10px] font-bold">
              ✓
            </div>
            <div className="text-[11px] font-bold text-slate-900">Placed</div>
            <div className="text-[10px] text-slate-400">Captured</div>
          </div>

          {/* Step 2 */}
          <div className="text-center space-y-1">
            <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto text-[10px] font-bold">
              <Package className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-[11px] font-bold text-emerald-800">Processing</div>
            <div className="text-[10px] text-slate-400">US Hub</div>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-1">
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-[10px] font-medium">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11px] font-medium text-slate-500">Dispatched</div>
            <div className="text-[10px] text-slate-400">USPS</div>
          </div>

          {/* Step 4 */}
          <div className="text-center space-y-1">
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-[10px] font-medium">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11px] font-medium text-slate-500">Delivery</div>
            <div className="text-[10px] text-slate-400">3–5 Days</div>
          </div>
        </div>
      </div>

      {/* ── ORDER SUMMARY CARD ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 text-left shadow-2xs space-y-4">
        {/* Order Header Info */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Order Reference
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-sm font-black text-slate-900">
                {confirmedOrder.orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Amount
            </span>
            <div className="text-base font-black text-slate-900 mt-0.5">
              ${confirmedOrder.amount.toFixed(2)} USD
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 border-b border-slate-100 pb-3">
          <div>
            <span className="text-slate-400 block text-[11px]">Payment Method:</span>
            <span className="font-bold text-slate-800">PayPal</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Carrier & Service:</span>
            <span className="font-bold text-slate-800">USPS Priority Domestic</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 block text-[11px]">Shipping To:</span>
            <span className="font-semibold text-slate-800">
              {form.name ? `${form.name} — ` : ""}
              {form.address1}
              {form.address2 ? ` Apt ${form.address2},` : ","} {form.city}, {form.province}{" "}
              {form.zip_code}, United States
            </span>
          </div>
        </div>

        {/* Items List */}
        {confirmedOrder.items && confirmedOrder.items.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Items ({totalItemsCount})</span>
              <span>Subtotal</span>
            </div>
            <div className="divide-y divide-slate-100">
              {confirmedOrder.items.map((item, idx) => {
                const heroImg =
                  item.product.hero_image_url ||
                  item.product.images?.[0] ||
                  "/placeholder.jpg";
                return (
                  <div key={idx} className="py-2.5 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImg}
                      alt={item.product.title}
                      className="w-11 h-11 object-contain rounded-lg border border-slate-200 p-0.5 bg-slate-50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.product.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {item.selectedSize && (
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                            Size: {item.selectedSize}
                          </span>
                        )}
                        <span>Qty: {item.quantity || 1}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      ${(Number(item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 30-MINUTE CORRECTION WINDOW ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-600" />
          <span>Address Adjustment Window</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Automated packaging begins shortly. If you made any typo in your address, contact customer support within 30 minutes to adjust your parcel details before carrier collection.
        </p>
      </div>

      {/* ── PRODUCTION CTAS ── */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/profile"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-sm active:scale-98"
          >
            <span>Track Order Status</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={handleDownloadInvoice}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs sm:text-sm transition shadow-2xs active:scale-98"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download Invoice</span>
          </button>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
