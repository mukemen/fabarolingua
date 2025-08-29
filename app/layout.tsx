// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Fabaro Lingua",
  description: "Translator suara & teks — powered by MUKEMEN.AI",
  applicationName: "Fabaro Lingua",
  manifest: "/manifest.json",
  themeColor: "#2B0B52",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: "/icons/android-192.png"
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Fabaro Lingua" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2B0B52" />
        <link rel="apple-touch-icon" href="/icons/android-192.png" />
      </head>
      <body className={inter.className}>
        {children}
        {/* Register/flush Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (!('serviceWorker' in navigator)) return;
                const u = new URL(location.href);
                const flush = u.searchParams.get('flush');
                if (flush) {
                  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
                  navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())));
                }
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
