"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CinematicScene } from "@/components/landing/CinematicScene";
import { Reviews } from "@/components/landing/Reviews";
import { isOnboarded, resetOnboarded } from "@/lib/onboarding";

// Landing /v2 — cinématique en intro (le mec scrolle, clique → biais
// d'investissement dès la 1re seconde), puis "comment ça marche" + avis.
// La page se termine sur les avis (palier). CTA principal = bouton du
// téléphone dans la cinématique → /v2/scan. Ne touche pas au flow produit.
const STEPS = [
  { n: "1", t: "Scanne ta peau", d: "Une photo guidée, 30 secondes. Pas de questionnaire interminable." },
  { n: "2", t: "Vois ce qui compte", d: "Tes zones, ta priorité cosmétique, lisibles d'un coup d'œil." },
  { n: "3", t: "Reçois ta routine", d: "Un plan clair matin/soir, adapté à ta peau — pas au hasard." },
];

export default function LandingV2Page() {
  const router = useRouter();
  const scan = () => router.push("/v2/scan");

  // Returning user (déjà onboardé) → on saute la cinématique et on va
  // direct au scan. ?reset=1 réinitialise (pratique pour tester).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      resetOnboarded();
      return;
    }
    if (isOnboarded()) router.replace("/v2/scan");
  }, [router]);

  return (
    <>
      {/* Intro immersive */}
      <CinematicScene onScanClick={scan} />

      {/* Comment ça marche — 3 étapes */}
      <section className="relative px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
              Comment ça marche
            </span>
            <h2 className="font-display mt-5 text-[clamp(1.8rem,4.5vw,2.8rem)] font-bold leading-[1.1] text-white">
              Trois étapes, une minute.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 font-display text-base font-bold text-emerald-300">
                  {s.n}
                </span>
                <h3 className="font-display mt-4 text-lg font-bold text-white">{s.t}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-white/55">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Reviews />
    </>
  );
}
