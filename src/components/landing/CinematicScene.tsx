"use client";

import { useEffect, useRef } from "react";
import NextImage from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* Architecture reprise du composant 21st.dev "Cinematic landing Hero"
   (easemize) — scène unique pinnée au scroll : hero → la carte monte et
   grandit en plein écran → téléphone Skinlu central + cards flottantes →
   CTA final. Couleurs adaptées au teal Skinlu sur charbon. Matériaux
   (glass, profondeur, mouse-lighting) repris tels quels. Composant
   propre à /v2 — n'affecte ni Hero.tsx ni la page d'accueil. */

const STYLES = `
  .cs-reveal { visibility: hidden; }

  .cs-grain {
    position: absolute; inset: 0; pointer-events: none; z-index: 50;
    opacity: 0.045; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
  }

  .cs-grid {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  .cs-glow {
    background: radial-gradient(closest-side, rgba(15,107,95,0.30), transparent);
  }

  /* Typo argentée (hors carte, fond sombre) */
  .cs-silver {
    background: linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.42) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; transform: translateZ(0);
    filter: drop-shadow(0 10px 22px rgba(0,0,0,0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.4));
  }
  .cs-silver-card {
    background: linear-gradient(180deg, #FFFFFF 0%, #9FB7B0 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; transform: translateZ(0);
    filter: drop-shadow(0 12px 24px rgba(0,0,0,0.8)) drop-shadow(0 4px 8px rgba(0,0,0,0.6));
  }

  /* Carte physique profonde, teal Skinlu + mouse-lighting */
  .cs-card {
    background: linear-gradient(150deg, #103A34 0%, #08100E 100%);
    box-shadow:
      0 40px 100px -20px rgba(0,0,0,0.9),
      0 20px 40px -20px rgba(0,0,0,0.8),
      inset 0 1px 2px rgba(255,255,255,0.14),
      inset 0 -2px 4px rgba(0,0,0,0.8);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .cs-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 5;
    background: radial-gradient(700px circle at var(--mx,50%) var(--my,50%), rgba(94,234,212,0.07) 0%, transparent 42%);
    mix-blend-mode: screen;
  }

  /* iPhone */
  .cs-bezel {
    background-color: #111;
    box-shadow:
      inset 0 0 0 2px #3f4a48, inset 0 0 0 7px #000,
      0 40px 80px -15px rgba(0,0,0,0.9), 0 15px 25px -5px rgba(0,0,0,0.7);
    transform-style: preserve-3d;
  }
  .cs-hwbtn {
    background: linear-gradient(90deg, #404040 0%, #171717 100%);
    box-shadow: -2px 0 5px rgba(0,0,0,0.8), inset -1px 0 1px rgba(255,255,255,0.15), inset 1px 0 2px rgba(0,0,0,0.8);
  }
  .cs-glare { background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%); }

  .cs-widget {
    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%);
    box-shadow: 0 10px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.06), inset 0 -1px 1px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .cs-badge {
    background: linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.015) 100%);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.10), 0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.5);
  }

  .cs-ring { transform: rotate(-90deg); transform-origin: center; stroke-dasharray: 326; stroke-dashoffset: 326; stroke-linecap: round; }

  @keyframes cs-sweep { 0% { top: 8%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 78%; opacity: 0; } }
  .cs-scanline { animation: cs-sweep 2.8s ease-in-out infinite; }
  @keyframes cs-cue { 0%,100% { transform: translateY(0); opacity: .55; } 50% { transform: translateY(7px); opacity: 1; } }
  .cs-cue-chevron { animation: cs-cue 1.8s ease-in-out infinite; }
  @keyframes cs-cue-line { 0% { transform: translateY(-100%); } 100% { transform: translateY(320%); } }
  .cs-cue-travel { animation: cs-cue-line 2s ease-in-out infinite; }
  @keyframes cs-pin { 0% { box-shadow: 0 0 0 0 rgba(94,234,212,.5), 0 0 8px rgba(255,255,255,.9); } 70% { box-shadow: 0 0 0 9px rgba(94,234,212,0), 0 0 8px rgba(255,255,255,.9); } 100% { box-shadow: 0 0 0 0 rgba(94,234,212,0), 0 0 8px rgba(255,255,255,.9); } }
  .cs-pindot { animation: cs-pin 2.2s ease-out infinite; }

  /* Fallback statique (prefers-reduced-motion) — pile verticale lisible */
  .cs-root.cs-reduced { height: auto; min-height: 100vh; overflow: visible; display: block; }
  .cs-reduced .cs-reveal { visibility: visible; }
  .cs-reduced .hero-text-wrapper { position: relative; padding: 7rem 1rem 1rem; }
  .cs-reduced .cta-wrapper { position: relative; padding: 4rem 1rem 7rem; }
  .cs-reduced .main-card { position: relative !important; transform: none !important; width: min(1080px,92vw) !important; height: auto !important; border-radius: 36px !important; margin: 2rem auto; }

  @media (prefers-reduced-motion: reduce) {
    .cs-scanline, .cs-cue-chevron, .cs-cue-travel, .cs-pindot { animation: none; }
  }
`;

type Props = { onScanClick: () => void; ctaLabel?: string };

export function CinematicScene({ onScanClick, ctaLabel = "Scanner ma peau gratuitement" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Mouse-lighting sur la carte + tilt du téléphone (desktop seulement)
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const card = cardRef.current;
        const mock = mockupRef.current;
        if (!card || !mock) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
        const xv = (e.clientX / window.innerWidth - 0.5) * 2;
        const yv = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(mock, { rotationY: xv * 10, rotationX: -yv * 10, ease: "power3.out", duration: 1.2 });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Timeline cinématique pinnée
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      rootRef.current?.classList.add("cs-reduced");
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(".cs-reveal", { visibility: "visible" });
      gsap.set(".text-track", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)" });
      gsap.set(".text-days", { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" });
      gsap.set(".scroll-cue", { autoAlpha: 0 });
      gsap.set(".main-card", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set([".card-left-text", ".card-right-text", ".mockup-scroll-wrapper", ".floating-badge", ".phone-widget"], { autoAlpha: 0 });
      gsap.set(".cta-wrapper", { autoAlpha: 0, scale: 0.8, filter: "blur(28px)" });

      gsap.timeline({ delay: 0.25 })
        .to(".text-track", { duration: 1.6, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", ease: "expo.out" })
        .to(".text-days", { duration: 1.3, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" }, "-=0.9")
        .to(".scroll-cue", { duration: 0.8, autoAlpha: 1, ease: "power2.out" }, "-=0.3");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "+=7000",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl
        .to([".hero-text-wrapper", ".cs-grid"], { scale: 1.15, filter: "blur(20px)", opacity: 0.2, ease: "power2.inOut", duration: 2 }, 0)
        .to(".main-card", { y: 0, ease: "power3.inOut", duration: 2 }, 0)
        .to(".main-card", { width: "100%", height: "100%", borderRadius: "0px", ease: "power3.inOut", duration: 1.5 })
        .fromTo(".mockup-scroll-wrapper",
          { y: 300, z: -500, rotationX: 50, rotationY: -28, autoAlpha: 0, scale: 0.6 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 2.5 }, "-=0.8")
        .fromTo(".phone-widget", { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.12, ease: "back.out(1.2)", duration: 1.4 }, "-=1.6")
        .to(".cs-ring", { strokeDashoffset: 88, duration: 2, ease: "power3.inOut" }, "-=1.2")
        .to(".counter-val", { innerHTML: 5, snap: { innerHTML: 1 }, duration: 1.6, ease: "expo.out" }, "-=2.0")
        .fromTo(".floating-badge", { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -8 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: "back.out(1.5)", duration: 1.4, stagger: 0.18 }, "-=2.0")
        .fromTo(".card-left-text", { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power4.out", duration: 1.4 }, "-=1.4")
        .fromTo(".card-right-text", { x: 50, autoAlpha: 0, scale: 0.85 }, { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.4 }, "<")
        .to({}, { duration: 2.5 })
        // Sortie propre : le contenu de la scène s'efface, la carte se fond
        // (PAS de rétrécissement — l'inset-0 se contractait vers le coin
        // haut-gauche et laissait une carte fantôme), puis le CTA apparaît
        // centré sur le fond.
        .set(".hero-text-wrapper", { autoAlpha: 0 })
        .to([".mockup-scroll-wrapper", ".floating-badge", ".card-left-text", ".card-right-text"], { scale: 0.94, y: -30, autoAlpha: 0, ease: "power2.in", duration: 1, stagger: 0.05 })
        .to(".cs-sheen", { autoAlpha: 0, duration: 0.5 }, "<")
        .to(".main-card", { autoAlpha: 0, ease: "power2.inOut", duration: 1.1 }, "-=0.4")
        .fromTo(".cta-wrapper",
          { autoAlpha: 0, scale: 0.85, filter: "blur(20px)" },
          { autoAlpha: 1, scale: 1, filter: "blur(0px)", ease: "expo.out", duration: 1.4 }, "-=0.6")
        .to({}, { duration: 1 });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="cs-root relative flex h-screen w-screen items-center justify-center overflow-hidden text-white"
      style={{ perspective: "1500px", background: "linear-gradient(160deg, #0B0C0D 0%, #0A0A0B 55%, #0B0C0D 100%)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="cs-grain" aria-hidden />
      <div className="cs-grid pointer-events-none absolute inset-0 z-0 opacity-60" aria-hidden />
      <div className="cs-glow pointer-events-none absolute left-1/2 top-[42%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 opacity-70" aria-hidden />

      {/* BEAT 1 — Hero */}
      <div className="hero-text-wrapper absolute z-10 flex w-screen flex-col items-center justify-center px-5 text-center">
        <h1 className="text-track cs-reveal mb-1 text-[clamp(2.4rem,7vw,5.4rem)] font-bold leading-[1.05] tracking-tight text-white/90"
            style={{ textShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
          Arrête de deviner
        </h1>
        <h1 className="text-days cs-reveal font-display text-[clamp(2.4rem,7vw,5.4rem)] font-extrabold leading-[1.05] tracking-tight cs-silver">
          ce dont ta peau a besoin.
        </h1>
        <p className="cs-reveal mt-6 max-w-md text-[1.02rem] leading-relaxed text-white/55" style={{ visibility: "visible" }}>
          Comprends ce que ta peau montre, puis construis une routine plus claire.
        </p>

        {/* Scroll cue raffiné */}
        <div className="scroll-cue absolute bottom-[-22vh] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-[-26vh]">
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/40">Fais défiler</span>
          <span className="relative flex h-9 w-[22px] items-start justify-center overflow-hidden rounded-full border border-white/20 p-1">
            <span className="cs-cue-travel h-1.5 w-1 rounded-full bg-emerald-300/90" />
          </span>
          <svg className="cs-cue-chevron h-3 w-3 text-white/45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* BEAT 3 — CTA final (révélé en fin de scroll) */}
      <div className="cta-wrapper absolute z-10 flex w-screen flex-col items-center justify-center px-5 text-center">
        <h2 className="mb-5 max-w-2xl text-[clamp(1.8rem,5vw,3.4rem)] font-bold leading-[1.1] tracking-tight cs-silver">
          Envie de voir ce que ta peau révèle ?
        </h2>
        <p className="mx-auto mb-9 max-w-xl text-[1.02rem] font-light leading-relaxed text-white/55">
          Un point de départ clair pour arrêter de deviner : tes zones visibles, ta priorité, ta
          routine. Gratuit, en moins d&apos;une minute.
        </p>
        <Button variant="primary" size="lg" onClick={onScanClick}>{ctaLabel}</Button>
      </div>

      {/* BEAT 2 — la carte qui grandit, téléphone Skinlu central */}
      <div ref={cardRef} className="main-card cs-card absolute inset-0 z-20 overflow-hidden rounded-none">
        <div className="cs-sheen" aria-hidden />
        <div className="relative mx-auto h-full w-full max-w-7xl px-6 lg:px-12">

          {/* Mot typo géant — backdrop centré DERRIÈRE le téléphone (réf SOBERS) */}
          <div className="card-right-text cs-reveal pointer-events-none absolute inset-x-0 top-[7%] z-0 flex justify-center sm:top-[5%]">
            <span className="font-display text-[20vw] font-black uppercase leading-none tracking-tighter cs-silver-card opacity-90 lg:text-[17rem]">
              Skinlu
            </span>
          </div>

          {/* Téléphone central, devant le wordmark */}
          <div className="mockup-scroll-wrapper cs-reveal absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: "1200px" }}>
            <div className="relative scale-[0.82] sm:scale-90 lg:scale-100">
              <div ref={mockupRef} className="cs-bezel relative h-[540px] w-[266px] rounded-[2.85rem] [transform-style:preserve-3d]">
                {/* Boutons hardware */}
                <span className="cs-hwbtn absolute -left-[2px] top-[112px] h-[26px] w-[3px] rounded-l-sm" />
                <span className="cs-hwbtn absolute -left-[2px] top-[154px] h-[44px] w-[3px] rounded-l-sm" />
                <span className="cs-hwbtn absolute -right-[2px] top-[166px] h-[64px] w-[3px] rounded-r-sm" />

                {/* Écran — conteneur flex (hauteur garantie par inset) pour que
                    le contenu remplisse vraiment jusqu'au bouton du bas */}
                <div className="absolute inset-[7px] flex flex-col overflow-hidden rounded-[2.4rem] bg-[#0a0e0d]">
                  {/* Dynamic island */}
                  <div className="absolute left-1/2 top-[8px] z-40 h-[24px] w-[92px] -translate-x-1/2 rounded-full bg-black" />

                  {/* ── ÉCRAN RÉSULTAT (ce que l'utilisateur verra) ──
                      Inspiré de la réf : header net + photo hero + cartes
                      espacées. Zones en liste, jamais ancrées sur le visage. */}
                  <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-3.5 pt-[42px]">
                    {/* Header app */}
                    <div className="flex shrink-0 items-center justify-between pb-2.5">
                      <div className="grid gap-0.5">
                        <span className="text-[0.44rem] font-bold uppercase tracking-[0.18em] text-white/40">Ton analyse</span>
                        <span className="font-display text-[1rem] font-bold leading-none tracking-tight text-white">Ta peau</span>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/15 px-1.5 py-1 text-[0.46rem] font-bold text-emerald-300">
                        <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Terminé
                      </span>
                    </div>

                    {/* Photo hero — élément flexible : absorbe l'espace restant
                        pour qu'il n'y ait jamais de vide en bas de l'écran */}
                    <div className="phone-widget relative w-full min-h-[150px] flex-1 overflow-hidden rounded-[1.4rem]">
                      <NextImage src="/faces/face-03.png" alt="" fill priority sizes="252px"
                        style={{ objectFit: "cover", objectPosition: "50% 28%" }} className="opacity-95" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 52%, rgba(10,14,13,.92) 100%)" }} />
                      <div className="cs-glare pointer-events-none absolute inset-0" />
                      <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.56rem] font-semibold text-white backdrop-blur-md">Peau mixte</span>
                    </div>

                    {/* Cartes — compactes sous la photo */}
                    <div className="mt-2.5 flex shrink-0 flex-col gap-2">
                      {/* Priorité */}
                      <div className="phone-widget cs-widget rounded-[1.1rem] px-3.5 py-2.5">
                        <span className="text-[0.5rem] font-bold uppercase tracking-[0.16em] text-emerald-300/85">Ta priorité</span>
                        <p className="mt-0.5 text-[0.95rem] font-bold leading-tight text-white">Hydratation + barrière</p>
                      </div>

                      {/* Zones — chips compacts */}
                      <div className="phone-widget cs-widget rounded-[1.1rem] px-3.5 py-2.5">
                        <span className="text-[0.5rem] font-bold uppercase tracking-[0.16em] text-white/45">4 zones observées</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {[
                            { z: "Zone T", c: "#0F6B5F" },
                            { z: "Joues", c: "#4682C3" },
                            { z: "Front", c: "#6f7d78" },
                            { z: "Texture", c: "#9aa39f" },
                          ].map((r) => (
                            <span key={r.z} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2 py-1 text-[0.56rem] font-medium text-white/80">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.c }} />{r.z}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Routine — étapes AM/PM */}
                      <div className="phone-widget cs-widget rounded-[1.1rem] px-3.5 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.5rem] font-bold uppercase tracking-[0.16em] text-white/45">Ta routine</span>
                          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.48rem] font-bold uppercase tracking-wide text-emerald-300">Prête</span>
                        </div>
                        <div className="mt-1.5 grid gap-1">
                          {[
                            { n: "1", s: "Nettoyant doux" },
                            { n: "2", s: "Sérum hydratant" },
                            { n: "3", s: "Crème · SPF 50" },
                          ].map((r) => (
                            <div key={r.n} className="flex items-center gap-2 text-[0.6rem]">
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/[0.08] text-[0.5rem] font-bold text-white/60">{r.n}</span>
                              <span className="text-white/80">{r.s}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CTA — ancre le bas de l'écran */}
                      <button type="button" tabIndex={-1}
                        className="mt-1 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[0.66rem] font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #0F6B5F, #14897A)", boxShadow: "0 6px 16px rgba(15,107,95,.4)" }}>
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" strokeLinecap="round" /></svg>
                        Voir mon plan complet
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards flottantes (chevauchent le téléphone) */}
              <div className="floating-badge cs-badge absolute -left-12 top-10 z-40 hidden rounded-2xl px-3.5 py-2.5 sm:block">
                <span className="block text-[0.55rem] font-bold uppercase tracking-[0.1em] text-white/45">Étape 1</span>
                <span className="text-[0.8rem] font-semibold text-white">Scan guidé</span>
              </div>

              <div className="floating-badge cs-badge absolute -right-14 top-1/3 z-40 hidden rounded-2xl px-3.5 py-3 sm:block">
                <div className="flex items-center gap-2.5">
                  <svg className="h-9 w-9 -rotate-90" viewBox="0 0 120 120" aria-hidden>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
                    <circle className="cs-ring" cx="60" cy="60" r="52" fill="none" stroke="#5eead4" strokeWidth="10" />
                  </svg>
                  <div className="grid">
                    <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-white/45">Zones lues</span>
                    <span className="font-display text-lg font-bold leading-none text-white"><span className="counter-val">5</span><span className="text-white/40">/5</span></span>
                  </div>
                </div>
              </div>

              <div className="floating-badge cs-badge absolute -bottom-6 left-1/2 z-40 flex w-[200px] -translate-x-1/2 items-center justify-between rounded-2xl px-4 py-2.5">
                <div className="grid gap-0.5">
                  <span className="text-[0.52rem] font-bold uppercase tracking-[0.1em] text-white/45">Suivi</span>
                  <span className="text-[0.76rem] font-semibold text-white">Prochain scan · J+14</span>
                </div>
                <span className="text-emerald-300" aria-hidden>→</span>
              </div>
            </div>
          </div>

          {/* Bloc texte concis — bas, devant tout */}
          <div className="card-left-text cs-reveal absolute inset-x-6 bottom-[5%] z-30 grid gap-2.5 text-center lg:inset-x-12 lg:bottom-[8%] lg:max-w-sm lg:text-left">
            <span className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-emerald-300/90 lg:mx-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Aperçu de ton analyse
            </span>
            <h3 className="font-display text-xl font-bold leading-tight text-white lg:text-[1.8rem]">
              Tu vois enfin ce qui mérite ton attention.
            </h3>
            <p className="mx-auto hidden max-w-sm text-[0.92rem] leading-relaxed text-white/55 sm:block lg:mx-0">
              Zones visibles, priorité claire, routine prête. Skinlu transforme ton scan en point de
              départ clair.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
