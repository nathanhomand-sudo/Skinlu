import type { Metadata } from "next";

// Zone isolée — exploration landing /v2. Le scope `.v2-dark` (défini
// dans globals.css) bascule tous les tokens Tailwind (bg-surface,
// text-text-primary, border-border…) vers leurs valeurs sombres, sans
// rien changer au reste du site. noindex tant que /v2 n'est pas migré.
export const metadata: Metadata = {
  title: "Skinlu — Scan",
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <div className="v2-dark min-h-screen overflow-x-clip">{children}</div>;
}
