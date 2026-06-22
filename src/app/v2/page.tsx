"use client";

import { useRouter } from "next/navigation";
import { CinematicScene } from "@/components/landing/CinematicScene";

// Landing /v2 — une seule scène cinématique continue (pas une suite de
// sections). Le CTA renvoie vers "/" où vit le vrai scan : on ne touche
// pas au flow produit (scan, API, Supabase, Stripe, paywall).
//
// Flow en 3 temps, à l'intérieur d'une scène pinnée :
//   1. Hero (promesse + scroll cue)
//   2. Mockup central = aperçu de valeur (ce que l'utilisateur aura)
//   3. CTA → début de l'expérience scan
//
// Hero.tsx reste dans le repo (branché sur la page d'accueil) mais n'est
// plus utilisé ici : /v2 a sa propre scène cinématique autonome.
export default function LandingV2Page() {
  const router = useRouter();
  return <CinematicScene onScanClick={() => router.push("/")} />;
}
