"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SkinReportCard } from "@/components/landing/SkinReportCard";
import { resetOnboarded } from "@/lib/onboarding";
import { loadProfile, type SkinProfile } from "@/lib/skin-profile";
import { loadResult, type ScanResult } from "@/lib/scan-result";

// Rapport d'analyse après scan (démo /v2). "Voir mon plan complet" → "/"
// (le vrai produit / paywall). Hérite du layout /v2 (scope .v2-dark).
export default function ScanResultPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SkinProfile | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  useEffect(() => { setProfile(loadProfile()); setResult(loadResult()); }, []);
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[640px] -translate-x-1/2 -translate-y-1/2 opacity-60"
        style={{ background: "radial-gradient(closest-side, rgba(15,107,95,.26), transparent)" }}
      />
      <div className="relative z-10 w-full">
        <SkinReportCard profile={profile} result={result} onSeePlan={() => router.push("/")} />
        {/* Test démo : repasser en "1re visite" (réinitialise l'onboarding) */}
        <button
          type="button"
          onClick={() => { resetOnboarded(); router.push("/v2"); }}
          style={{ WebkitTapHighlightColor: "transparent" }}
          className="mx-auto mt-6 block select-none appearance-none border-0 bg-transparent text-center text-[0.76rem] text-white/35 underline-offset-4 outline-none transition hover:text-white/60 hover:underline focus:outline-none"
        >
          ↻ Recommencer la démo
        </button>
      </div>
    </main>
  );
}
