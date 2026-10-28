import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../lib/cart";
import { AppShell } from "../components/layout";

export const metadata: Metadata = {
  title: "Domestic Lab | 3–7 Day Fast US Domestic Shipping",
  description: "Everyday problem-solving products shipped same-day from verified US domestic warehouses via USPS. Arrives in 3–5 business days with live tracked delivery.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                var isChunkError = e && (
                  (e.message && (e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('ChunkLoadError') !== -1)) ||
                  (e.target && e.target.tagName === 'SCRIPT' && e.target.src && e.target.src.indexOf('/_next/static/') !== -1)
                );
                if (isChunkError) {
                  var lastReload = sessionStorage.getItem('chunk_reload_ts');
                  var now = Date.now();
                  if (!lastReload || (now - parseInt(lastReload, 10)) > 4000) {
                    sessionStorage.setItem('chunk_reload_ts', now.toString());
                    window.location.reload();
                  }
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  );
}
