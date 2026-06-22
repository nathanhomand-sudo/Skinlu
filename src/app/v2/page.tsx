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

      {/* Comment ça marche — 3 étapes (section claire) */}
      <section className="relative px-5 pb-24 pt-20 sm:pb-32 sm:pt-28" style={{ background: "#F4F0E9", color: "#211e1a" }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={{ border: "1px solid rgba(0,0,0,.1)", background: "rgba(15,107,95,.08)", color: "#0F6B5F" }}>
              Comment ça marche
            </span>
            <h2 className="font-display mt-5 text-[clamp(1.8rem,4.5vw,2.8rem)] font-bold leading-[1.1]" style={{ color: "#1c1a17" }}>
              Trois étapes, une minute.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #e8e2d6", boxShadow: "0 14px 34px -16px rgba(40,33,20,.18)" }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full font-display text-base font-bold" style={{ background: "rgba(15,107,95,.12)", color: "#0F6B5F" }}>
                  {s.n}
                </span>
                <h3 className="font-display mt-4 text-lg font-bold" style={{ color: "#1c1a17" }}>{s.t}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed" style={{ color: "#6b655c" }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Reviews />
    </>
  );
}
