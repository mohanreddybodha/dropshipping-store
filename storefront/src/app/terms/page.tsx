import React from "react";
import { FileText, Mail, AlertCircle } from "lucide-react";
import NavigationBackButton from "../../components/ui/NavigationBackButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Vastire",
  description: "Read the Vastire Terms of Service governing purchases, order acceptance, pricing, and warranties.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-20 md:pb-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5">
          <NavigationBackButton label="Back" className="mb-3" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Terms of Service
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm sm:text-base text-slate-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Agreement to Terms</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you
              (&ldquo;Customer,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and Vastire (&ldquo;Company,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), governing your access to and use of{" "}
              <strong>vastire.com</strong> and any orders placed through the website.
            </p>
            <p>
              By accessing our site or placing an order, you agree to be bound by these Terms and our Privacy Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Eligibility & Geographic Restrictions</h2>
            <p>
              You must be at least 18 years old or the age of legal majority in your jurisdiction to place an order.
            </p>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm flex items-start gap-2.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>United States Only:</strong> We strictly sell and ship to physical addresses located within the fifty (50) United States, the District of Columbia, and verified APO/FPO military addresses. We do not support international shipments or forwarding addresses.
              </span>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">3. Pricing, Payments & Sales Taxes</h2>
            <p>
              All prices are displayed and charged in United States Dollars (USD). We accept payments via authorized payment gateways (including PayPal, Visa, MasterCard, American Express, and Discover). By submitting payment details, you represent that you are authorized to use the designated payment instrument.
            </p>
            <p>
              Prices for products are subject to change without notice. In the event of an inadvertent typographical pricing error, we reserve the right to cancel unfulfilled orders and issue an immediate 100% refund.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">4. Order Acceptance & Fulfillment</h2>
            <p>
              Order confirmation emails indicate receipt of your purchase request and do not constitute final acceptance. Vastire reserves the right to decline or limit quantities of any order for reasons including inventory stockouts, inaccurate recipient addresses, or suspected fraudulent activity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">5. 30-Day Money-Back Guarantee & Returns</h2>
            <p>
              All purchases are backed by our 30-Day Customer Satisfaction Guarantee. Returns must comply with our official Refund & Return Policy. Items arriving with transit damage or verified manufacturing defects are replaced or refunded at zero cost to the customer.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">6. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, Vastire shall not be liable for any indirect, incidental, punitive, or consequential damages arising from the use of products purchased through the Service. Our aggregate liability shall not exceed the total amount paid by you for the specific product giving rise to the claim.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">7. Contact & Notices</h2>
            <p>For questions regarding these Terms, contact our customer service desk:</p>
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
