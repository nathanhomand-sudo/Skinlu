"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/matching";
import type { Concern } from "@/lib/skin-diagnostic";
import type { SkinType } from "@/lib/visual-age";

type RoutineReport = {
  skin_type: SkinType;
  concerns: Concern[];
  top_priority: Concern;
  morning: Product[];
  evening: Product[];
  ai_explanation: string;
  disclaimer: string;
};

const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: "Peau sèche",
  oily: "Peau grasse",
  combination: "Peau mixte",
  sensitive: "Peau sensible",
  normal: "Peau normale",
};

const CONCERN_LABELS: Record<Concern, string> = {
  acne: "Imperfections",
  dehydration: "Déshydratation",
  dark_spots: "Taches",
  aging: "Signes de l'âge",
  sensitivity: "Sensibilité",
  dullness: "Teint terne",
  enlarged_pores: "Pores visibles",
};

const FORECAST_TIPS: Record<Concern, [string, string, string]> = {
  dehydration: [
    "Les tiraillements matinaux s'atténuent dès la 2e semaine avec un sérum hydratant.",
    "À 4 semaines, ta peau retient mieux l'eau et le fond de teint tient plus longtemps.",
    "Boire 1,5 L/j amplifie les effets de la routine topique.",
  ],
  acne: [
    "Les imperfections légères commencent à s'estomper en 2–3 semaines.",
    "Ne change pas de produits avant les 4 semaines — la peau doit s'adapter.",
    "Le SPF quotidien est essentiel pour éviter les cicatrices post-acné.",
  ],
  dark_spots: [
    "Les taches superficielles s'éclaircissent progressivement à partir de la 3e semaine.",
    "La régularité est clé : une application manquée ralentit les résultats.",
    "SPF 50 tous les matins est non négociable pour freiner la mélanogenèse.",
  ],
  aging: [
    "La fermeté s'améliore en 4–6 semaines avec un sérum peptides ou rétinoïde.",
    "Les rides d'expression paraissent moins marquées dès la 3e semaine.",
    "L'hydratation booste l'éclat visiblement avant même d'agir en profondeur.",
  ],
  sensitivity: [
    "Les rougeurs réactives diminuent après 2 semaines sans irritants.",
    "Introduis les actifs un par un — jamais deux nouveautés en même temps.",
    "Une barrière cutanée renforcée se construit en 4 à 8 semaines.",
  ],
  dullness: [
    "L'éclat revient vite — souvent dès la 1re semaine avec un bon sérum Vitamine C.",
    "L'exfoliation douce 2×/semaine accélère le renouvellement cellulaire.",
    "À 4 semaines, le teint est visiblement plus unifié et lumineux.",
  ],
  enlarged_pores: [
    "Les pores semblent plus resserrés après 3 semaines avec un nettoyant BHA.",
    "La niacinamide réduit la production de sébum — résultats à 4–6 semaines.",
    "Évite les comédons express : ça aggrave les pores à long terme.",
  ],
};

const MORNING_STEP_LABELS = ["Nettoyer", "Traitement", "Hydrater", "SPF / Finition"];
const EVENING_STEP_LABELS = ["Démaquiller", "Traitement nuit", "Nourrir", "Finir"];

export default function RoutineClient({ token }: { token: string }) {
  const [routine, setRoutine] = useState<RoutineReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: token }),
    })
      .then((r) => r.json())
      .then((data: RoutineReport & { error?: string }) => {
        if (data.error) {
          setError(
            data.error === "report_locked"
              ? "Paiement en cours de validation. Rafraîchis la page dans quelques secondes."
              : "Impossible de charger ta routine.",
          );
        } else {
          setRoutine(data);
        }
      })
      .catch(() => setError("Impossible de charger ta routine."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleShare() {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: false,
        backgroundColor: null,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return; }
        const file = new File([blob], "skinlu-diagnostic.png", { type: "image/png" });
        if (
          typeof navigator.share === "function" &&
          navigator.canShare?.({ files: [file] })
        ) {
          await navigator.share({ files: [file], title: "Mon diagnostic Skinlu" });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "skinlu-diagnostic.png";
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, "image/png");
    } catch {
      setSharing(false);
      alert(
        "Fais une capture d'écran de la carte ci-dessus pour la partager sur TikTok !",
      );
    }
  }

  async function handleCopy() {
    if (!routine) return;
    const lines = [
      `Ma routine Skinlu · ${SKIN_TYPE_LABELS[routine.skin_type]}`,
      `Priorité : ${CONCERN_LABELS[routine.top_priority]}`,
      "",
      "☀ MATIN",
      ...routine.morning.map((p, i) => `${i + 1}. ${p.brand} — ${p.name}${p.price_eur != null ? ` (${p.price_eur.toFixed(2)} €)` : ""}`),
      "",
      "☽ SOIR",
      ...routine.evening.map((p, i) => `${i + 1}. ${p.brand} — ${p.name}${p.price_eur != null ? ` (${p.price_eur.toFixed(2)} €)` : ""}`),
      "",
      "skinlu.app",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard non disponible
    }
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <main className="routine-page">
        <Nav />
        <div className="routine-loading">
          <div className="diagnostic-spinner" role="status">
            <div className="spinner-ring" />
            <p className="spinner-label">Chargement de ta routine…</p>
            <p className="spinner-sub">Ta routine personnalisée arrive</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !routine) {
    return (
      <main className="routine-page">
        <Nav />
        <div className="routine-error">
          <p>{error ?? "Routine introuvable."}</p>
          <button
            className="hero-cta"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </button>
          <a href="/" className="routine-back">
            Retour à l&apos;accueil
          </a>
        </div>
      </main>
    );
  }

  const tips = FORECAST_TIPS[routine.top_priority];

  return (
    <main className="routine-page">
      <Nav />

      {/* ── SHARE CARD ─────────────────────────────────────────── */}
      <div className="routine-share-wrap">
        <div className="routine-share-card" ref={shareCardRef}>
          <div className="rsc-top">
            <span className="rsc-label">Diagnostic peau · IA</span>
            <span className="rsc-logo-wm">Skinlu</span>
          </div>
          <div className="rsc-skin-type">
            {SKIN_TYPE_LABELS[routine.skin_type]}
          </div>
          <div className="rsc-priority-block">
            <small>Priorité identifiée</small>
            <strong>{CONCERN_LABELS[routine.top_priority]}</strong>
          </div>
          <div className="rsc-concerns">
            {routine.concerns.map((c) => (
              <span key={c}>{CONCERN_LABELS[c]}</span>
            ))}
          </div>
          <div className="rsc-footer">
            <span>skinlu.app</span>
            <span>{today}</span>
          </div>
        </div>

        <div className="routine-actions">
          <button
            className="share-btn"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? "Préparation…" : "Partager mon diagnostic"}
          </button>
          <button
            className="copy-btn"
            onClick={() => void handleCopy()}
            disabled={copied}
          >
            {copied ? "Routine copiée ✓" : "Copier ma routine"}
          </button>
          <p className="share-note">
            Screenshot la carte · Copie ta liste · Rien de personnel
          </p>
        </div>
      </div>

      {/* ── AM/PM ROUTINES ─────────────────────────────────────── */}
      <section className="routine-grid-section">
        <div className="routine-grid">
          <RoutineCol
            label="☀ Matin"
            products={routine.morning}
            isMorning={true}
          />
          <RoutineCol
            label="☽ Soir"
            products={routine.evening}
            isMorning={false}
          />
        </div>
      </section>

      {/* ── 4 SEMAINES ─────────────────────────────────────────── */}
      <section className="skin-forecast">
        <span className="eyebrow">Ta peau dans 4 semaines</span>
        <h3>Ce que tu peux attendre</h3>
        <ul className="forecast-list">
          {tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div className="routine-footer">
        <p className="routine-disclaimer">{routine.disclaimer}</p>
        <a href="/" className="routine-back">
          Nouveau diagnostic →
        </a>
      </div>
    </main>
  );
}

function Nav() {
  return (
    <nav className="routine-nav">
      <a href="/" className="routine-nav-logo">
        Skinlu
      </a>
    </nav>
  );
}

function RoutineCol({
  label,
  products,
  isMorning,
}: {
  label: string;
  products: Product[];
  isMorning: boolean;
}) {
  const stepLabels = isMorning ? MORNING_STEP_LABELS : EVENING_STEP_LABELS;
  return (
    <div className="routine-col">
      <div className="routine-col-heading">
        <span className="routine-time">{label}</span>
        <span className="routine-time-count">
          {products.length} étape{products.length !== 1 ? "s" : ""}
        </span>
      </div>
      {products.length === 0 ? (
        <p className="routine-empty">
          Catalogue produits à compléter dans Supabase.
        </p>
      ) : (
        products.map((p, i) => (
          <ProductCard key={p.id} product={p} step={i + 1} stepLabel={stepLabels[i]} />
        ))
      )}
    </div>
  );
}

function ProductCard({ product, step, stepLabel }: { product: Product; step: number; stepLabel?: string }) {
  return (
    <article className="rp-card">
      <div className="rp-card-img-wrap">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            className="rp-card-img"
            loading="lazy"
          />
        ) : (
          <div className="rp-card-img-placeholder" />
        )}
        <span className="rp-card-step">{step}</span>
      </div>
      <div className="rp-card-body">
        {stepLabel && <span className="rp-card-step-label">{stepLabel}</span>}
        <span className="rp-card-brand">{product.brand}</span>
        <strong className="rp-card-name">{product.name}</strong>
        {product.price_eur != null && (
          <span className="rp-card-price">
            {product.price_eur.toFixed(2)} €
          </span>
        )}
      </div>
      <a
        href={product.affiliate_url}
        className="rp-card-cta"
        target="_blank"
        rel="noreferrer"
      >
        Voir le produit →
      </a>
    </article>
  );
}
