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
  title: "Skinlu — La fin du skincare au hasard",
  description:
    "Arrête d'acheter ta skincare au hasard. Fais un scan gratuit et obtiens une routine plus claire, sans te perdre dans le skincare bullshit.",
  openGraph: {
    title: "Skinlu — La fin du skincare au hasard",
    description:
      "Arrête d'acheter ta skincare au hasard. Fais un scan gratuit et obtiens une routine plus claire, sans te perdre dans le skincare bullshit.",
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
