import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skinlu - Décodeur d'étiquette skincare par IA",
  description:
    "Analysez une étiquette skincare par IA et obtenez un verdict personnalisé selon votre type de peau.",
  openGraph: {
    title: "Skinlu - Décodeur d'étiquette skincare par IA",
    description:
      "Analysez une étiquette skincare par IA et obtenez un verdict personnalisé selon votre type de peau.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
