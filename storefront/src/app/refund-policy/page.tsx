import React from "react";
import { RotateCcw, AlertTriangle, Mail, ShieldAlert } from "lucide-react";
import NavigationBackButton from "../../components/ui/NavigationBackButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Return Policy | Vastire",
  description: "7-day return policy for defective, damaged, or mismatched items. 30-minute post-checkout order cancellation window.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-20 md:pb-10">
      <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5">
          <NavigationBackButton label="Back" className="mb-3" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Refund & Return Policy
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm sm:text-base text-slate-600 leading-relaxed">
          {/* Key Policy Banner */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 not-prose flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm sm:text-base text-amber-900">7-Day Defective or Mismatched Item Return Policy</p>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                Returns and refunds are provided exclusively for items that arrive defective, damaged in transit, or mismatched from your order. Notice must be submitted within 7 calendar days of confirmed carrier delivery with photo evidence. We do not accept returns or refunds for buyer remorse, change of mind, or customer sizing/selection mistakes.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Strict Return Eligibility</h2>
            <p>To qualify for a replacement or refund, items must strictly meet the following conditions:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The item must have arrived with a <strong>verified manufacturing defect</strong>, <strong>carrier transit damage</strong>, or be an <strong>incorrect/mismatched item</strong> differing from what you purchased.</li>
              <li>Your return or replacement claim must be initiated via email within <strong>7 calendar days</strong> of the confirmed delivery date recorded by carrier tracking.</li>
              <li>You must provide clear photos or a short video demonstrating the defect or damage, along with a photo of the original shipping label on the package.</li>
              <li>All claims are subject to inspection and verification under our supplier fulfillment claims protocol (CJ Dropshipping warehouse review). Once accepted by the fulfillment partner, an immediate replacement or full refund is issued.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Ineligible Returns & Non-Refundable Situations</h2>
            </div>
            <p>
              Due to automated fulfillment through domestic US distribution centers, we cannot accept returns, provide exchanges, or issue refunds for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Customer Sizing & Variant Selection Mistakes:</strong> Ordering the wrong size, color, dimension, or model variation. Please review sizing specifications and product dimensions carefully before checkout.</li>
              <li><strong>Change of Mind & Buyer Remorse:</strong> Situations where a customer decides they no longer want or need the product after it has dispatched.</li>
              <li><strong>Subjective Dissatisfaction:</strong> General dissatisfaction where the product functions as described and matches listed specifications.</li>
              <li><strong>Customer Mishandling:</strong> Items damaged through misuse, improper assembly, unauthorized alteration, or normal wear and tear.</li>
              <li><strong>Claims Past 7 Days:</strong> Defect or damage reports received after 7 calendar days from confirmed delivery.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">3. 30-Minute Order Cancellation Grace Window</h2>
            <p>
              We provide an automated <strong>30-minute cancellation grace window</strong> immediately following checkout:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>During the first 30 minutes post-purchase, you can cancel your order directly from the Orders tab or by emailing <strong>support@vastire.com</strong> for an instant 100% refund.</li>
              <li>After 30 minutes, orders are electronically locked and routed to warehouse fulfillment for picking, labeling, and domestic carrier dispatch. Once locked, orders cannot be canceled or modified in transit.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">4. How to Submit a Defect or Damage Claim</h2>
            <p>
              If your parcel arrived damaged or contains a defective or wrong item, please follow this resolution procedure:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Take 1–2 clear photos or a short video showing the defect, transit damage, or incorrect product received.</li>
              <li>Take a clear photo of the shipping label on the delivery parcel showing the tracking number.</li>
              <li>Email <strong>support@vastire.com</strong> with your order number (e.g., <code>VAST-XXXXX</code>) and the photos within 7 calendar days of delivery.</li>
              <li>Our claims resolution desk coordinates directly with the supplier fulfillment team to verify the claim. Upon approval, a replacement is dispatched at zero cost, or a full refund is processed.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">5. Refund Processing Times & Method</h2>
            <p>
              Upon supplier verification and claim approval:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>PayPal:</strong> Refunds are credited directly to your PayPal account balance or funding instrument within 1–2 business days.
              </li>
              <li>
                <strong>Debit / Credit Cards:</strong> Returned to the original card within 3 to 5 business days, subject to your card issuer’s processing schedule.
              </li>
              <li>
                <strong>Zero Restocking Fees:</strong> We do not charge restocking fees on authorized defect replacements or approved refunds.
              </li>
            </ul>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">6. Contact Support</h2>
            <p>
              For claim inquiries or assistance with a delivery, please reach out to our customer care desk:
            </p>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Mail className="w-4 h-4 text-emerald-600" />
              <a href="mailto:support@vastire.com" className="text-emerald-700 hover:underline">
                support@vastire.com
              </a>
            </div>
            <p className="text-xs text-slate-500">
              Vastire Customer Care • Average response time: Under 12 business hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
