import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skinlu — Diagnostic peau par IA",
  description:
    "Un selfie suffit. Notre IA analyse ta peau et te construit une routine soin sur mesure, avec des produits multi-marques adaptés à ton type de peau.",
  openGraph: {
    title: "Skinlu — Diagnostic peau par IA",
    description:
      "Un selfie suffit. Notre IA analyse ta peau et te construit une routine soin sur mesure, avec des produits multi-marques adaptés à ton type de peau.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
