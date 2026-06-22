"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { Button } from "@/components/ui";
import { QuestionPrompt, type QuestionConfig, type QuestionAnswer } from "@/components/ui/question-prompt";
import { ScanCamera } from "@/components/landing/ScanCamera";
import { isOnboarded, setOnboarded } from "@/lib/onboarding";
import { saveProfile } from "@/lib/skin-profile";
import { analyzePhoto, saveResult, clearResult } from "@/lib/scan-result";

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

// Micro-copy pour accompagner (gamification légère)
const ENCOURAGE = ["On commence.", "Ça avance.", "Pile au milieu.", "Plus que quelques-unes.", "Presque fini.", "Dernière question !"];
const ANALYZE_MSGS = ["On lit ta zone T…", "On regarde tes joues…", "On évalue ta texture…", "On croise avec tes réponses…"];

type Phase = "intro" | "questions" | "photo" | "signup";

export function ScanBriefing() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>(QUESTIONS.map((q) => ({ kind: q.kind, selectedIds: [] })));
  const [analyzing, setAnalyzing] = useState(false);
  const [aMsg, setAMsg] = useState(0);
  const [shot, setShot] = useState<string | null>(null);
  const total = QUESTIONS.length;

  // Returning user (déjà onboardé) → on saute intro + questionnaire,
  // on démarre direct sur la photo.
  useEffect(() => {
    if (isOnboarded()) setPhase("photo");
  }, []);

  // Messages qui défilent pendant l'analyse (accompagnement).
  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(() => setAMsg((m) => (m + 1) % ANALYZE_MSGS.length), 520);
    return () => clearInterval(id);
  }, [analyzing]);

  const onAnswer = (ans: QuestionAnswer) => {
    setAnswers((prev) => prev.map((a, i) => (i === step ? ans : a)));
    if (step < total - 1) setStep((s) => s + 1);
    else setPhase("photo");
  };
  const goBack = () => (step === 0 ? setPhase("intro") : setStep((s) => s - 1));

  const capture = async (dataUrl?: string) => {
    if (dataUrl) setShot(dataUrl);
    setAnalyzing(true);
    clearResult();
    const labels = buildLabels();
    const minWait = new Promise((r) => setTimeout(r, 1500)); // durée mini de l'écran d'analyse
    // Analyse réelle de l'image (OpenAI Vision) ; si échec → fallback profil dérivé.
    const result = dataUrl ? await analyzePhoto(dataUrl, labels) : null;
    if (result) saveResult(result);
    saveProfile(labels); // toujours dispo en fallback
    await minWait;
    // 1re fois → signup ; returning user déjà inscrit → direct résultat.
    if (isOnboarded()) router.push("/v2/result");
    else setPhase("signup");
  };

  // Labels sélectionnés par question (pour personnaliser le résultat).
  const buildLabels = () =>
    answers.map((a, i) =>
      (a.selectedIds ?? [])
        .map((id) => QUESTIONS[i].options?.find((o) => o.id === id)?.label ?? "")
        .filter(Boolean),
    );

  // Signup démo : on sauvegarde le profil (réponses → priorité), on pose le
  // flag, puis on montre le résultat personnalisé.
  const completeSignup = () => {
    saveProfile(buildLabels());
    setOnboarded();
    router.push("/v2/result");
  };

  const safe: React.CSSProperties = {
    paddingTop: "max(env(safe-area-inset-top), 20px)",
    paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
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
        <div className="relative z-10 mx-auto flex max-w-md flex-col px-6" style={{ ...safe, minHeight: "100svh" }}>
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
          <p className="mt-2 shrink-0 text-[0.72rem] font-medium text-emerald-300/70">{ENCOURAGE[step]}</p>

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
                ? ANALYZE_MSGS[aMsg]
                : "Centre ton visage dans le cadre. Le scan observe uniquement ce qui est visible aujourd'hui."}
            </p>

            {analyzing ? (
              <>
                {/* Frame figée (photo capturée) + sweep d'analyse */}
                <div className="mt-7 flex justify-center">
                  <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black" style={{ width: "min(300px, 100%)", aspectRatio: "3 / 4" }}>
                    {shot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shot} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <NextImage src="/faces/scan-guide.webp" alt="" fill priority sizes="300px" style={{ objectFit: "cover", objectPosition: "center" }} className="opacity-95" />
                    )}
                    <div className="absolute inset-0" style={{ background: "radial-gradient(62% 58% at 50% 46%, transparent 62%, rgba(0,0,0,.55))" }} />
                    <div className="cs-scan-sweep pointer-events-none absolute inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(94,234,212,.9), transparent)", boxShadow: "0 0 14px 2px rgba(94,234,212,.6)" }} />
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-white/55">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-300" />
                  <span className="text-[0.9rem] font-medium">Analyse en cours…</span>
                </div>
              </>
            ) : (
              <>
                {/* Caméra guidée temps réel */}
                <ScanCamera onCapture={capture} />
                <button type="button" onClick={() => { setPhase("questions"); setStep(total - 1); }} style={{ WebkitTapHighlightColor: "transparent" }} className="mt-5 select-none appearance-none border-0 bg-transparent text-[0.82rem] font-medium text-white/50 underline-offset-4 outline-none transition hover:text-white/80 hover:underline focus:outline-none">
                  Revoir mes réponses
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SIGNUP (gate avant le résultat) ──────── */}
      {phase === "signup" && (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6" style={safe}>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-emerald-300">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Analyse prête
            </span>
            <h1 className="font-display mt-5 text-[clamp(1.9rem,6vw,2.7rem)] font-bold leading-[1.1] text-white">
              Crée ton compte pour voir ton analyse.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-[0.98rem] leading-relaxed text-white/60">
              Gratuit. Tu retrouves tes zones, ta priorité et ta routine — et tu suis l&apos;évolution
              de ta peau à chaque scan.
            </p>

            <div className="mt-8 grid gap-2.5">
              {/* Google */}
              <button
                type="button"
                onClick={completeSignup}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className="flex h-14 w-full select-none appearance-none items-center justify-center gap-3 rounded-lg bg-white text-[0.95rem] font-bold text-[#1a1a1a] outline-none transition active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C39.9 36.5 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
                Continuer avec Google
              </button>
              {/* Apple */}
              <button
                type="button"
                onClick={completeSignup}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className="flex h-14 w-full select-none appearance-none items-center justify-center gap-3 rounded-lg bg-black text-[0.95rem] font-bold text-white outline-none ring-1 ring-white/15 transition active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.4 1.6c0 1.1-.4 2.1-1.2 2.9-.9.9-2 1.5-3.1 1.4-.1-1.1.4-2.2 1.1-2.9.8-.9 2.1-1.5 3.2-1.4zM20.6 17c-.5 1.2-.8 1.8-1.5 2.9-1 1.5-2.4 3.4-4.1 3.4-1.5 0-1.9-1-4-1-2 0-2.5 1-4 1-1.7 0-3-1.7-4-3.2-2.8-4.3-3.1-9.4-1.4-12.1 1.2-1.9 3.1-3.1 4.9-3.1 1.8 0 3 1 4.5 1 1.5 0 2.4-1 4.5-1 1.6 0 3.3.9 4.5 2.4-3.9 2.2-3.3 7.8.1 9.7z"/></svg>
                Continuer avec Apple
              </button>
              {/* Email */}
              <button
                type="button"
                onClick={completeSignup}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className="flex h-14 w-full select-none appearance-none items-center justify-center gap-3 rounded-lg border border-white/15 bg-transparent text-[0.95rem] font-bold text-white outline-none transition active:scale-[0.98]"
              >
                <svg className="h-5 w-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                Continuer avec un e-mail
              </button>
            </div>

            <p className="mt-5 text-[0.76rem] text-white/40">Gratuit · Tes données restent privées.</p>
          </div>
        </div>
      )}
    </main>
  );
}
