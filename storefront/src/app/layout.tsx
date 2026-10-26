import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../lib/cart";
import { AppShell } from "../components/layout";

export const metadata: Metadata = {
  title: "Domestic Lab | 3–7 Day Fast US Domestic Shipping",
  description: "Everyday problem-solving products shipped same-day from verified US domestic warehouses via USPS. Arrives in 3–5 business days with live tracked delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  );
}
