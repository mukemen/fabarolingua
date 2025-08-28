import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Fabaro Lingua",
  description: "Translator voice & text powered by FABARO",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
