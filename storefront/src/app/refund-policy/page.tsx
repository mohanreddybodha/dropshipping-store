import React from "react";
import { RotateCcw, CheckCircle2, Mail } from "lucide-react";
import NavigationBackButton from "../../components/ui/NavigationBackButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Return Policy | Vastire",
  description: "30-day money-back guarantee, hassle-free returns, and immediate damaged item replacements.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-20 md:pb-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8 space-y-6 sm:space-y-8">
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
          {/* Key Guarantee Banner */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 not-prose flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm sm:text-base text-emerald-900">30-Day Customer Satisfaction Guarantee</p>
              <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                If your item arrives defective, damaged, or significantly not as described, you have 30 calendar days from confirmed delivery to request an immediate free replacement or a 100% refund.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Eligibility for Returns & Refunds</h2>
            <p>To be eligible for a refund or replacement under our 30-Day Guarantee:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your return request must be initiated within <strong>30 calendar days</strong> of confirmed carrier delivery.</li>
              <li>The item must be in its original condition, including all original packaging, cords, manuals, and accessories.</li>
              <li>You must provide your Vastire order number and proof of purchase (the email address used at checkout).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Damaged or Defective Items on Arrival</h2>
            <p>
              We take great pride in domestic quality control. In the unlikely event that your parcel suffers carrier mishandling or manufacturing defect:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                Take 1–2 clear photos or a short video demonstrating the defect or damaged shipping box.
              </li>
              <li>
                Email us at <strong>support@vastire.com</strong> with your order number (e.g., <code>VAST-XXXXX</code>) and the photos.
              </li>
              <li>
                Our resolution team will review within 24 business hours. For verified transit damage or defects, <strong>you do not have to pay return shipping</strong>; we will immediately dispatch a priority replacement or issue a full refund to your original payment method.
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">3. Non-Returnable Items</h2>
            <p>Certain types of goods are exempt from being returned due to hygiene and safety regulations:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Personal hygiene or intimate products once the manufacturer seal is broken.</li>
              <li>Items showing evident signs of customer misuse, unauthorized disassembly, or intentional damage.</li>
              <li>Gift cards or downloadable digital content.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">4. Refund Processing Times & Method</h2>
            <p>
              Once your refund is approved:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>PayPal:</strong> Funds are returned to your PayPal account balance or funded card within 1–2 business days.
              </li>
              <li>
                <strong>Credit / Debit Cards:</strong> Depending on your card issuer or bank, credit card refunds typically post within 3 to 5 business days.
              </li>
              <li>
                <strong>Zero Restocking Fees:</strong> We do not charge restocking or administrative fees on authorized returns.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">5. 30-Minute Order Cancellation Window</h2>
            <p>
              Orders are submitted automatically to our domestic fulfillment hubs for packing. You may cancel your order with a 100% full refund directly from the Orders tab within <strong>30 minutes</strong> of placement. After 30 minutes, once order picking begins, please wait for delivery and initiate a standard 30-day return.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">6. Contact Support</h2>
            <p>
              To initiate a return or request assistance with an active order, please contact our support desk:
            </p>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Mail className="w-4 h-4 text-emerald-600" />
              <a href="mailto:support@vastire.com" className="text-emerald-700 hover:underline">
                support@vastire.com
              </a>
            </div>
            <p className="text-xs text-slate-500">
              Vastire Customer Care • Average response time: Under 12 business hours (24-hour SLA guarantee).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
