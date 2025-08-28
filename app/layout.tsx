import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

export const metadata = {
  title: "Fabaro Lingua",
  description: "Translator suara & teks",
  themeColor: "#2b0b52",
};

// Pastikan viewport mobile
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(()=>{});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
