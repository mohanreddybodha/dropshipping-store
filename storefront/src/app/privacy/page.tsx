import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Vastire",
  description: "Learn how Vastire protects your personal data, handles customer information, and complies with US privacy regulations.",
};

export default function PrivacyPolicyPage() {
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-slate-500">Effective Date: October 26, 2026 • Last Updated: November 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Introduction & Overview</h2>
            <p>
              Vastire (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website located at{" "}
              <strong>vastire.com</strong> (the &ldquo;Service&rdquo;). This Privacy Policy describes how we collect,
              use, disclose, and safeguard your personal information when you visit our website, purchase products, or
              interact with our customer service team.
            </p>
            <p>
              We are committed to maintaining the confidentiality, integrity, and security of your personal data in
              compliance with applicable United States state and federal privacy statutes, including the California
              Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Information We Collect</h2>
            <p>When you use our storefront or place an order, we collect certain personal information necessary to fulfill your purchase:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Customer Identifiers:</strong> Full legal name, shipping recipient name, email address, physical delivery address, and telephone number.
              </li>
              <li>
                <strong>Transaction Data:</strong> Ordered product line items, variant specifications (VID/SKU), order totals, and payment processor transaction IDs (e.g., PayPal Order ID).
              </li>
              <li>
                <strong>Device & Usage Data:</strong> IP address, browser type, operating system version, and browsing sessions via standard analytics and server error telemetry.
              </li>
            </ul>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Payment Security Note:</strong> We do not store, process, or transmit raw credit card numbers or banking credentials on our servers. All payments are processed through PCI-DSS Level 1 certified payment providers (such as PayPal).
              </span>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. How We Use Your Information</h2>
            <p>We process your personal information strictly for legitimate commercial and fulfillment purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To validate, authorize, and fulfill customer orders dispatched from domestic US warehouses.</li>
              <li>To provide automated parcel tracking notifications and order status updates via USPS and affiliated carriers.</li>
              <li>To provide customer support, resolve returns, and issue refunds for damaged or defective items.</li>
              <li>To detect and prevent fraudulent transactions, bot attacks, and automated checkout exploits.</li>
              <li>To comply with legal, tax, and accounting recordkeeping obligations.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Third-Party Disclosures & Service Providers</h2>
            <p>We do not sell, rent, or trade your personal information. We disclose customer data only to essential service partners:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Fulfillment Partners:</strong> CJ Dropshipping API services to dispatch products from domestic distribution centers.
              </li>
              <li>
                <strong>Carriers & Logistics:</strong> United States Postal Service (USPS) and domestic couriers to physically deliver parcels.
              </li>
              <li>
                <strong>Cloud & Database Infrastructure:</strong> Neon PostgreSQL and Vercel Inc. for hosting encrypted transaction records.
              </li>
              <li>
                <strong>Authentication:</strong> Google Firebase Authentication for secure user account access.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. California Consumer Privacy Rights (CCPA / CPRA)</h2>
            <p>If you are a California resident, you possess specific rights under California law:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Right to Know:</strong> You may request disclosure of the specific pieces and categories of personal information we have collected.</li>
              <li><strong>Right to Delete:</strong> You may request that we delete personal information collected from you, subject to statutory order fulfillment and tax retention exceptions.</li>
              <li><strong>Right to Non-Discrimination:</strong> We will never discriminate against you, deny goods, or alter prices for exercising your privacy rights.</li>
              <li><strong>Do Not Sell or Share:</strong> We do not sell personal information or share it for cross-context behavioral advertising.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">6. Data Retention & Security</h2>
            <p>
              We maintain reasonable administrative, technical, and physical safeguards designed to protect personal information from unauthorized access, acquisition, or disclosure. All web traffic is strictly encrypted using TLS 1.3 / HTTPS. Order records are maintained for the minimum duration required to service customer warranties, return windows, and statutory tax obligations.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-900">7. Contact Information</h2>
            <p>
              If you have any questions or wish to exercise your statutory privacy rights, please reach out directly:
            </p>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Mail className="w-4 h-4 text-emerald-600" />
              <a href="mailto:support@vastire.com" className="text-emerald-700 hover:underline">
                support@vastire.com
              </a>
            </div>
            <p className="text-xs text-slate-400">
              Vastire Customer Privacy Team • Response SLA: Within 48 business hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
