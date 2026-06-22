"use client";

import { forwardRef } from "react";
import NextImage from "next/image";

export const PhoneMockup = forwardRef<HTMLDivElement>(function PhoneMockup(_props, ref) {
  return (
    <div
      ref={ref}
      className="relative h-[520px] w-[260px] rounded-[2.75rem] bg-[#111315] [transform-style:preserve-3d]"
      style={{
        boxShadow:
          "inset 0 0 0 2px #3a3d40, inset 0 0 0 6px #060708, 0 40px 90px -15px rgba(0,0,0,.85), 0 15px 30px -8px rgba(0,0,0,.6)",
      }}
    >
      {/* Hardware buttons */}
      <span className="absolute -left-[2px] top-[100px] h-[24px] w-[2px] rounded-l-sm bg-[#2a2c2e]" />
      <span className="absolute -left-[2px] top-[140px] h-[40px] w-[2px] rounded-l-sm bg-[#2a2c2e]" />
      <span className="absolute -right-[2px] top-[150px] h-[60px] w-[2px] rounded-r-sm bg-[#2a2c2e]" />

      {/* Screen */}
      <div className="absolute inset-[6px] overflow-hidden rounded-[2.35rem] bg-[#0b0f0e]">
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-[6px] z-30 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-black" />

        {/* Photo background */}
        <div className="absolute inset-0">
          <NextImage
            src="/faces/hero-portrait.png"
            alt=""
            fill
            priority
            sizes="260px"
            style={{ objectFit: "cover", objectPosition: "center 18%" }}
            className="opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/80" />
        </div>

        {/* Glass screen glare */}
        <div className="screen-glare pointer-events-none absolute inset-0 z-30" />

        {/* Zone callouts on the photo */}
        <div className="phone-widget absolute left-[18px] top-[78px] flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,.8)]" />
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[0.55rem] font-semibold text-white backdrop-blur-sm">
            Zone T
          </span>
        </div>
        <div className="phone-widget absolute right-[16px] top-[150px] flex items-center gap-1.5">
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[0.55rem] font-semibold text-white backdrop-blur-sm">
            Joues
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,.8)]" />
        </div>

        {/* Bottom UI: priority card + locked routine teaser */}
        <div className="absolute inset-x-0 bottom-0 z-20 grid gap-2 p-3">
          <div className="widget-depth phone-widget rounded-2xl p-3 backdrop-blur-md">
            <span className="text-[0.55rem] font-bold uppercase tracking-[0.1em] text-emerald-300/80">
              Priorité cosmétique
            </span>
            <p className="mt-0.5 text-[0.8rem] font-semibold leading-snug text-white">
              Signes de déshydratation possible
            </p>
          </div>

          <div className="widget-depth phone-widget flex items-center justify-between rounded-2xl px-3 py-2 backdrop-blur-md">
            <div className="grid gap-0.5">
              <span className="text-[0.5rem] font-bold uppercase tracking-[0.08em] text-white/40">
                Routine
              </span>
              <span className="text-[0.7rem] font-semibold text-white/85">Cleanser · Sérum · SPF</span>
            </div>
            <span className="text-[0.85rem]" aria-hidden="true">🔒</span>
          </div>
        </div>
      </div>
    </div>
  );
});
