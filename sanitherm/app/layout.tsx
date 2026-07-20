import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sanitherm — Personeelsportaal",
  description: "Tijdsregistratie, verlof en ziektemelding voor Sanitherm",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // laat env(safe-area-inset-*) werken op iPhones
  themeColor: "#0f5aa8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
