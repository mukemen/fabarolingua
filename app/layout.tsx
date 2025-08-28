import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Fabaro Lingua",
  description: "Translator voice & text powered by FABARO",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        {/* Registrasi Service Worker untuk PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(() => console.log("Service Worker registered"))
                    .catch(err => console.warn("Service Worker failed", err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
