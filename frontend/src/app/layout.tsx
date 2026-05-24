import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revitalize AI — Programmable Mitochondrial Gene Therapy",
  description:
    "AI-driven simulation platform for doxycycline-inducible CRISPR prime editing of mitochondrial DNA via the PNPase import pathway.",
  icons: { icon: "/logo_clean.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col relative">{children}</body>
    </html>
  );
}
