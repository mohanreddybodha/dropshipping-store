import React from "react";
import Link from "next/link";
import { Truck, Clock, ShieldCheck, Mail } from "lucide-react";
import NavigationBackButton from "../../components/ui/NavigationBackButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | Vastire",
  description: "Tracked 3-5 business day domestic US delivery with USPS. FTC Mail Order Merchandise Rule compliant.",
  alternates: { canonical: "/shipping-policy" },
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-20 md:pb-10">
      <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5">
          <NavigationBackButton label="Back" className="mb-3" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Shipping & Delivery Policy
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm sm:text-base text-slate-600 leading-relaxed">
          {/* Key SLA Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 not-prose">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Processing SLA</span>
              </div>
              <p className="text-lg font-black text-slate-900">1–2 Business Days</p>
              <p className="text-xs text-slate-500">Automated routing from domestic hubs</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Transit Window</span>
              </div>
              <p className="text-lg font-black text-slate-900">3–5 Business Days</p>
              <p className="text-xs text-slate-500">Fast USPS Ground Advantage delivery</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Shipping Fee</span>
              </div>
              <p className="text-lg font-black text-emerald-600">Free / Included</p>
              <p className="text-xs text-slate-500">Zero surprise checkout handling fees</p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Domestic US Fulfillment Network</h2>
            <p>
              Every product offered on Vastire is stocked in and dispatched directly from domestic fulfillment centers located within the United States. By maintaining domestic inventory partnerships, we ensure that orders reach customers quickly and reliably.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Order Processing & Daily Cutoffs</h2>
            <p>
              Orders placed before <strong>2:00 PM EST (Monday through Friday)</strong> begin processing the same business day. Orders placed after 2:00 PM EST or on weekends/federal holidays will enter fulfillment on the following business day. Standard picking, quality inspection, and packaging take 24 to 48 business hours.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">3. Carrier Partnerships & Real-Time Tracking</h2>
            <p>
              We partner predominantly with the <strong>United States Postal Service (USPS)</strong> utilizing tracked USPS Ground Advantage and Priority Mail services. Select bulky items may ship via domestic ground couriers (FedEx / UPS).
            </p>
            <p>
              As soon as your parcel is labeled and scanned into the carrier network, you will receive an automated email confirmation containing your official carrier tracking number. You can also view live tracking milestones at any time in your Account tab.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">4. FTC 30-Day Mail Order Rule Compliance</h2>
            <p>
              In strict accordance with the Federal Trade Commission&rsquo;s Mail, Internet, or Telephone Order Merchandise Rule (16 CFR Part 435):
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                We expect and endeavor to ship all orders well within our stated 1–2 business day processing window.
              </li>
              <li>
                In the rare event of an unexpected carrier delay or localized domestic warehouse outage preventing shipment within 30 days of payment, we will notify you immediately with a revised shipping estimate and provide you the choice to either consent to the delayed shipment or receive an immediate, full refund.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">5. Undeliverable & Returned Packages</h2>
            <p>
              Please verify your shipping address carefully before submitting payment. Customers are responsible for providing valid US Postal addresses. If a package is returned to our fulfillment warehouse marked &ldquo;Undeliverable as Addressed&rdquo; or &ldquo;Refused,&rdquo; our customer support team will contact you to verify the address and arrange reshipment.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">6. Shipping Assistance & Claims</h2>
            <p>
              If your tracking has not updated for more than 5 business days, or if your package arrives with transit damage, reach out to our dedicated logistics support:
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
