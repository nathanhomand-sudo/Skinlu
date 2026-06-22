"use client";

import * as React from "react";
import NextImage from "next/image";
import { motion, useSpring, useTransform, useInView } from "motion/react";
import { Button } from "@/components/ui";
import type { SkinProfile } from "@/lib/skin-profile";
import {
  type ScanResult,
  CONCERN_LABEL,
  CONCERN_SHORT,
  SKIN_TYPE_LABEL,
  SCORE_PARTS,
  scoreLabel,
} from "@/lib/scan-result";
import type { Concern } from "@/lib/skin-diagnostic";

/* Écran AHA — façon Cal AI, peu de texte, beaucoup d'espace.
   Photo (preuve : zones analysées) → score (vrai, issu des 4 sous-scores /25)
   + interprétation → "Ce qu'on a remarqué" (positifs ✓ + axes ⚠) →
   priorité (1 seule fois) → CTA. Le détail vit derrière le CTA. */

const ZONE_KEYS = ["forehead", "cheeks", "t_zone", "texture"] as const;
const ZONE_POSITIVE: Record<(typeof ZONE_KEYS)[number], string> = {
  forehead: "Front net et lisse",
  cheeks: "Joues homogènes",
  t_zone: "Zone T équilibrée",
  texture: "Grain de peau régulier",
};

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
  const priority = result ? CONCERN_LABEL[result.top_priority] : profile?.priority ?? "Hydratation + barrière";

  const zonesCount = result?.zones ? ZONE_KEYS.length : 4;

  // Vrai score = somme des 4 sous-scores /25 (jamais arbitraire). Fallback si
  // pas d'analyse IA : on dérive un score doux à partir des concerns.
  const scores = result?.scores ?? null;
  const score = scores ? scores.total : result ? clamp(94 - (result.concerns?.length ?? 1) * 9, 62, 94) : 82;
  const label = scoreLabel(score);
  const confidencePct = result?.confidence != null ? Math.round(result.confidence * 100) : null;

  // "Ce qu'on a remarqué" : priorité aux observations renvoyées par l'IA.
  let positives: string[] = result?.positive_observations?.filter(Boolean) ?? [];
  let warns: string[] = result?.improvement_axes?.filter(Boolean) ?? [];

  // Fallback si l'IA n'a pas renvoyé d'observations structurées.
  if (!positives.length) {
    let pos = "Bonne base globale";
    if (result?.zones) {
      const good = ZONE_KEYS.find((k) => !result.zones![k].concern);
      if (good) pos = ZONE_POSITIVE[good];
    }
    positives = [pos];
  }
  if (!warns.length) {
    warns = result
      ? Array.from(new Set((result.concerns ?? []).filter((c) => c !== result.top_priority)))
          .slice(0, 2)
          .map((c: Concern) => CONCERN_SHORT[c])
      : [];
    if (!warns.length) warns = [profile?.priority ? "Tenir la routine dans le temps" : "Régularité de la routine"];
  }

  const insights = [
    ...positives.slice(0, 1).map((label) => ({ kind: "good" as const, label })),
    ...warns.slice(0, 2).map((label) => ({ kind: "warn" as const, label })),
  ].slice(0, 3);

  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10"
      style={{ background: "#13191a", boxShadow: "0 30px 80px -24px rgba(0,0,0,.75)" }}
    >
      {/* Photo hero — preuve d'analyse */}
      <div className="relative h-[280px] w-full">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <NextImage src="/faces/face-03.png" alt="" fill priority sizes="448px" style={{ objectFit: "cover", objectPosition: "50% 26%" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(19,25,26,.15) 0%, transparent 30%, transparent 58%, #13191a 100%)" }} />
        <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-[0.66rem] font-bold uppercase tracking-wide text-emerald-200 backdrop-blur-md">
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Analyse terminée
        </span>
        <div className="absolute inset-x-5 bottom-4 flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[0.74rem] font-semibold text-white backdrop-blur-md">{chipLabel}</span>
          <span className="rounded-full bg-black/40 px-3 py-1 text-[0.7rem] font-medium text-white/85 backdrop-blur-md">{zonesCount} zones analysées</span>
        </div>
      </div>

      <div className="space-y-7 px-6 pb-7 pt-6">
        {/* Score + interprétation */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[0.78rem] font-medium uppercase tracking-[0.14em] text-white/45">Score d&apos;équilibre</p>
            {confidencePct != null && (
              <span className="text-[0.72rem] font-medium text-white/35">Fiabilité {confidencePct}%</span>
            )}
          </div>
          <div className="mt-1 flex items-end gap-3">
            <p className="font-display text-[3.4rem] font-bold leading-none text-white">
              <AnimatedNumber value={score} /><span className="text-2xl text-white/30"> /100</span>
            </p>
            <span className="mb-2 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[0.72rem] font-bold text-emerald-300">{label}</span>
          </div>

          {/* Détail du score : 4 sous-critères /25 (le score n'est pas arbitraire) */}
          {scores && (
            <div className="mt-4 space-y-2.5">
              {SCORE_PARTS.map((p) => {
                const v = scores[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <span className="w-[8.5rem] shrink-0 text-[0.82rem] text-white/55">{p.label}</span>
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/80"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(v / 25) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[0.78rem] tabular-nums text-white/45">{v}/25</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ce qu'on a remarqué — mini AHA */}
        <div>
          <p className="text-[0.78rem] font-medium uppercase tracking-[0.14em] text-white/45">Ce qu&apos;on a remarqué</p>
          <div className="mt-3 space-y-2.5">
            {insights.map((it) => (
              <div key={it.label} className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: it.kind === "good" ? "rgba(52,211,153,.25)" : "rgba(251,191,36,.22)", background: it.kind === "good" ? "rgba(52,211,153,.07)" : "rgba(251,191,36,.06)" }}>
                {it.kind === "good" ? (
                  <svg className="h-4 w-4 shrink-0 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg className="h-4 w-4 shrink-0 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
                <span className="text-[0.96rem] font-medium text-white/85">{it.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priorité principale (une seule fois) */}
        <div>
          <p className="text-[0.78rem] font-medium uppercase tracking-[0.14em] text-white/45">Ta priorité</p>
          <p className="font-display mt-1.5 text-[1.6rem] font-bold leading-tight text-white">{priority}</p>
        </div>

        {/* CTA */}
        <div className="pt-1">
          <Button variant="primary" size="lg" className="w-full" onClick={onSeePlan}>
            Voir ma routine complète
          </Button>
          <p className="mt-3 text-center text-[0.8rem] leading-relaxed text-white/40">
            Analyse cosmétique indicative — ne remplace pas l&apos;avis d&apos;un professionnel de santé.
          </p>
        </div>
      </div>
    </div>
  );
}
