import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../lib/cart";
import { AppShell } from "../components/layout";
import AppLaunchSplash from "../components/ui/AppLaunchSplash";

const brandPoppins = Poppins({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Vastire | Curated Home, Workspace & Living Essentials",
  description: "Discover modern everyday essentials for home, kitchen, and workspace on Vastire (vastire.com). Fast 3–5 day tracked domestic delivery.",
  metadataBase: new URL("https://vastire.com"),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vastire",
  },
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
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans ${brandPoppins.variable}`}
      >
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
        <AppLaunchSplash />
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  );
}
