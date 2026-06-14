"use client";

/* eslint-disable @next/next/no-img-element */

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Product } from "@/lib/matching";
import type { Concern } from "@/lib/skin-diagnostic";
import type { SkinType } from "@/lib/visual-age";
import SkinScanCabin from "@/components/SkinScanCabin";
import { track } from "@/lib/track";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 70_000;
const DIAGNOSTIC_STORAGE_KEY = "skinlu:last-diagnostic";

const CONCERN_LABELS: Record<Concern, string> = {
  acne: "Imperfections",
  dehydration: "Déshydratation possible",
  dark_spots: "Taches",
  aging: "Signes de l'âge",
  sensitivity: "Sensibilité",
  dullness: "Teint terne",
  enlarged_pores: "Pores visibles",
};

const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: "sèche",
  oily: "grasse",
  combination: "mixte",
  sensitive: "sensible",
  normal: "équilibrée",
};

const PROFILE_QUESTIONS = [
  {
    key: "tight_after_cleansing",
    question: "Après nettoyage, ta peau tire ?",
    options: ["Souvent", "Parfois", "Rarement"],
  },
  {
    key: "shine_area",
    question: "En journée, tu brilles surtout où ?",
    options: ["Zone T", "Partout", "Presque pas"],
  },
  {
    key: "reacts_to_products",
    question: "Ta peau réagit facilement aux nouveaux produits ?",
    options: ["Oui", "Parfois", "Non"],
  },
] as const;

type SkinProfileKey = (typeof PROFILE_QUESTIONS)[number]["key"];
type SkinProfileAnswers = Partial<Record<SkinProfileKey, string>>;

type DiagnosticPreview = {
  session_token: string;
  skin_type: SkinType;
  concerns: Concern[];
  top_priority: Concern;
  summary: string;
  disclaimer: string;
};

type RoutineReport = {
  skin_type: SkinType;
  concerns: Concern[];
  top_priority: Concern;
  morning: Product[];
  evening: Product[];
  ai_explanation: string;
  disclaimer: string;
};

function getStoredDiagnostic() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as DiagnosticPreview;
  } catch {
    window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    return null;
  }
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Format invalide. Utilisez une photo JPG, PNG ou WebP.";
  if (file.size > MAX_FILE_SIZE)
    return "Fichier trop lourd. La taille maximale est de 4 MB.";
  return null;
}

function concernLabel(concern: Concern) {
  return CONCERN_LABELS[concern] ?? concern;
}

function skinTypeLabel(skinType: SkinType) {
  return SKIN_TYPE_LABELS[skinType] ?? skinType;
}

function priorityLabel(concern: Concern) {
  if (concern === "dehydration") return "Signes visibles de déshydratation possible";
  return `Signe visible : ${concernLabel(concern).toLowerCase()}`;
}

function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="empty-routine">
        Aucun produit disponible pour l&apos;instant. Ajoutez le catalogue
        produits dans Supabase pour activer les recommandations.
      </p>
    );
  }
  return (
    <div className="routine-products">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          {product.image_url ? (
            <img src={product.image_url} alt="" className="product-image" />
          ) : null}
          <div>
            <span>{product.brand}</span>
            <strong>{product.name}</strong>
            <small>
              {product.price_eur
                ? `${product.price_eur.toFixed(2)} EUR`
                : "Prix à vérifier"}
            </small>
          </div>
          <a href={product.affiliate_url} target="_blank" rel="noreferrer">
            Voir le produit
          </a>
        </article>
      ))}
    </div>
  );
}

/* ── Phone mockup réaliste ────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="phone-mockup">
      <div className="phone-island" />
      <div className="phone-screen">
        <div className="pms-topbar">
          <span>Skinlu</span>
          <b>Scan</b>
        </div>
        <div className="pms-priority">
          <small>Priorité cosmétique indicative</small>
          <strong>Signes de déshydratation possible</strong>
        </div>
        <div className="pms-metrics">
          <div><span>Type probable</span><b>Mixte</b></div>
          <div><span>Pores visibles</span><b>Oui</b></div>
          <div><span>Sensibilité</span><b>À confirmer</b></div>
        </div>
        <div className="pms-routine">
          <span>Routine proposée</span>
          <strong>Cleanser · Sérum · SPF</strong>
        </div>
      </div>
    </div>
  );
}

/* ── Carousel 3D cylinder ─────────────────────────────────────── */
function PhotoCarousel() {
  const baseImages = [
    "/faces/face-01.png",
    "/faces/face-02.png",
    "/faces/face-03.png",
  ];
  // 6 slots: duplicate for a full cylinder
  const faces = [...baseImages, ...baseImages];
  const n = faces.length; // 6
  const angleStep = 360 / n; // 60°
  const radius = 260; // px

  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => s + 1), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="carousel-3d" aria-hidden="true">
      <div
        className="carousel-cylinder"
        style={{ transform: `rotateY(${-step * angleStep}deg)` }}
      >
        {faces.map((src, i) => (
          <div
            key={i}
            className="carousel-card"
            style={{ transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)` }}
          >
            <img src={src} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}

function UrgencyCounter() {
  const count = useMemo(() => {
    // Deterministic: grows ~8/day from the 1st of the current month — same for all users the same day
    const dayOfMonth = new Date().getDate();
    return 180 + dayOfMonth * 8;
  }, []);
  return (
    <p className="urgency-line">
      <span className="urgency-dot" />
      {count} scans lancés ce mois-ci
    </p>
  );
}

export default function Home() {
  const scanEntryTracked = useRef(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [skinProfile, setSkinProfile] = useState<SkinProfileAnswers>({});
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticPreview | null>(
    getStoredDiagnostic,
  );
  const [routine, setRoutine] = useState<RoutineReport | null>(null);

  useEffect(() => { track("landing_view"); }, []);

  useEffect(() => {
    if (diagnostic) {
      track("free_preview_viewed");
      track("paywall_viewed");
    }
  }, [diagnostic]);

  useEffect(() => {
    const scanSection = document.getElementById("diagnostic");
    if (!scanSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || scanEntryTracked.current) return;
        scanEntryTracked.current = true;
        track("scan_entry");
      },
      { threshold: 0.35 },
    );

    observer.observe(scanSection);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Lock body scroll while AI is analysing
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [loading]);

  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function clearPaidState() { setRoutine(null); }

  function updateSkinProfile(key: SkinProfileKey, value: string) {
    setSkinProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selfie) { setError("Ajoute ton selfie avant de lancer l'analyse."); return; }
    const validationError = validateFile(selfie);
    if (validationError) { setError(validationError); return; }

    const body = new FormData();
    body.append("selfie", selfie);
    if (email.trim()) body.append("email", email.trim());
    if (Object.keys(skinProfile).length > 0) {
      body.append("skin_profile", JSON.stringify(skinProfile));
    }

    setLoading(true); setError(null); setDiagnostic(null); clearPaidState();
    track("analysis_started");

    let analysisTracked = false;
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
      const response = await fetch("/api/skin-context", { method: "POST", body, signal: controller.signal });
      window.clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        track("analysis_error", { error_type: data.error ?? "api_error" });
        analysisTracked = true;
        throw new Error(
          data.error === "no_face_detected"
            ? "Aucun visage détecté. Prends un selfie bien cadré, visage visible et bien éclairé."
            : data.error === "service_timeout"
            ? "L'analyse prend trop de temps. Réessaie avec une photo plus nette."
            : data.error ?? "L'analyse n'a pas pu démarrer.",
        );
      }
      setDiagnostic(data as DiagnosticPreview);
      window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(data));
      track("analysis_success", { skin_type: data.skin_type, top_priority: data.top_priority });
      analysisTracked = true;
    } catch (caughtError) {
      if (!analysisTracked) {
        track("analysis_error", {
          error_type: caughtError instanceof DOMException && caughtError.name === "AbortError"
            ? "timeout"
            : "network",
        });
      }
      setError(
        caughtError instanceof DOMException && caughtError.name === "AbortError"
          ? "L'analyse prend trop de temps. Réessayez avec un selfie net et bien cadré."
          : caughtError instanceof Error ? caughtError.message : "Une erreur inattendue est survenue.",
      );
    } finally { setLoading(false); }
  }

  async function startCheckout() {
    if (!diagnostic) { setError("Analyse manquante pour ouvrir Stripe Checkout."); return; }
    track("checkout_clicked");
    setCheckoutLoading(true); setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: diagnostic.session_token, email: email.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Stripe Checkout indisponible.");
      track("checkout_started");
      window.location.href = data.url;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Stripe Checkout indisponible.");
      setCheckoutLoading(false);
    }
  }

  const unlockReport = useCallback(async (sessionToken: string) => {
    setReportLoading(true); setError(null);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error === "report_locked"
            ? "Paiement en cours de validation. Rechargez dans quelques secondes."
            : data.error ?? "Routine verrouillée.",
        );
      }
      setRoutine(data as RoutineReport);
      track("premium_unlocked");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Routine verrouillée.");
    } finally { setReportLoading(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("session_token");
    if (params.get("payment") === "success" && sessionToken) {
      window.setTimeout(() => void unlockReport(sessionToken), 0);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [unlockReport]);

  return (
    <main className={`site-shell ${diagnostic ? "has-result" : ""}`}>

      {/* ── ANALYSIS OVERLAY (full-screen, locks scroll) ─────────── */}
      {loading && (
        <div className="analysis-overlay" role="status" aria-live="polite" aria-label="Analyse en cours">
          <div className="analysis-overlay-inner">
            <span className="ao-logo">Skinlu</span>
            <div className="ao-spinner-ring" />
            <p className="ao-label">Analyse cosmétique en cours...</p>
            <div className="ao-progress-wrap">
              <div className="ao-progress-fill" />
            </div>
            <p className="ao-sub">30 secondes · Signes visibles, routine plus claire</p>
          </div>
        </div>
      )}

      {/* ── 1. HERO ──────────────────────────────────────────────── */}
      <section className="hero-section" aria-labelledby="product-title">
        <div className="container hero-container">

          {/* Copy — first in DOM for a11y, shown below visual on mobile */}
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow">Skinlu = la fin du skincare au hasard</div>
            <h1 id="product-title">Arrête d&apos;acheter ta skincare au hasard.</h1>
            <p className="lead">
              TikTok te montre quoi acheter. Skinlu t&apos;aide à savoir si ça a vraiment du sens pour toi.
            </p>
            <div className="trust-strip">
              <span>Gratuit</span>
              <span>30s</span>
              <span>Sans compte</span>
              <span>Analyse cosmétique indicative</span>
            </div>
            <p className="hero-microcopy">
              Avant d&apos;acheter encore un produit viral, vérifie si ta peau en a vraiment besoin.
            </p>
            <a href="#diagnostic" className="hero-cta" onClick={() => track("hero_cta_click")}>
              Faire mon scan gratuit
            </a>
          </div>

          {/* Visual — portrait + floating cards UI */}
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-portrait-wrap">
              <img src="/faces/hero-portrait.png" alt="" className="hero-face" />
              <div className="hero-portrait-gradient" />
            </div>

            {/* Floating top-left: routine label */}
            <div className="hero-float-card hero-float-top glass-card">
              <span>Routine matin</span>
              <strong>Cleanser · Sérum · SPF</strong>
            </div>

            {/* Floating bottom-right: diagnostic result */}
            <div className="hero-float-card hero-float-diag glass-card">
              <div className="hfd-header">
                <span>Skinlu</span>
                <b>Scan</b>
              </div>
              <div className="hfd-priority">
                <small>Priorité cosmétique indicative</small>
                <strong>Signes de déshydratation possible</strong>
              </div>
              <div className="hfd-metrics">
                <div><span>Type probable</span><b>Mixte</b></div>
                <div><span>Pores visibles</span><b>Visibles</b></div>
                <div><span>Réactivité</span><b>À confirmer</b></div>
              </div>
              <div className="hfd-routine">
                <span>Routine proposée</span>
                <strong>Cleanser · Sérum · SPF</strong>
              </div>
              <div className="hfd-recommend">
                <span>À vérifier</span>
                <strong>Avant ton prochain achat</strong>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. TRUST BAR ─────────────────────────────────────────── */}
      <section className="trust-section" aria-label="Chiffres Skinlu">
        <div className="container">
          <div className="trust-bar">
            <div className="trust-pills">
              <span>Skincare sans hasard</span>
              <span>Scan gratuit en 30 sec</span>
              <span>Pas de compte</span>
              <span>Pas de promesse médicale</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. PHONE DEMO ────────────────────────────────────────── */}
      <section className="phone-demo-section">
        <div className="container">
          <div className="phone-demo-layout">
            <div className="phone-demo-copy reveal">
              <span className="eyebrow">Comment ça marche</span>
              <h2>Tu arrêtes de choisir dans le bruit.</h2>
              <div className="phone-demo-steps">
                <div className="demo-step">
                  <b>01</b>
                  <span>Fais ton scan</span>
                </div>
                <div className="demo-step">
                  <b>02</b>
                  <span>Skinlu lit les signes visibles</span>
                </div>
                <div className="demo-step">
                  <b>03</b>
                  <span>Tu obtiens une routine claire</span>
                </div>
              </div>
              <a href="#diagnostic" className="hero-cta" onClick={() => track("hero_cta_click")}>
                Faire mon scan gratuit
              </a>
            </div>
            <div className="phone-demo-frame reveal reveal-delay-1">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. PHOTO REEL + AVIS ─────────────────────────────────── */}
      <section className="arc-section">
        <div className="container">
          <div className="section-heading section-heading--center reveal">
            <span className="eyebrow">Le problème</span>
            <h2>Ce n&apos;est pas toujours ta peau. C&apos;est souvent la routine copiée au hasard.</h2>
          </div>
        </div>

        <PhotoCarousel />

        {/* Cartes avis séparées */}
        <div className="container">
          <div className="testimonials-grid reveal">
            <div className="testimonial-card">
              <p>&ldquo;J&apos;ai arrêté d&apos;empiler des produits juste parce qu&apos;ils passaient sur TikTok.&rdquo;</p>
              <span>Léa, 27 ans</span>
            </div>
            <div className="testimonial-card">
              <p>&ldquo;Enfin une routine qui dit quoi faire sans bullshit.&rdquo;</p>
              <span>Camille, 31 ans</span>
            </div>
            <div className="testimonial-card">
              <p>&ldquo;Je vois ce qui est utile avant de sortir la CB.&rdquo;</p>
              <span>Inès, 24 ans</span>
            </div>
          </div>
          <blockquote className="arc-pullquote reveal reveal-delay-2">
            &ldquo;Les réseaux te montrent des produits. Skinlu t&apos;aide à arrêter de choisir dans le bruit.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* ── 5. SPLIT : TEXTE + PHONE ─────────────────────────────── */}
      <section className="split-section">
        <div className="container split-container">
          <div className="split-copy reveal">
            <span className="eyebrow">Aperçu gratuit</span>
            <h2>Tu vois déjà ce qui mérite ton attention.</h2>
            <ul className="split-benefits">
              <li>Type de peau probable.</li>
              <li>Préoccupations visibles.</li>
              <li>Aperçu de routine, sans compte.</li>
            </ul>
            <a href="#diagnostic" className="hero-cta" onClick={() => track("hero_cta_click")}>
              Faire mon scan gratuit
            </a>
          </div>
          <div className="split-phone reveal reveal-delay-1">
            <img src="/skinlu-hero-lifestyle.png" alt="" className="split-lifestyle-img" />
          </div>
        </div>
      </section>

      {/* ── COMPARATIF ───────────────────────────────────────────── */}
      <section className="compare-section">
        <div className="container">
          <div className="section-heading section-heading--center reveal">
            <span className="eyebrow">Ce que tu débloques</span>
            <h2>Une routine exploitable, pas une liste de produits au hasard.</h2>
          </div>
          <div className="compare-table reveal">
            <div className="compare-col compare-col--muted">
              <h3>Gratuit</h3>
              <ul>
                <li className="compare-yes">Type de peau probable</li>
                <li className="compare-yes">Signes visibles</li>
                <li className="compare-yes">Priorité principale</li>
                <li className="compare-yes">Aperçu de routine</li>
              </ul>
            </div>
            <div className="compare-col compare-col--hero">
              <h3>Routine complète</h3>
              <ul>
                <li className="compare-yes">Routine matin/soir</li>
                <li className="compare-yes">Ordre d&apos;application</li>
                <li className="compare-yes">Produits adaptés</li>
                <li className="compare-yes">Erreurs à éviter</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. STATS FULL-BLEED ──────────────────────────────────── */}
      <section className="stats-section">
        <div className="container stats-inner">
          <div className="stats-big">
            <div className="stats-number reveal">3 200</div>
            <p className="stats-label reveal reveal-delay-1">scans lancés</p>
          </div>
          <p className="stats-sub reveal reveal-delay-2">
            Skinlu = la fin du skincare au hasard.
          </p>
          <div className="brand-marquee reveal reveal-delay-3">
            <div className="brand-marquee-track">
              <span>CeraVe</span>
              <span>La Roche-Posay</span>
              <span>Vichy</span>
              <span>Avène</span>
              <span>The Ordinary</span>
              <span>Bioderma</span>
              <span>CeraVe</span>
              <span>La Roche-Posay</span>
              <span>Vichy</span>
              <span>Avène</span>
              <span>The Ordinary</span>
              <span>Bioderma</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. CONVERSION ────────────────────────────────────────── */}
      <section className="conversion-section" id="diagnostic" aria-label="Scan Skinlu">
        <div className="container">
          <div className="conversion-inner">
            <div className="conversion-sticky">
              <div className="section-heading">
                <span className="eyebrow">Scan gratuit</span>
                <h2>Vérifie ta routine avant ton prochain achat viral.</h2>
              </div>
            </div>
            <div>
              <div className="upload-panel">
                <div className="panel-heading">
                  <span>Cabine de scan</span>
                  <strong>4 MB max</strong>
                </div>
                <form onSubmit={handleSubmit} className="upload-form">
                  <SkinScanCabin
                    onSelfieSelected={(file) => {
                      setError(null);
                      setDiagnostic(null);
                      clearPaidState();
                      window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
                      if (!file) { setSelfie(null); setPreviewUrl(null); return; }
                      setSelfie(file);
                      // FileReader (data URL) — more reliable than createObjectURL on iOS Safari
                      const reader = new FileReader();
                      reader.onload = (e) => setPreviewUrl(e.target?.result as string ?? null);
                      reader.readAsDataURL(file);
                    }}
                    onError={(msg) => setError(msg)}
                    previewUrl={previewUrl}
                    disabled={loading}
                  />
                  <div className="skin-profile-card" aria-label="Contexte peau optionnel">
                    <div className="skin-profile-heading">
                      <span>Contexte rapide</span>
                      <strong>Optionnel, mais utile</strong>
                    </div>
                    <div className="skin-profile-grid">
                      {PROFILE_QUESTIONS.map((item) => (
                        <fieldset className="skin-profile-question" key={item.key}>
                          <legend>{item.question}</legend>
                          <div className="skin-profile-options">
                            {item.options.map((option) => (
                              <button
                                type="button"
                                className={
                                  skinProfile[item.key] === option
                                    ? "skin-profile-option is-selected"
                                    : "skin-profile-option"
                                }
                                onClick={() => updateSkinProfile(item.key, option)}
                                disabled={loading}
                                key={option}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </div>
                  {previewUrl && selfie ? <p className="file-meta">{formatBytes(selfie.size)}</p> : null}
                  <p className="upload-reassurance">
                    Analyse cosmétique indicative. Ne remplace pas l&apos;avis d&apos;un professionnel de santé.
                  </p>
                  {error ? <p className="form-error">{error}</p> : null}
                  <UrgencyCounter />
                  <button className="analyze-button" type="submit" disabled={loading}>
                    {loading ? "Analyse en cours..." : "Lancer mon analyse gratuite"}
                  </button>
                  <p className="cta-microcopy">Gratuit · 30s · sans compte</p>
                </form>


                {diagnostic ? (
                  <div className="result-panel" role="status" aria-live="polite">
                    <span className="status-label">Aperçu gratuit</span>
                    <div className="diagnostic-summary">
                      <span className="result-kicker">Priorité cosmétique indicative</span>
                      <h2>{priorityLabel(diagnostic.top_priority)}</h2>
                      <p>{diagnostic.summary}</p>
                    </div>
                    <div className="skin-type-card">
                      <span>Type probable</span>
                      <strong>Ta peau semble {skinTypeLabel(diagnostic.skin_type)}</strong>
                    </div>
                    <div className="concern-list">
                      {diagnostic.concerns.map((concern) => (
                        <span key={concern}>{priorityLabel(concern)}</span>
                      ))}
                    </div>
                    <div className="routine-blur-teaser" aria-hidden="true">
                      <div className="rbt-rows">
                        <div className="rbt-row"><span className="rbt-num">1</span><span className="rbt-text">Nettoyant · matin</span></div>
                        <div className="rbt-row"><span className="rbt-num">2</span><span className="rbt-text">Sérum ciblé · matin</span></div>
                        <div className="rbt-row"><span className="rbt-num">3</span><span className="rbt-text">Crème hydratante</span></div>
                        <div className="rbt-row"><span className="rbt-num">4</span><span className="rbt-text">SPF 50</span></div>
                      </div>
                      <div className="rbt-overlay">
                        <span>Routine verrouillée</span>
                        <span>Débloque pour voir tes produits →</span>
                      </div>
                    </div>
                    <div className="paywall-block">
                      <h3 className="paywall-title">Ta routine sur-mesure est prête.</h3>
                      <p className="paywall-subtitle">Une routine claire pour arrêter de mélanger des produits au hasard.</p>
                      <ul className="paywall-deliverables">
                        <li>Routine matin + soir, étape par étape</li>
                        <li>6 à 8 produits choisis pour toi (toutes gammes de prix)</li>
                        <li>Erreurs à éviter pour ton cas</li>
                        <li>Le pourquoi de chaque étape, expliqué simplement</li>
                      </ul>
                    </div>
                    <label className="email-field unlock-email">
                      <span>Email pour recevoir ta routine</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@email.com"
                      />
                    </label>
                    <button className="stripe-button" type="button" onClick={startCheckout} disabled={checkoutLoading}>
                      {checkoutLoading ? "Ouverture de Stripe..." : "Voir ma routine complète · 9,99 €"}
                    </button>
                    <p className="paywall-anchor">
                      Moins cher qu&apos;un produit acheté au hasard qui ne te sert pas.
                    </p>
                    {reportLoading ? (
                      <div className="diagnostic-spinner" role="status" aria-live="polite">
                        <div className="spinner-ring" />
                        <p className="spinner-label">Chargement de ta routine…</p>
                      </div>
                    ) : null}
                    {routine ? (
                      <section className="full-report" aria-label="Routine complète">
                        <div className="report-heading">
                          <span>Routine complète</span>
                          <strong>Débloquée</strong>
                        </div>
                        <section className="compatibility-card">
                          <h2>Priorité cosmétique indicative</h2>
                          <p>{priorityLabel(routine.top_priority)}</p>
                        </section>
                        <section className="routine-block">
                          <h2>Matin</h2>
                          <ProductList products={routine.morning} />
                        </section>
                        <section className="routine-block">
                          <h2>Soir</h2>
                          <ProductList products={routine.evening} />
                        </section>
                        <p className="medical-disclaimer">{routine.disclaimer}</p>
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. BANNIÈRE IMMERSIVE ────────────────────────────────── */}
      <section className="immersive-section" aria-label="Ambiance Skinlu">
        <div className="immersive-banner reveal">
          <img src="/faces/banner.png" alt="" aria-hidden="true" className="immersive-img" />
          <div className="immersive-overlay">
            <div className="container">
              <span className="eyebrow">Anti-bullshit</span>
              <p className="immersive-tagline">
                Deviens plus clean<br />
                sans te perdre dans le skincare bullshit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ───────────────────────────────────────────────── */}
      <section className="faq-section">
        <div className="container">
          <div className="faq-inner">
            <div className="faq-heading-sticky">
              <div className="section-heading reveal">
                <span className="eyebrow">Questions fréquentes</span>
                <h2>Avant de lancer ton scan.</h2>
              </div>
            </div>
            <div className="faq-list reveal">
              <details open>
                <summary>Est-ce un résultat médical&nbsp;?</summary>
                <p>Non. C&apos;est une analyse cosmétique indicative des signes visibles. Ça ne remplace pas l&apos;avis d&apos;un professionnel de santé.</p>
              </details>
              <details>
                <summary>Pourquoi faire un scan avant d&apos;acheter&nbsp;?</summary>
                <p>Parce qu&apos;un produit viral peut être bon sans être utile pour toi. Skinlu t&apos;aide à clarifier la priorité avant d&apos;acheter.</p>
              </details>
              <details>
                <summary>Comment les produits sont-ils choisis&nbsp;?</summary>
                <p>La routine s&apos;appuie sur ton type de peau probable, tes préoccupations visibles et le catalogue multi-marques renseigné dans Skinlu.</p>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FINAL CTA ────────────────────────────────────────── */}
      <section className="final-cta">
        <div className="container">
          <div className="final-cta-inner reveal">
            <span className="eyebrow">Avant ton prochain achat</span>
            <h2>Fais ton scan gratuit.</h2>
            <a href="#diagnostic" onClick={() => track("final_cta_click")}>Faire mon scan gratuit</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container">
          <div className="site-footer-inner">
            <p>Analyse cosmétique indicative. Ne remplace pas l&apos;avis d&apos;un professionnel de santé.</p>
            <nav aria-label="Liens légaux">
              <a href="/mentions-legales">Mentions légales</a>
              <a href="/politique-de-confidentialite">Politique de confidentialité</a>
            </nav>
          </div>
        </div>
      </footer>

    </main>
  );
}
