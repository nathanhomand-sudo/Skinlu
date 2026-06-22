"use client";

import * as React from "react";
import NextImage from "next/image";
import { motion, useSpring, useTransform, useInView } from "motion/react";
import { Button } from "@/components/ui";
import type { SkinProfile } from "@/lib/skin-profile";
import { type ScanResult, CONCERN_SHORT, CONCERN_COLOR, SKIN_TYPE_LABEL } from "@/lib/scan-result";
import type { Concern } from "@/lib/skin-diagnostic";

/* Écran AHA — minimal, façon Cal AI : photo hero, score, priorité,
   2-3 observations courtes, CTA fort. Le détail (routine, zones complètes,
   recommandations) vit DERRIÈRE le CTA/paywall, pas ici. */

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

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type Observation = { label: string; color: string };

export function SkinReportCard({
  onSeePlan,
  profile,
  result,
  photo,
}: {
  onSeePlan: () => void;
  profile?: SkinProfile | null;
  result?: ScanResult | null;
  photo?: string | null;
}) {
  const chipLabel = (result && SKIN_TYPE_LABEL[result.skin_type]) || "Peau mixte";
  const priority = result ? CONCERN_SHORT[result.top_priority] : profile?.priority ?? "Hydratation + barrière";

  // 2-3 observations courtes max (concerns détectés) — sinon dérivé.
  const observations: Observation[] = result
    ? Array.from(new Set([result.top_priority, ...(result.concerns ?? [])]))
        .slice(0, 3)
        .map((c: Concern) => ({ label: CONCERN_SHORT[c], color: CONCERN_COLOR[c] }))
    : [{ label: profile?.priority ?? "Équilibre à affiner", color: "#0F6B5F" }];

  const score = result ? clamp(94 - (result.concerns?.length ?? 1) * 9, 62, 94) : 82;

  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10"
      style={{ background: "#13191a", boxShadow: "0 30px 80px -24px rgba(0,0,0,.75)" }}
    >
      {/* Photo hero — structure le haut */}
      <div className="relative h-[280px] w-full">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <NextImage src="/faces/face-03.png" alt="" fill priority sizes="448px" style={{ objectFit: "cover", objectPosition: "50% 26%" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(19,25,26,.15) 0%, transparent 35%, transparent 60%, #13191a 100%)" }} />
        <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-[0.66rem] font-bold uppercase tracking-wide text-emerald-200 backdrop-blur-md">
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Analyse terminée
        </span>
        <span className="absolute bottom-4 left-5 rounded-full bg-white/10 px-3 py-1 text-[0.74rem] font-semibold text-white backdrop-blur-md">{chipLabel}</span>
      </div>

      <div className="space-y-7 px-6 pb-7 pt-6">
        {/* Score */}
        <div>
          <p className="text-[0.78rem] font-medium uppercase tracking-[0.14em] text-white/45">Score d&apos;équilibre</p>
          <p className="font-display mt-1 text-[3.4rem] font-bold leading-none text-white">
            <AnimatedNumber value={score} /><span className="text-2xl text-white/30"> /100</span>
          </p>
        </div>

        {/* Priorité — une ligne forte, pas de pavé */}
        <div>
          <p className="text-[0.78rem] font-medium uppercase tracking-[0.14em] text-white/45">Ta priorité</p>
          <p className="font-display mt-1.5 text-[1.6rem] font-bold leading-tight text-white">{priority}</p>
        </div>

        {/* 2-3 observations courtes */}
        <div className="space-y-2.5">
          {observations.map((o) => (
            <div key={o.label} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.color }} />
              <span className="text-[0.98rem] font-medium text-white/85">{o.label}</span>
            </div>
          ))}
        </div>

        {/* CTA fort + teaser de ce qu'il y a derrière */}
        <div className="pt-1">
          <Button variant="primary" size="lg" className="w-full" onClick={onSeePlan}>
            Voir mon plan complet
          </Button>
          <p className="mt-3 text-center text-[0.8rem] leading-relaxed text-white/40">
            Ta routine sur-mesure, le détail par zone et tes recommandations t&apos;attendent à l&apos;intérieur.
          </p>
        </div>
      </div>
    </div>
  );
}
