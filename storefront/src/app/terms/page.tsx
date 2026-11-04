import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft, Mail, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Vastire",
  description: "Read the Vastire Terms of Service governing purchases, order acceptance, pricing, and warranties.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-100 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
              <p className="text-xs text-slate-500">Effective Date: October 26, 2026 • Last Updated: November 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Agreement to Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you
              (&ldquo;Customer,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and Vastire (&ldquo;Company,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), governing your access to and use of{" "}
              <strong>vastire.com</strong> and any orders placed through the website.
            </p>
            <p>
              By accessing our site, registering an account, or placing an order, you agree to be bound by these Terms and
              our Privacy Policy. If you do not agree, do not use our service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Eligibility & Geographic Restrictions</h2>
            <p>
              You must be at least 18 years old or the age of legal majority in your jurisdiction to place an order.
            </p>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs flex items-start gap-2.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>United States Only:</strong> We strictly sell and ship to physical addresses located within the fifty (50) United States, the District of Columbia, and verified APO/FPO military addresses. We do not support international shipments or forwarding addresses.
              </span>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Orders, Pricing, and Payment Acceptance</h2>
            <p>
              All prices displayed on vastire.com are listed in United States Dollars ($ USD). While we strive for absolute accuracy, pricing or typographical errors may occasionally occur.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Order Acceptance:</strong> Receipt of an electronic order confirmation does not constitute our acceptance of an order or an offer to sell. We reserve the right at any time after receipt of your order to accept, decline, or limit order quantities for any legitimate commercial reason.
              </li>
              <li>
                <strong>Authoritative Totals:</strong> All purchase totals, multi-pack bundle discounts, and applicable taxes are calculated and verified authoritatively by our server-side order systems prior to payment processing.
              </li>
              <li>
                <strong>Payment Authorization:</strong> You agree to provide current, complete, and accurate purchase and payment information for all orders. Payment is captured immediately upon order authorization via PayPal or supported debit/credit card processors.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Order Cancellation Window</h2>
            <p>
              Because our order fulfillment pipeline operates autonomously to dispatch parcels quickly from domestic warehouses, orders are transmitted for packing within a short grace period. You may cancel your order via our online self-service portal or by contacting support within <strong>60 minutes</strong> of placement, provided supplier processing has not already begun. Once an order is locked in domestic warehouse fulfillment, it cannot be intercepted and must be handled via our standard return policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Vastire and its directors, officers, employees, suppliers, and service providers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our products or website. In no event shall our total aggregate liability exceed the total purchase price paid for the specific order giving rise to the claim.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">6. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms and your purchase shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms shall be resolved through confidential binding arbitration under the rules of the American Arbitration Association (AAA), or in small claims court if eligible.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-900">7. Customer Service Contact</h2>
            <p>
              For questions regarding these Terms of Service or order assistance, contact:
            </p>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Mail className="w-4 h-4 text-emerald-600" />
              <a href="mailto:support@vastire.com" className="text-emerald-700 hover:underline">
                support@vastire.com
              </a>
            </div>
            <p className="text-xs text-slate-400">
              Vastire Customer Care • 100% US domestic fulfillment guarantee.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
