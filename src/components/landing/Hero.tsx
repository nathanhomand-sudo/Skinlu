"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui";
import { PhoneMockup } from "./PhoneMockup";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type HeroProps = {
  ctaLabel: string;
  onScanClick: () => void;
};

export function Hero({ ctaLabel, onScanClick }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phoneWrapRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  // Mouse parallax tilt on the phone, while the card is full-screen
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    function handleMove(e: MouseEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const wrap = phoneWrapRef.current;
        const phone = phoneRef.current;
        if (!wrap || !phone) return;
        const rect = wrap.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
        gsap.to(phone, { rotationY: dx * 10, rotationX: -dy * 10, duration: 0.6, ease: "power3.out" });
      });
    }
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Cinematic scroll-pinned timeline. NOTE: this component must be rendered
  // OUTSIDE of any display:flex ancestor (e.g. the site's ".site-shell"
  // flex column wrapper) — GSAP's pin spacer breaks inside that flex
  // context and releases the pin early. Confirmed via isolated test.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set([".hero-text-line", ".main-card", ".mockup-wrap", ".floating-badge", ".phone-widget"], { autoAlpha: 1, clearProps: "all" });
        gsap.set(".cta-wrapper", { autoAlpha: 0 });
        return;
      }

      gsap.set(".hero-text-line", { autoAlpha: 0, y: 50, filter: "blur(16px)" });
      gsap.set(".main-card", { y: "100%", autoAlpha: 1 });
      gsap.set([".mockup-wrap", ".floating-badge", ".phone-widget", ".card-left-text", ".card-right-text"], { autoAlpha: 0 });
      gsap.set(".cta-wrapper", { autoAlpha: 0, scale: 0.85, filter: "blur(20px)" });

      gsap.timeline({ delay: 0.15 })
        .to(".hero-text-line", { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.1, stagger: 0.15, ease: "power3.out" });

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=4200",
          pin: true,
          pinType: "fixed",
          scrub: 1,
          anticipatePin: 1,
        },
      });

      scrollTl
        .to(".hero-text-wrapper", { scale: 1.1, filter: "blur(16px)", autoAlpha: 0, duration: 1.6, ease: "power2.inOut" }, 0)
        .to(".main-card", { y: "0%", duration: 1.6, ease: "power3.inOut" }, 0)
        .to(".main-card", { borderRadius: "0px", duration: 1, ease: "power3.inOut" }, 0.8)
        .fromTo(".mockup-wrap",
          { autoAlpha: 0, y: 220, z: -400, rotationX: 35, scale: 0.7 },
          { autoAlpha: 1, y: 0, z: 0, rotationX: 0, scale: 1, duration: 1.8, ease: "expo.out" },
          "-=0.6")
        .fromTo(".phone-widget", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.15, ease: "back.out(1.4)" }, "-=1.1")
        .fromTo(".card-left-text", { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, duration: 1.1, ease: "power3.out" }, "-=1.1")
        .fromTo(".card-right-text", { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 1.1, ease: "power3.out" }, "<")
        .fromTo(".floating-badge", { autoAlpha: 0, y: 60, scale: 0.7 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1, stagger: 0.18, ease: "back.out(1.5)" }, "-=0.8")
        .to({}, { duration: 1.6 })
        .to([".mockup-wrap", ".floating-badge", ".card-left-text", ".card-right-text"], { autoAlpha: 0, y: -30, scale: 0.92, duration: 0.9, stagger: 0.04, ease: "power3.in" })
        .to(".main-card", { width: "min(560px, 92vw)", height: "70vh", borderRadius: "32px", duration: 1.3, ease: "expo.inOut" }, "pullback")
        .to(".cta-wrapper", { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.3, ease: "expo.inOut" }, "pullback")
        .to({}, { duration: 1 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0B0C0D 0%, #0A0A0B 55%, #0B0C0D 100%)", perspective: "1500px" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: "radial-gradient(60% 50% at 25% 20%, rgba(15,107,95,.3), transparent)" }}
        aria-hidden="true"
      />

      {/* Background layer: intro headline — aspiration, pas le mécanisme produit */}
      <div className="hero-text-wrapper absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="hero-text-line font-display max-w-[760px] text-[clamp(2.2rem,6.5vw,3.6rem)] font-bold leading-[1.1] text-white">
          Ta peau n&apos;est pas le problème.
        </h1>
        <p className="hero-text-line mt-2 max-w-[480px] text-[1rem] leading-relaxed text-white/55">
          Réponds à quelques questions, prends une photo guidée, puis Skinlu repère tes zones
          visibles et construit ta routine — pour arrêter de choisir au hasard.
        </p>
      </div>

      {/* Background layer 2: final CTA, revealed at the end of the scroll sequence */}
      <div className="cta-wrapper absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-5 text-center pointer-events-none">
        <h2 className="font-display max-w-[680px] text-[clamp(1.6rem,4.5vw,2.4rem)] font-bold leading-[1.15] text-white">
          Tu arrêtes de t&apos;en vouloir. Tu comprends ce qui se passe. Tu reprends le contrôle.
        </h2>
        <Button variant="primary" size="lg" onClick={onScanClick} className="pointer-events-auto">
          {ctaLabel}
        </Button>
      </div>

      {/* Foreground: the growing card */}
      <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: "1500px" }}>
        <div
          className="main-card relative h-full w-full overflow-hidden rounded-none"
          style={{
            background: "linear-gradient(150deg, #16181A 0%, #0A0A0B 100%)",
            boxShadow: "0 40px 100px -20px rgba(0,0,0,.9), inset 0 1px 2px rgba(255,255,255,.06)",
          }}
        >
          <div className="grid h-full w-full max-w-7xl grid-cols-1 items-center gap-8 px-6 py-10 mx-auto lg:grid-cols-3 lg:px-12">
            <div className="card-left-text order-2 lg:order-1 grid gap-3 text-center lg:text-left">
              <h3 className="font-display text-2xl font-bold text-white lg:text-3xl">Une routine qui part de ta peau.</h3>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/55 lg:mx-0">
                Pas un conseil générique trouvé sur les réseaux. Skinlu repère tes zones visibles
                et en fait une routine simple à suivre, matin et soir.
              </p>
            </div>

            <div ref={phoneWrapRef} className="mockup-wrap order-1 lg:order-2 relative flex items-center justify-center" style={{ perspective: "1200px" }}>
              <div className="scale-[0.78] md:scale-90 lg:scale-100">
                <PhoneMockup ref={phoneRef} />
              </div>

              <div className="floating-ui-badge floating-badge absolute left-[-10px] top-8 hidden rounded-2xl px-3.5 py-2.5 sm:block">
                <span className="block text-[0.6rem] font-bold uppercase tracking-[0.08em] text-white/40">Priorité détectée</span>
                <span className="text-[0.8rem] font-semibold text-white">Signes de déshydratation</span>
              </div>
              <div className="floating-ui-badge floating-badge absolute right-[-10px] bottom-10 hidden rounded-2xl px-3.5 py-2.5 sm:block">
                <span className="block text-[0.6rem] font-bold uppercase tracking-[0.08em] text-white/40">Routine prête</span>
                <span className="text-[0.8rem] font-semibold text-white">Cleanser · Sérum · SPF</span>
              </div>
            </div>

            <div className="card-right-text order-3 flex justify-center lg:justify-end">
              <span
                className="font-display text-6xl font-black uppercase tracking-tighter text-transparent lg:text-[9rem]"
                style={{
                  backgroundImage: "linear-gradient(180deg, #FFFFFF 0%, #9A9A9F 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  opacity: 0.92,
                  filter: "drop-shadow(0 18px 40px rgba(0,0,0,.45))",
                }}
              >
                Skinlu
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
