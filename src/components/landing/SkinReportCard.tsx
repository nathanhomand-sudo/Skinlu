"use client";

import * as React from "react";
import NextImage from "next/image";
import { motion, useSpring, useTransform, useInView } from "motion/react";
import { Button } from "@/components/ui";
import type { SkinProfile } from "@/lib/skin-profile";
import { type ScanResult, CONCERN_LABEL, CONCERN_SHORT, SKIN_TYPE_LABEL } from "@/lib/scan-result";
import type { Concern } from "@/lib/skin-diagnostic";

/* Écran AHA — façon Cal AI, peu de texte, beaucoup d'espace.
   Photo (preuve : 4 zones analysées) → score + interprétation →
   "Ce qu'on a remarqué" (1 positif + 2 améliorations) → priorité (1 seule
   fois) → CTA. Le détail (routine, zones complètes) vit derrière le CTA. */

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

  const score = result ? clamp(94 - (result.concerns?.length ?? 1) * 9, 62, 94) : 82;
  const scoreLabel =
    score >= 82 ? "Très bon équilibre" : score >= 70 ? "Bon équilibre" : score >= 55 ? "Équilibre à renforcer" : "À améliorer";

  // 1 point positif (zone sans concern, ou générique)
  let positive = "Bonne base globale";
  if (result?.zones) {
    const good = ZONE_KEYS.find((k) => !result.zones![k].concern);
    if (good) positive = ZONE_POSITIVE[good];
  }

  // 2 améliorations — concerns SAUF la priorité (pour ne pas la répéter)
  let improvements: string[] = result
    ? Array.from(new Set((result.concerns ?? []).filter((c) => c !== result.top_priority)))
        .slice(0, 2)
        .map((c: Concern) => CONCERN_SHORT[c])
    : [];
  if (!improvements.length) {
    // fallback : zones porteuses d'un concern ≠ priorité
    if (result?.zones) {
      improvements = ZONE_KEYS
        .map((k) => result.zones![k].concern)
        .filter((c): c is Concern => !!c && c !== result.top_priority)
        .slice(0, 2)
        .map((c) => CONCERN_SHORT[c]);
    }
    if (!improvements.length) improvements = ["Régularité de la routine"];
  }

  const insights = [
    { kind: "good" as const, label: positive },
    ...improvements.map((label) => ({ kind: "warn" as const, label })),
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
          <p className="text-[0.78rem] font-medium uppercase tracking-[0.14em] text-white/45">Score d&apos;équilibre</p>
          <div className="mt-1 flex items-end gap-3">
            <p className="font-display text-[3.4rem] font-bold leading-none text-white">
              <AnimatedNumber value={score} /><span className="text-2xl text-white/30"> /100</span>
            </p>
            <span className="mb-2 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[0.72rem] font-bold text-emerald-300">{scoreLabel}</span>
          </div>
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
            Ta routine sur-mesure et le détail par zone t&apos;attendent à l&apos;intérieur.
          </p>
        </div>
      </div>
    </div>
  );
}
