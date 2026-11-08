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
        <link rel="preload" as="image" href="/splash-part-ground.png" />
        <link rel="preload" as="image" href="/splash-part-wheel-left.png" />
        <link rel="preload" as="image" href="/splash-part-wheel-right.png" />
        <link rel="preload" as="image" href="/splash-part-body.png" />
        <link rel="preload" as="image" href="/splash-part-streaks.png" />
        <link rel="preload" as="image" href="/splash-part-handle.png" />
        <link rel="preload" as="image" href="/splash-part-roof.png" />
        <link rel="preload" as="audio" href="/vastire-launch-sound.wav" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('vastire_launch_splash_seen')) {
                  document.documentElement.classList.add('splash-dismissed');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans ${brandPoppins.variable}`}
      >
        <AppLaunchSplash />
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  );
}
