"use client";

import * as React from "react";
import NextImage from "next/image";
import { motion, useSpring, useTransform, useInView } from "motion/react";
import { Button } from "@/components/ui";
import type { SkinProfile } from "@/lib/skin-profile";

/* Rapport d'analyse après scan — version skincare claire et respirable.
   Fond plus clair que le background, marges généreuses, sections bien
   séparées, hiérarchie : score → priorité → zones → routine → CTA.
   Lisible en 5 secondes, pas un dashboard noir compact. */

const ZONES = [
  { zone: "Zone T", obs: "brillance légère", color: "#0F6B5F" },
  { zone: "Joues", obs: "déshydratation possible", color: "#4682C3" },
  { zone: "Texture", obs: "pores visibles", color: "#9aa39f" },
];

const ROUTINE = [
  { n: "1", name: "Nettoyant doux", when: "Matin & soir" },
  { n: "2", name: "Sérum hydratant", when: "Matin & soir" },
  { n: "3", name: "Crème + SPF 50", when: "Le matin" },
];

function AnimatedNumber({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (c) => Math.round(c).toString());
  React.useEffect(() => {
    if (isInView) spring.set(value);
  }, [spring, value, isInView]);
  return <motion.span ref={ref}>{display}</motion.span>;
}

export function SkinReportCard({ onSeePlan, profile }: { onSeePlan: () => void; profile?: SkinProfile | null }) {
  const priority = profile?.priority ?? "Hydratation + barrière";
  const priorityNote = profile?.priorityNote ?? "Ta peau semble surtout demander plus de régularité sur l'hydratation.";
  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10"
      style={{
        background: "#1a201e",
        boxShadow: "0 30px 70px -20px rgba(0,0,0,.7)",
      }}
    >
      {/* Photo en haut */}
      <div className="relative h-[200px] w-full">
        <NextImage src="/faces/face-03.png" alt="" fill priority sizes="448px"
          style={{ objectFit: "cover", objectPosition: "50% 26%" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 55%, #1a201e 100%)" }} />
        <span className="absolute bottom-3 left-5 rounded-full bg-black/40 px-3 py-1 text-[0.72rem] font-semibold text-white backdrop-blur-md">Peau mixte</span>
      </div>

      <div className="space-y-6 p-6">
        {/* Statut */}
        <div className="flex items-center gap-2 text-emerald-300">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[0.82rem] font-bold uppercase tracking-[0.14em]">Analyse terminée</span>
        </div>

        {/* Score */}
        <div>
          <p className="text-[0.82rem] font-medium text-white/50">Score d&apos;équilibre</p>
          <p className="font-display mt-1 text-5xl font-bold leading-none text-white">
            <AnimatedNumber value={82} /><span className="text-2xl text-white/35"> /100</span>
          </p>
        </div>

        {/* Priorité + phrase (dérivées de tes réponses) */}
        <div>
          <p className="text-[0.82rem] font-medium text-white/50">Priorité détectée</p>
          <p className="font-display mt-1 text-[1.45rem] font-bold leading-tight text-white">{priority}</p>
          <p className="mt-2.5 text-[0.98rem] leading-relaxed text-white/65">{priorityNote}</p>
        </div>

        {/* Onboarding rejoué : on reprend ce que l'user a dit */}
        {profile?.line && (
          <div className="flex gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <p className="text-[0.9rem] leading-relaxed text-white/70">{profile.line}</p>
          </div>
        )}
        {profile?.contextNote && (
          <p className="text-[0.85rem] leading-relaxed text-amber-200/70">⚠ {profile.contextNote}</p>
        )}

        <div className="h-px w-full bg-white/[0.08]" />

        {/* Zones observées */}
        <div>
          <h3 className="text-[1.05rem] font-semibold text-white">Zones observées</h3>
          <div className="mt-4 space-y-3.5">
            {ZONES.map((z) => (
              <div key={z.zone} className="flex items-baseline gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: z.color }} />
                <span className="w-[68px] shrink-0 text-[0.98rem] font-semibold text-white">{z.zone}</span>
                <span className="flex-1 text-[0.98rem] text-white/55">{z.obs}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-white/[0.08]" />

        {/* Routine — cartes séparées */}
        <div>
          <h3 className="text-[1.05rem] font-semibold text-white">Routine recommandée</h3>
          <div className="mt-4 space-y-2.5">
            {ROUTINE.map((r) => (
              <div key={r.n} className="flex items-center gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 font-display text-sm font-bold text-emerald-300">{r.n}</span>
                <div className="grid">
                  <span className="text-[1rem] font-semibold text-white">{r.name}</span>
                  <span className="text-[0.78rem] text-white/45">{r.when}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA — hauteur normale */}
        <Button variant="primary" size="md" className="w-full" onClick={onSeePlan}>
          Voir mon plan complet
        </Button>
      </div>
    </div>
  );
}
