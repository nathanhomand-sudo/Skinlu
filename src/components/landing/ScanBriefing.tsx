"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { Button } from "@/components/ui";
import { QuestionPrompt, type QuestionConfig, type QuestionAnswer } from "@/components/ui/question-prompt";

/* Briefing avant analyse — questions rendues par le composant QuestionPrompt
   (logique fournie : single/multi, badges A/B/C) restylé premium Skinlu.
   Flow : intro → questions → photo guidée → analyse → /v2/result.
   Isolé du produit (ne touche pas scan/API/Supabase/Stripe). */

const opt = (labels: string[]) => labels.map((l, i) => ({ id: `o${i}`, label: l }));

const QUESTIONS: QuestionConfig[] = [
  { kind: "single", title: "Aujourd'hui, ta peau te semble plutôt…", options: opt(["Comme d'habitude", "Plus brillante", "Plus sèche / tendue", "Plus sensible", "Plus fatiguée"]) },
  { kind: "single", title: "Ces derniers jours, tu as remarqué un changement ?", options: opt(["Non, c'est stable", "Plus d'imperfections", "Plus de rougeurs", "Plus de sécheresse", "Teint plus terne"]) },
  { kind: "single", title: "Au toucher, ta peau est plutôt…", options: opt(["Confortable", "Un peu rugueuse", "Grasse par endroits", "Sèche par endroits", "Réactive / inconfortable"]) },
  { kind: "multi", title: "Ces dernières 24h, qu'est-ce qui a pu influencer ta peau ?", minSelections: 1, options: opt(["Peu de sommeil", "Stress", "Alcool / repas sucré ou gras", "Sport / transpiration", "Rien de particulier"]) },
  { kind: "single", title: "Tu veux qu'on observe surtout…", options: opt(["L'équilibre général", "Le teint / l'éclat", "La texture", "Les imperfections", "Les zones sensibles"]) },
  { kind: "single", title: "Ta routine actuelle est plutôt…", options: opt(["Je ne fais presque rien", "Simple", "Régulière", "Trop chargée", "Je change souvent de produits"]) },
];

type Phase = "intro" | "questions" | "photo";

export function ScanBriefing() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>(QUESTIONS.map((q) => ({ kind: q.kind, selectedIds: [] })));
  const [analyzing, setAnalyzing] = useState(false);
  const total = QUESTIONS.length;

  const onAnswer = (ans: QuestionAnswer) => {
    setAnswers((prev) => prev.map((a, i) => (i === step ? ans : a)));
    if (step < total - 1) setStep((s) => s + 1);
    else setPhase("photo");
  };
  const goBack = () => (step === 0 ? setPhase("intro") : setStep((s) => s - 1));

  const capture = () => {
    setAnalyzing(true);
    setTimeout(() => router.push("/v2/result"), 1700);
  };

  const safe: React.CSSProperties = {
    paddingTop: "max(env(safe-area-inset-top), 20px)",
    paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: "@keyframes sb-sweep{0%{top:8%;opacity:0}15%{opacity:1}85%{opacity:1}100%{top:86%;opacity:0}}.cs-scan-sweep{animation:sb-sweep 1.6s ease-in-out infinite}" }} />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 h-[480px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-60"
        style={{ background: "radial-gradient(closest-side, rgba(15,107,95,.26), transparent)" }}
      />

      {/* ── INTRO ───────────────────────────────── */}
      {phase === "intro" && (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6" style={safe}>
          <div className="text-center">
            <h1 className="font-display text-[clamp(2rem,7vw,2.9rem)] font-bold leading-[1.08] text-white">
              Ta peau n&apos;est pas le problème.
            </h1>
            <p className="mx-auto mt-5 max-w-sm text-[1.02rem] leading-relaxed text-white/60">
              Réponds à quelques questions, prends une photo guidée, puis Skinlu repère tes zones
              visibles et construit ta routine — pour arrêter de choisir au hasard.
            </p>
            <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-left">
              <p className="text-[0.9rem] leading-relaxed text-white/55">
                Ta peau peut changer selon la journée. Ces réponses nous aident à lire l&apos;image
                avec plus de contexte.
              </p>
            </div>
            <div className="mt-8">
              <Button variant="primary" size="lg" className="w-full" onClick={() => setPhase("questions")}>
                Commencer le briefing
              </Button>
              <p className="mt-3 text-[0.78rem] text-white/40">6 questions · moins d&apos;une minute</p>
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTIONS ───────────────────────────── */}
      {phase === "questions" && (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-6" style={safe}>
          {/* Header : retour + progression */}
          <div className="flex shrink-0 items-center gap-3 pt-2">
            <button
              type="button"
              onClick={goBack}
              aria-label="Retour"
              className="flex h-9 w-9 shrink-0 select-none appearance-none items-center justify-center rounded-full border border-white/10 bg-transparent text-white/60 outline-none transition hover:text-white focus:outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400/70 to-emerald-300 transition-all duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
            </div>
            <span className="shrink-0 text-[0.78rem] font-semibold tabular-nums text-white/45">{step + 1}/{total}</span>
          </div>

          {/* Question (composant fourni, restylé) */}
          <QuestionPrompt
            key={step}
            questions={QUESTIONS}
            questionIndex={step + 1}
            totalQuestions={total}
            initialAnswer={answers[step]}
            onSubmit={onAnswer}
            submitLabel="Voir mon analyse"
            nextLabel="Continuer"
          />
        </div>
      )}

      {/* ── PHOTO GUIDÉE → ANALYSE ──────────────── */}
      {phase === "photo" && (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6" style={safe}>
          <div className="text-center">
            <h1 className="font-display text-[clamp(1.7rem,5.5vw,2.3rem)] font-bold leading-tight text-white">
              {analyzing ? "Analyse en cours…" : "On passe à ta photo."}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[0.95rem] leading-relaxed text-white/55">
              {analyzing
                ? "On lit tes zones visibles et on les croise avec tes réponses."
                : "Centre ton visage dans le cadre. Le scan observe uniquement ce qui est visible aujourd'hui."}
            </p>

            <div className="mt-7 flex justify-center">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black" style={{ width: "min(300px, 100%)", aspectRatio: "3 / 4" }}>
                <NextImage src="/faces/scan-guide.webp" alt="" fill priority sizes="300px"
                  style={{ objectFit: "cover", objectPosition: "center" }} className={analyzing ? "opacity-95" : "opacity-80"} />
                <div className="absolute inset-0" style={{ background: "radial-gradient(62% 58% at 50% 46%, transparent 62%, rgba(0,0,0,.55))" }} />
                <div className="absolute rounded-[50%] border-2 border-dashed border-white/40" style={{ left: "50%", top: "48%", width: "62%", height: "68%", transform: "translate(-50%,-50%)" }} />
                {[["left-4 top-4", "border-l-2 border-t-2"], ["right-4 top-4", "border-r-2 border-t-2"], ["left-4 bottom-4", "border-l-2 border-b-2"], ["right-4 bottom-4", "border-r-2 border-b-2"]].map(([pos, b], i) => (
                  <span key={i} className={`absolute h-6 w-6 rounded-[3px] border-white/50 ${pos} ${b}`} />
                ))}
                {analyzing && (
                  <div className="cs-scan-sweep pointer-events-none absolute inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(94,234,212,.9), transparent)", boxShadow: "0 0 14px 2px rgba(94,234,212,.6)" }} />
                )}
              </div>
            </div>

            <div className="mt-8">
              {analyzing ? (
                <div className="flex items-center justify-center gap-2 text-white/55">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-300" />
                  <span className="text-[0.9rem] font-medium">Analyse en cours…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Button variant="primary" size="lg" className="w-full" onClick={capture}>
                    Lancer mon analyse
                  </Button>
                  <button type="button" onClick={() => { setPhase("questions"); setStep(total - 1); }} style={{ WebkitTapHighlightColor: "transparent" }} className="select-none appearance-none border-0 bg-transparent text-[0.82rem] font-medium text-white/50 underline-offset-4 outline-none transition hover:text-white/80 hover:underline focus:outline-none">
                    Revoir mes réponses
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
