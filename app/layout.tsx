// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Fabaro Lingua",
  description: "Translator suara & teks",
  applicationName: "Fabaro Lingua",
  manifest: "/manifest.json",
  themeColor: "#2B0B52",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png"
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
        {/* Compatibility tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2B0B52" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        {children}

        {/* Register Service Worker + auto update + tombol flush via ?flush=1 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                // 1) FLUSH MODE: buka dengan ?flush=1 untuk hapus cache & unregister SW di device lama
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
                    // reload bersih
                    location.replace(location.origin + location.pathname);
                  })();
                  return; // hentikan register saat flush
                }

                // 2) Register SW dengan cache-buster supaya file sw.js terbaru selalu diambil
                if ('serviceWorker' in navigator) {
                  const swUrl = '/sw.js?v=' + Date.now();
                  navigator.serviceWorker.register(swUrl).then((reg) => {
                    // Kalau ada SW "waiting", suruh skipWaiting agar langsung aktif
                    if (reg.waiting) {
                      reg.waiting.postMessage('SKIP_WAITING');
                    }
                    // Saat SW baru terdeteksi
                    reg.addEventListener('updatefound', () => {
                      const nw = reg.installing;
                      if (!nw) return;
                      nw.addEventListener('statechange', () => {
                        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                          // versi baru terpasang -> aktifkan segera
                          nw.postMessage('SKIP_WAITING');
                        }
                      });
                    });
                  }).catch(function(){});
                  // Reload otomatis jika controller SW berubah (agar UI pakai aset terbaru)
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    location.reload();
                  });
                }
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
