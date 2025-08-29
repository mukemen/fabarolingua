// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], display: "swap" });

// NOTE: semua ikon pakai query ?v=3 untuk bust cache
export const metadata: Metadata = {
  title: "Fabaro Lingua",
  description: "Translator suara & teks",
  applicationName: "Fabaro Lingua",
  manifest: "/manifest.json",
  themeColor: "#2B0B52",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png?v=3", sizes: "16x16", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png?v=3"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fabaro Lingua"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/* Tidak perlu lagi link rel="icon" manual yang tanpa ?v= */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2B0B52" />
        {/* Apple touch icon juga pakai ?v= */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                const params = new URLSearchParams(location.search);
                if (params.get('flush') === '1') {
                  (async () => {
                    try {
                      if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (const r of regs) await r.unregister();
                      }
                      if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(k => caches.delete(k)));
                      }
                      localStorage.clear?.(); sessionStorage.clear?.();
                    } catch(e) {}
                    location.replace(location.origin + location.pathname);
                  })();
                  return;
                }
                if ('serviceWorker' in navigator) {
                  const swUrl = '/sw.js?v=' + Date.now();
                  navigator.serviceWorker.register(swUrl).then(reg => {
                    if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
                    reg.addEventListener('updatefound', () => {
                      const nw = reg.installing;
                      if (!nw) return;
                      nw.addEventListener('statechange', () => {
                        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                          nw.postMessage('SKIP_WAITING');
                        }
                      });
                    });
                  }).catch(()=>{});
                  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
                }
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
