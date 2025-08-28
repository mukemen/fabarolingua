export const metadata = {
  title: "Fabaro Lingua — Voice & Text Translator",
  description: "Penerjemah mewah dan cepat: suara & teks. Powered by FABARO.",
  manifest: "/manifest.json",
};

import "./globals.css";
import { ReactNode, useEffect } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(()=>{});
            });
          }
        `}} />
      </body>
    </html>
  );
}
