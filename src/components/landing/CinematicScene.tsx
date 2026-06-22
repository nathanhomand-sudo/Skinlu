"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import NextImage from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Cleanup GSAP synchrone AVANT le démontage React : sinon le pin-spacer
// de ScrollTrigger reste dans le DOM et React plante au removeChild lors
// de la navigation ("NotFoundError: The object can not be found here").
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* Architecture reprise du composant 21st.dev "Cinematic landing Hero"
   (easemize) — scène unique pinnée au scroll : hero → la carte monte et
   grandit en plein écran → téléphone Skinlu central + cards flottantes →
   CTA final. Couleurs adaptées au teal Skinlu sur charbon. Matériaux
   (glass, profondeur, mouse-lighting) repris tels quels. Composant
   propre à /v2 — n'affecte ni Hero.tsx ni la page d'accueil. */


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

  // Timeline cinématique pinnée — useLayoutEffect pour que le cleanup
  // (revert du pin) s'exécute AVANT que React détache le DOM.
  useIsoLayoutEffect(() => {
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
          // Longueur totale du scroll pinné. Plus bas = scène plus rapide /
          // funnel plus court (priorité mobile / TikTok : atteindre le CTA vite).
          end: "+=1500",
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
        .to({}, { duration: 1.2 })
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

    return () => {
      // Tuer les ScrollTriggers + revert (retire le pin-spacer) avant
      // que React ne démonte, sinon removeChild plante à la navigation.
      ScrollTrigger.getAll().forEach((t) => t.kill());
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="cs-root relative flex h-screen w-screen items-center justify-center overflow-hidden text-white"
      style={{ perspective: "1500px", background: "linear-gradient(160deg, #0B0C0D 0%, #0A0A0B 55%, #0B0C0D 100%)" }}
    >
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
            <div className="relative scale-[0.86] sm:scale-95 lg:scale-100">
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
                  {/* Safe area en style inline (les valeurs arbitraires pt-[..]
                      ne s'appliquaient pas de façon fiable). Padding-top large
                      sous l'island, marges latérales pour ne jamais toucher
                      les bords arrondis. */}
                  <div className="flex min-h-0 flex-1 flex-col" style={{ padding: "54px 18px 16px" }}>
                    {/* Header compact : "Analyse" à gauche, "Terminé" à droite */}
                    <div className="flex shrink-0 items-center justify-between pb-3">
                      <span className="text-[0.52rem] font-bold uppercase tracking-[0.24em] text-white/45">Analyse</span>
                      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-400/15 px-2 py-1 text-[0.5rem] font-bold text-emerald-300">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

                      {/* CTA principal DANS l'écran — saute légèrement pour
                          signaler qu'on peut cliquer ; lance le scan */}
                      <button type="button" onClick={onScanClick}
                        className="cs-phone-cta mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[0.74rem] font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #14897A, #1BAE9A)" }}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M3 9V7a2 2 0 0 1 2-2h2M17 5h2a2 2 0 0 1 2 2v2M21 15v2a2 2 0 0 1-2 2h-2M7 19H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" /><circle cx="12" cy="12" r="3" /></svg>
                        Commencer mon scan
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
