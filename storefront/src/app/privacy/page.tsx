import React from "react";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import NavigationBackButton from "../../components/ui/NavigationBackButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Vastire",
  description: "Learn how Vastire protects your personal data, handles customer information, and complies with US privacy regulations.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-20 md:pb-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5">
          <NavigationBackButton label="Back" className="mb-3" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm sm:text-base text-slate-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Introduction & Overview</h2>
            <p>
              Vastire (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates <strong>vastire.com</strong>. This Privacy Policy describes how we collect, use, and protect your information when you visit our website, purchase products, or contact customer service.
            </p>
            <p>
              We are committed to protecting your personal data in compliance with United States federal and state privacy statutes, including the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Information We Collect</h2>
            <p>We collect only the information necessary to fulfill your orders and provide support:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Contact & Shipping Data:</strong> Full name, domestic shipping address, email address, and phone number.</li>
              <li><strong>Transaction Data:</strong> Ordered items, purchase dates, internal order identifiers, and payment status.</li>
              <li><strong>Device & Browsing Data:</strong> IP address, device type, browser metadata, and cookie preferences for session stability.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">3. Zero Credit Card Storage</h2>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm flex items-start gap-2.5 text-slate-700 not-prose">
              <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>PCI-DSS Compliant Payment Processing:</strong> All payment card transactions are tokenized directly through encrypted payment gateway partners (PayPal Enterprise). Vastire never stores, sees, or retains your raw credit or debit card numbers on our servers.
              </span>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">4. Sharing Information With Essential Service Providers</h2>
            <p>We share personal data strictly with trusted service providers to fulfill your order:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Carriers & Logistics:</strong> United States Postal Service (USPS) and domestic couriers to deliver parcels.
              </li>
              <li>
                <strong>Fulfillment Partners:</strong> Domestic distribution facilities to package and ship orders.
              </li>
              <li>
                <strong>Cloud & Database:</strong> Encrypted hosting providers for order records.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">5. Consumer Privacy Rights (CCPA / CPRA)</h2>
            <p>Under US state privacy laws, you have specific rights regarding your personal information:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Right to Know & Access:</strong> Request disclosure of the personal data we hold about you.</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information, subject to statutory fulfillment and tax record retention requirements.</li>
              <li><strong>Zero Data Selling:</strong> We do not sell, rent, or monetize personal information to third-party data brokers or advertisers.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">6. Data Retention & Security</h2>
            <p>
              All website traffic is strictly encrypted using TLS 1.3 / HTTPS. Order records are maintained only for the duration required to service customer warranties, return windows, and statutory accounting obligations.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">7. Contact Information</h2>
            <p>
              To exercise your privacy rights or ask questions about our data practices, reach out to customer support:
            </p>
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Mail className="w-4 h-4 text-emerald-600" />
              <a href="mailto:support@vastire.com" className="text-emerald-700 hover:underline">
                support@vastire.com
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
