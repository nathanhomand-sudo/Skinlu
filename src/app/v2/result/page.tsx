"use client";

import { useRouter } from "next/navigation";
import { SkinReportCard } from "@/components/landing/SkinReportCard";

// Rapport d'analyse après scan (démo /v2). "Voir mon plan complet" → "/"
// (le vrai produit / paywall). Hérite du layout /v2 (scope .v2-dark).
export default function ScanResultPage() {
  const router = useRouter();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[640px] -translate-x-1/2 -translate-y-1/2 opacity-60"
        style={{ background: "radial-gradient(closest-side, rgba(15,107,95,.26), transparent)" }}
      />
      <div className="relative z-10 w-full">
        <SkinReportCard onSeePlan={() => router.push("/")} />
      </div>
    </main>
  );
}
