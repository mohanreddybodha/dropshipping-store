import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../lib/cart";
import { AppShell } from "../components/layout";

const brandPoppins = Poppins({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vastire | Curated Home, Workspace & Living Essentials",
  description: "Discover modern everyday essentials for home, kitchen, and workspace on Vastire (vastire.com). Fast 3–5 day tracked domestic delivery.",
  metadataBase: new URL("https://vastire.com"),
  openGraph: {
    title: "Vastire | Curated Home, Workspace & Living Essentials",
    description: "Discover modern everyday essentials on Vastire (vastire.com). Fast 3–5 day tracked delivery.",
    url: "https://vastire.com",
    siteName: "Vastire",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/favicon-64.png",
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
      <body className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans ${brandPoppins.variable}`}>
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  );
}
