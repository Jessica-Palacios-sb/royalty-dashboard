import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel de Royalties — Mentores",
  description: "Dashboard de comisiones de mentores (royalty)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
