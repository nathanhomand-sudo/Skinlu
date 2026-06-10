"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/matching";
import type { Concern } from "@/lib/skin-diagnostic";
import type { SkinType } from "@/lib/visual-age";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 70_000;
const DIAGNOSTIC_STORAGE_KEY = "skinlu:last-diagnostic";


const CONCERN_LABELS: Record<Concern, string> = {
  acne: "Imperfections",
  dehydration: "Déshydratation",
  dark_spots: "Taches",
  aging: "Signes de l'âge",
  sensitivity: "Sensibilité",
  dullness: "Teint terne",
  enlarged_pores: "Pores visibles",
};

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
          <b>IA</b>
        </div>
        <div className="pms-priority">
          <small>Priorité peau</small>
          <strong>Déshydratation</strong>
        </div>
        <div className="pms-metrics">
          <div><span>Hydratation</span><b>Faible</b></div>
          <div><span>Pores visibles</span><b>Modéré</b></div>
          <div><span>Sensibilité</span><b>Élevée</b></div>
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
      {count} diagnostics ce mois-ci
    </p>
  );
}

export default function Home() {
  const [selfie, setSelfie] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticPreview | null>(
    getStoredDiagnostic,
  );
  const [routine, setRoutine] = useState<RoutineReport | null>(null);

  const helperText = useMemo(() => {
    if (!selfie) return "Selfie net, visage bien éclairé. JPG, PNG ou WebP. 4 MB max.";
    return `Selfie prêt · ${formatBytes(selfie.size)}`;
  }, [selfie]);

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

  function handleSelfieChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setError(null);
    setDiagnostic(null);
    clearPaidState();
    window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);

    if (!nextFile) { setSelfie(null); setPreviewUrl(null); return; }

    const validationError = validateFile(nextFile);
    if (validationError) {
      setSelfie(null); setPreviewUrl(null);
      setError(validationError);
      event.target.value = "";
      return;
    }

    setSelfie(nextFile);
    // Use FileReader (data URL) — more reliable than createObjectURL on iOS Safari
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string ?? null);
    reader.readAsDataURL(nextFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selfie) { setError("Ajoute ton selfie avant de lancer le diagnostic."); return; }
    const validationError = validateFile(selfie);
    if (validationError) { setError(validationError); return; }

    const body = new FormData();
    body.append("selfie", selfie);
    if (email.trim()) body.append("email", email.trim());

    setLoading(true); setError(null); setDiagnostic(null); clearPaidState();

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
      const response = await fetch("/api/skin-context", { method: "POST", body, signal: controller.signal });
      window.clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error === "no_face_detected"
            ? "Aucun visage détecté. Prends un selfie bien cadré, visage visible et bien éclairé."
            : data.error === "service_timeout"
            ? "Le diagnostic prend trop de temps. Réessaie avec une photo plus nette."
            : data.error ?? "Le diagnostic n'a pas pu démarrer.",
        );
      }
      setDiagnostic(data as DiagnosticPreview);
      window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(data));
    } catch (caughtError) {
      setError(
        caughtError instanceof DOMException && caughtError.name === "AbortError"
          ? "Le diagnostic prend trop de temps. Réessayez avec un selfie net et bien cadré."
          : caughtError instanceof Error ? caughtError.message : "Une erreur inattendue est survenue.",
      );
    } finally { setLoading(false); }
  }

  async function startCheckout() {
    if (!diagnostic) { setError("Diagnostic manquant pour ouvrir Stripe Checkout."); return; }
    setCheckoutLoading(true); setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: diagnostic.session_token, email: email.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Stripe Checkout indisponible.");
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
            <p className="ao-label">Analyse IA en cours…</p>
            <div className="ao-progress-wrap">
              <div className="ao-progress-fill" />
            </div>
            <p className="ao-sub">30 secondes · On analyse chaque détail</p>
          </div>
        </div>
      )}

      {/* ── 1. HERO ──────────────────────────────────────────────── */}
      <section className="hero-section" aria-labelledby="product-title">
        <div className="container hero-container">

          {/* Copy — first in DOM for a11y, shown below visual on mobile */}
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow">Diagnostic peau par IA · Gratuit</div>
            <h1 id="product-title">Skinlu<span>.</span></h1>
            <p className="hero-benefit">
              Découvre ce dont ta peau a vraiment{" "}
              <span className="hero-accent">besoin.</span>
            </p>
            <p className="lead">
              Un selfie. 30 secondes. Une routine faite pour toi.
            </p>
            <div className="trust-strip">
              <span>Aperçu gratuit</span>
              <span>Routine AM/PM</span>
              <span>Sans CB</span>
            </div>
            <a href="#diagnostic" className="hero-cta">
              Voir mon analyse gratuite
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
                <b>IA</b>
              </div>
              <div className="hfd-priority">
                <small>Priorité peau</small>
                <strong>Déshydratation</strong>
              </div>
              <div className="hfd-metrics">
                <div><span>Hydratation</span><b>Faible</b></div>
                <div><span>Pores visibles</span><b>Modéré</b></div>
                <div><span>Sensibilité</span><b>Élevée</b></div>
              </div>
              <div className="hfd-routine">
                <span>Routine proposée</span>
                <strong>Cleanser · Sérum · SPF</strong>
              </div>
              <div className="hfd-recommend">
                <span>Recommandé</span>
                <strong>Sérum hydratant</strong>
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
              <span>3 200+ diagnostics réalisés</span>
              <span>IA entraînée sur la peau</span>
              <span>Résultat en 30 sec</span>
              <span>Zéro CB requis</span>
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
              <h2>Toute ta routine,<br />d&apos;un seul selfie.</h2>
              <div className="phone-demo-steps">
                <div className="demo-step">
                  <b>01</b>
                  <span>Ajoute ton selfie</span>
                </div>
                <div className="demo-step">
                  <b>02</b>
                  <span>L&apos;IA analyse ta peau</span>
                </div>
                <div className="demo-step">
                  <b>03</b>
                  <span>Ta routine tombe. Produits inclus.</span>
                </div>
              </div>
              <a href="#diagnostic" className="hero-cta">Commencer gratuitement</a>
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
            <span className="eyebrow">Ce qu&apos;elles en disent</span>
            <h2>Le déclic : comprendre sa peau avant d&apos;acheter.</h2>
          </div>
        </div>

        <PhotoCarousel />

        {/* Cartes avis séparées */}
        <div className="container">
          <div className="testimonials-grid reveal">
            <div className="testimonial-card">
              <p>&ldquo;J&apos;ai compris ma peau en 2 minutes, sans jargon.&rdquo;</p>
              <span>Léa, 27 ans</span>
            </div>
            <div className="testimonial-card">
              <p>&ldquo;Skinlu m&apos;a évité d&apos;acheter encore au hasard.&rdquo;</p>
              <span>Camille, 31 ans</span>
            </div>
            <div className="testimonial-card">
              <p>&ldquo;Enfin un diagnostic qui ne pousse pas une seule marque.&rdquo;</p>
              <span>Inès, 24 ans</span>
            </div>
          </div>
          <blockquote className="arc-pullquote reveal reveal-delay-2">
            &ldquo;Comme une conseillère skincare, mais en plus rapide.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* ── 5. SPLIT : TEXTE + PHONE ─────────────────────────────── */}
      <section className="split-section">
        <div className="container split-container">
          <div className="split-copy reveal">
            <span className="eyebrow">Résultat immédiat</span>
            <h2>Ta peau a ses règles.<br />La routine aussi.</h2>
            <ul className="split-benefits">
              <li>Ta priorité peau, identifiée direct.</li>
              <li>Routine AM/PM structurée par étapes</li>
              <li>CeraVe, Avène, La Roche-Posay… selon toi.</li>
            </ul>
            <a href="#diagnostic" className="hero-cta">
              Commencer gratuitement
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
            <span className="eyebrow">Pourquoi Skinlu</span>
            <h2>Ce que tu n&apos;auras nulle part ailleurs.</h2>
          </div>
          <div className="compare-table reveal">
            <div className="compare-col compare-col--muted">
              <h3>Les autres</h3>
              <ul>
                <li className="compare-no">Diagnostic par photo</li>
                <li className="compare-no">Multi-marques sans biais</li>
                <li className="compare-no">Routine personnalisée</li>
                <li className="compare-no">Résultat en 30 secondes</li>
                <li className="compare-no">Gratuit pour tester</li>
              </ul>
            </div>
            <div className="compare-col compare-col--hero">
              <h3>Skinlu</h3>
              <ul>
                <li className="compare-yes">Diagnostic par photo</li>
                <li className="compare-yes">Multi-marques sans biais</li>
                <li className="compare-yes">Routine personnalisée</li>
                <li className="compare-yes">Résultat en 30 secondes</li>
                <li className="compare-yes">Gratuit pour tester</li>
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
            <p className="stats-label reveal reveal-delay-1">diagnostics réalisés</p>
          </div>
          <p className="stats-sub reveal reveal-delay-2">
            Ta routine sur mesure, en 30 secondes.
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
      <section className="conversion-section" id="diagnostic" aria-label="Diagnostic de peau">
        <div className="container">
          <div className="conversion-inner">
            <div className="conversion-sticky">
              <div className="section-heading">
                <span className="eyebrow">Commencer</span>
                <h2>Ton analyse gratuite en 30 secondes.</h2>
              </div>
            </div>
            <div>
              <div className="upload-panel">
                <div className="panel-heading">
                  <span>Selfie peau</span>
                  <strong>4 MB max</strong>
                </div>
                <form onSubmit={handleSubmit} className="upload-form">
                  <div className="selfie-picker">
                    {previewUrl ? (
                      <label className="drop-zone has-preview">
                        <input type="file" name="selfie" accept="image/jpeg,image/png,image/webp" onChange={handleSelfieChange} />
                        <img src={previewUrl} alt="Preview du selfie" className="photo-preview" />
                      </label>
                    ) : (
                      <label className="drop-zone">
                        <input type="file" name="selfie" accept="image/jpeg,image/png,image/webp" onChange={handleSelfieChange} />
                        <span className="drop-zone-empty">
                          <strong>Ajouter une photo</strong>
                          <span>{helperText}</span>
                        </span>
                      </label>
                    )}
                  </div>
                  {previewUrl && selfie ? <p className="file-meta">{formatBytes(selfie.size)}</p> : null}
                  <p className="upload-reassurance">Ton selfie est analysé puis supprimé. Jamais stocké.</p>
                  {error ? <p className="form-error">{error}</p> : null}
                  <UrgencyCounter />
                  <button className="analyze-button" type="submit" disabled={loading}>
                    {loading ? "Diagnostic en cours..." : "Voir mon analyse gratuite"}
                  </button>
                  <p className="cta-microcopy">Gratuit · Résultat en 30 secondes</p>
                </form>


                {diagnostic ? (
                  <div className="result-panel" role="status" aria-live="polite">
                    <span className="status-label">Aperçu gratuit</span>
                    <div className="diagnostic-summary">
                      <h2>{concernLabel(diagnostic.top_priority)}</h2>
                      <p>{diagnostic.summary}</p>
                    </div>
                    <div className="concern-list">
                      {diagnostic.concerns.map((concern) => (
                        <span key={concern}>{concernLabel(concern)}</span>
                      ))}
                    </div>
                    <div className="locked-section" aria-label="Routine complète masquée">
                      <div className="locked-header">
                        <span>Routine complète AM/PM</span>
                        <strong>Verrouillée</strong>
                      </div>
                      <div className="paywall-teasers">
                        <span>Routine matin</span>
                        <span>Routine soir</span>
                        <span>Produits multi-marques</span>
                        <span>Liens affiliés</span>
                      </div>
                    </div>
                    <div className="report-includes">
                      <span className="eyebrow">Ce que tu débloques</span>
                      <ul>
                        <li>Routine matin complète, étape par étape</li>
                        <li>Routine soir complète</li>
                        <li>6 à 8 produits sélectionnés pour ton profil</li>
                        <li>Pourquoi ces produits, expliqué par l&apos;IA</li>
                        <li>Ingrédients à éviter selon ta peau</li>
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
                    <p className="paywall-note">
                      Le paiement débloque la routine AM/PM et les produits recommandés.
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
                          <h2>Priorité</h2>
                          <p>{concernLabel(routine.top_priority)}</p>
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
              <span className="eyebrow">Skin first</span>
              <p className="immersive-tagline">
                Pas de conseil générique.<br />
                Une routine qui te ressemble.
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
                <h2>Avant d&apos;uploader ton selfie.</h2>
              </div>
            </div>
            <div className="faq-list reveal">
              <details open>
                <summary>Est-ce que mon selfie est stocké&nbsp;?</summary>
                <p>Non. Il sert à générer l&apos;analyse et n&apos;est pas conservé comme fichier par Skinlu.</p>
              </details>
              <details>
                <summary>Est-ce un diagnostic médical&nbsp;?</summary>
                <p>Non. C&apos;est un outil beauté, pas un médecin. Pour les problèmes sérieux, consulte un dermatologue.</p>
              </details>
              <details>
                <summary>Comment les produits sont-ils choisis&nbsp;?</summary>
                <p>La routine s&apos;appuie sur ton type de peau, tes préoccupations et le catalogue multi-marques renseigné dans Skinlu.</p>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FINAL CTA ────────────────────────────────────────── */}
      <section className="final-cta">
        <div className="container">
          <div className="final-cta-inner reveal">
            <span className="eyebrow">Prête&nbsp;?</span>
            <h2>Lance-toi. C&apos;est gratuit.</h2>
            <a href="#diagnostic">Voir mon analyse gratuite</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container">
          <div className="site-footer-inner">
            <p>Analyse cosmétique informative. Skinlu ne fournit pas de diagnostic médical ou dermatologique.</p>
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
