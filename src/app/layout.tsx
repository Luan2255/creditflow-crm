import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreditFlow CRM",
  description: "Gestão de operações de crédito com clareza e controle.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}