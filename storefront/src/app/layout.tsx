import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../lib/cart";
import { AppShell } from "../components/layout";
import AppLaunchSplash from "../components/ui/AppLaunchSplash";
import { buildGlobalOrganizationGraph, SITE_URL } from "../lib/seo";

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
  title: "Vastire | Curated Home, Kitchen & Workspace Essentials — Free US Shipping",
  description: "Discover modern everyday essentials for home, kitchen, and workspace on Vastire (vastire.com). Free 3–5 day tracked domestic US delivery and bundle savings up to 18%.",
  metadataBase: new URL(SITE_URL),
  keywords: [
    "Vastire",
    "curated home essentials",
    "modern kitchen tools",
    "workspace accessories",
    "smart lighting",
    "free US shipping",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vastire",
  },
  openGraph: {
    title: "Vastire | Curated Home, Kitchen & Workspace Essentials",
    description: "Discover modern everyday essentials on Vastire (vastire.com). Free 3–5 day tracked US delivery.",
    url: SITE_URL,
    siteName: "Vastire",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Vastire Storefront",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vastire | Curated Home, Kitchen & Workspace Essentials",
    description: "Free 3–5 day tracked domestic US delivery on modern home, kitchen & workspace essentials.",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon-32.png",
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
      <head>
        <link rel="preload" as="image" href="/brand-emblem.png" />
        <link rel="preload" as="image" href="/splash-part-ground.png" />
        <link rel="preload" as="image" href="/splash-part-wheel-left.png" />
        <link rel="preload" as="image" href="/splash-part-wheel-right.png" />
        <link rel="preload" as="image" href="/splash-part-body.png" />
        <link rel="preload" as="image" href="/splash-part-streaks.png" />
        <link rel="preload" as="image" href="/splash-part-handle.png" />
        <link rel="preload" as="image" href="/splash-part-roof.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                localStorage.removeItem('vastire_brand_emblem_uri');
                sessionStorage.removeItem('vastire_launch_splash_seen');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans ${brandPoppins.variable}`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildGlobalOrganizationGraph()),
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
