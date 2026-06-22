"use client";

import * as React from "react";
import NextImage from "next/image";
import { motion, useSpring, useTransform, useInView } from "motion/react";
import { Button } from "@/components/ui";

/* Rapport d'analyse après scan — thème CLAIR (hero noir → sections claires).
   Carte blanche sur fond crème, accent teal. Lisible, respirable. */

const ZONES = [
  { zone: "Zone T", obs: "brillance légère", color: "#0F6B5F" },
  { zone: "Joues", obs: "déshydratation possible", color: "#4682C3" },
  { zone: "Texture", obs: "pores visibles", color: "#9a8f7e" },
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

export function SkinReportCard({ onSeePlan }: { onSeePlan: () => void }) {
  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-3xl"
      style={{ background: "#ffffff", border: "1px solid #e8e2d6", boxShadow: "0 30px 70px -22px rgba(40,33,20,.28)" }}
    >
      {/* Photo en haut */}
      <div className="relative h-[200px] w-full">
        <NextImage src="/faces/face-03.png" alt="" fill priority sizes="448px"
          style={{ objectFit: "cover", objectPosition: "50% 26%" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 60%, #ffffff 100%)" }} />
        <span className="absolute bottom-3 left-5 rounded-full bg-black/45 px-3 py-1 text-[0.72rem] font-semibold text-white backdrop-blur-md">Peau mixte</span>
      </div>

      <div className="space-y-6 p-6" style={{ color: "#211e1a" }}>
        {/* Statut */}
        <div className="flex items-center gap-2" style={{ color: "#0F6B5F" }}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-[0.82rem] font-bold uppercase tracking-[0.14em]">Analyse terminée</span>
        </div>

        {/* Score */}
        <div>
          <p className="text-[0.82rem] font-medium" style={{ color: "#8a8378" }}>Score d&apos;équilibre</p>
          <p className="font-display mt-1 text-5xl font-bold leading-none" style={{ color: "#1c1a17" }}>
            <AnimatedNumber value={82} /><span className="text-2xl" style={{ color: "#c3bcae" }}> /100</span>
          </p>
        </div>

        {/* Priorité + phrase */}
        <div className="rounded-2xl px-4 py-3.5" style={{ background: "rgba(15,107,95,.06)", border: "1px solid rgba(15,107,95,.18)" }}>
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em]" style={{ color: "#0F6B5F" }}>Priorité détectée</p>
          <p className="font-display mt-1 text-[1.45rem] font-bold leading-tight" style={{ color: "#1c1a17" }}>Hydratation + barrière</p>
          <p className="mt-2 text-[0.96rem] leading-relaxed" style={{ color: "#6b655c" }}>
            Ta peau semble surtout demander plus de régularité sur l&apos;hydratation.
          </p>
        </div>

        {/* Zones observées */}
        <div>
          <h3 className="text-[1.05rem] font-semibold" style={{ color: "#1c1a17" }}>Zones observées</h3>
          <div className="mt-4 space-y-3.5">
            {ZONES.map((z) => (
              <div key={z.zone} className="flex items-baseline gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: z.color }} />
                <span className="w-[68px] shrink-0 text-[0.98rem] font-semibold" style={{ color: "#1c1a17" }}>{z.zone}</span>
                <span className="flex-1 text-[0.98rem]" style={{ color: "#6b655c" }}>{z.obs}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Routine — cartes séparées */}
        <div>
          <h3 className="text-[1.05rem] font-semibold" style={{ color: "#1c1a17" }}>Routine recommandée</h3>
          <div className="mt-4 space-y-2.5">
            {ROUTINE.map((r) => (
              <div key={r.n} className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5" style={{ background: "#faf7f1", border: "1px solid #ece6db" }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold" style={{ background: "rgba(15,107,95,.12)", color: "#0F6B5F" }}>{r.n}</span>
                <div className="grid">
                  <span className="text-[1rem] font-semibold" style={{ color: "#1c1a17" }}>{r.name}</span>
                  <span className="text-[0.78rem]" style={{ color: "#8a8378" }}>{r.when}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button variant="primary" size="md" className="w-full" onClick={onSeePlan}>
          Voir mon plan complet
        </Button>
      </div>
    </div>
  );
}
