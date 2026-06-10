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

const SKIN_TYPES: { value: SkinType; label: string }[] = [
  { value: "dry", label: "Sèche" },
  { value: "oily", label: "Grasse" },
  { value: "combination", label: "Mixte" },
  { value: "sensitive", label: "Sensible" },
  { value: "normal", label: "Normale" },
];

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
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);

  if (!stored) {
    return null;
  }

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
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Format invalide. Utilisez une photo JPG, PNG ou WebP.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Fichier trop lourd. La taille maximale est de 4 MB.";
  }

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

export default function Home() {
  const [selfie, setSelfie] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<SkinType>("sensitive");
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
    if (!selfie) {
      return "Selfie net, visage bien éclairé. JPG, PNG ou WebP. 4 MB max.";
    }

    return `Selfie prêt · ${formatBytes(selfie.size)}`;
  }, [selfie]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, []);

  function clearPaidState() {
    setRoutine(null);
  }

  function handleSelfieChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setError(null);
    setDiagnostic(null);
    clearPaidState();
    window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);

    if (!nextFile) {
      setSelfie(null);
      setPreviewUrl(null);
      return;
    }

    const validationError = validateFile(nextFile);
    if (validationError) {
      setSelfie(null);
      setPreviewUrl(null);
      setError(validationError);
      event.target.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(nextFile);
    setSelfie(nextFile);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextPreviewUrl;
    });
  }

  function handleSkinTypeChange(nextSkinType: SkinType) {
    setSkinType(nextSkinType);
    setDiagnostic(null);
    clearPaidState();
    window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selfie) {
      setError("Ajoutez un selfie avant de lancer le diagnostic.");
      return;
    }

    const validationError = validateFile(selfie);
    if (validationError) {
      setError(validationError);
      return;
    }

    const body = new FormData();
    body.append("selfie", selfie);
    body.append("skin_type", skinType);
    if (email.trim()) {
      body.append("email", email.trim());
    }

    setLoading(true);
    setError(null);
    setDiagnostic(null);
    clearPaidState();

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        ANALYSIS_TIMEOUT_MS,
      );
      const response = await fetch("/api/skin-context", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error === "service_timeout"
            ? "Le diagnostic met trop de temps à répondre. Réessayez avec une photo plus nette."
            : data.error ?? "Le diagnostic n'a pas pu démarrer.",
        );
      }

      setDiagnostic(data as DiagnosticPreview);
      window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(data));
    } catch (caughtError) {
      setError(
        caughtError instanceof DOMException && caughtError.name === "AbortError"
          ? "Le diagnostic prend trop de temps. Réessayez avec un selfie net et bien cadré."
          : caughtError instanceof Error
            ? caughtError.message
            : "Une erreur inattendue est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout() {
    if (!diagnostic) {
      setError("Diagnostic manquant pour ouvrir Stripe Checkout.");
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken: diagnostic.session_token,
          email: email.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Stripe Checkout indisponible.");
      }

      window.location.href = data.url;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Stripe Checkout indisponible.",
      );
      setCheckoutLoading(false);
    }
  }

  const unlockReport = useCallback(async (sessionToken: string) => {
    setReportLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      setError(
        caughtError instanceof Error ? caughtError.message : "Routine verrouillée.",
      );
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("session_token");

    if (params.get("payment") === "success" && sessionToken) {
      window.setTimeout(() => {
        void unlockReport(sessionToken);
      }, 0);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [unlockReport]);

  return (
    <main className={`site-shell ${diagnostic ? "has-result" : ""}`}>

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section className="hero-section" aria-labelledby="product-title">

        {/* Image de fond pleine largeur */}
        <div className="hero-bg" aria-hidden="true">
          <img src="/faces/face-02.png" alt="" className="hero-bg-img" />
          <div className="hero-bg-overlay" />
        </div>

        {/* Contenu texte */}
        <div className="container hero-content">
          <div className="eyebrow hero-eyebrow">Diagnostic peau par IA · Gratuit</div>
          <h1 id="product-title">
            Skinlu<span>.</span>
          </h1>
          <p className="hero-benefit">
            Découvre ce dont<br />
            ta peau a vraiment <span className="hero-accent">besoin.</span>
          </p>
          <p className="lead">
            Un selfie suffit. Notre IA repère tes préoccupations cutanées et
            construit une routine sur mesure, produits multi-marques inclus.
          </p>
          <div className="trust-strip" aria-label="Points clés Skinlu">
            <span>Aperçu gratuit</span>
            <span>Routine AM/PM</span>
            <span>Produits FR</span>
          </div>
          <a href="#diagnostic" className="hero-cta">
            Voir mon analyse gratuite
          </a>
        </div>

        {/* Phone mockup flottant en bas */}
        <div className="hero-phone-float" aria-hidden="true">
          <div className="phone-frame">
            <div className="phone-topbar">
              <span>Skinlu</span>
              <b>IA</b>
            </div>
            <div className="phone-score">
              <small>Priorité peau</small>
              <strong>Déshydratation</strong>
            </div>
            <div className="phone-metrics">
              <div>
                <span>Hydratation</span>
                <b>Faible</b>
              </div>
              <div>
                <span>Pores visibles</span>
                <b>Modéré</b>
              </div>
              <div>
                <span>Sensibilité</span>
                <b>Élevée</b>
              </div>
            </div>
            <div className="phone-routine">
              <span>Routine proposée</span>
              <b>Cleanser · Sérum · SPF</b>
            </div>
          </div>
        </div>

      </section>

      {/* ── 2. TRUST BAR ────────────────────────────────────────── */}
      <section className="trust-section" aria-label="Chiffres Skinlu">
        <div className="container">
          <div className="trust-bar">
            <div className="trust-counter">
              <strong>3 200</strong>
              <span>diagnostics réalisés</span>
            </div>
            <div className="trust-pills">
              <span>IA vision derma</span>
              <span>Analyse en 30 sec</span>
              <span>Aucune CB pour l&apos;aperçu</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. COMMENT ÇA MARCHE ────────────────────────────────── */}
      <section className="steps-section">
        <div className="container">
          <div className="section-heading reveal">
            <span className="eyebrow">Comment ça marche</span>
            <h2>Simple comme un selfie.</h2>
          </div>
          <div className="steps-list">
            <div className="step-item reveal reveal-delay-1">
              <b>01</b>
              <h3>Prends ton selfie</h3>
              <span>Un selfie net, bien éclairé. JPG, PNG ou WebP, 4 MB max.</span>
            </div>
            <div className="step-connector" aria-hidden="true" />
            <div className="step-item reveal reveal-delay-2">
              <b>02</b>
              <h3>Notre IA analyse</h3>
              <span>Type de peau, préoccupations, priorité cutanée — en 30 secondes.</span>
            </div>
            <div className="step-connector" aria-hidden="true" />
            <div className="step-item reveal reveal-delay-3">
              <b>03</b>
              <h3>Ta routine sur mesure</h3>
              <span>Une routine AM/PM complète, avec produits multi-marques adaptés.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. MESSAGES / PREUVE ────────────────────────────────── */}
      <section className="proof-section" aria-label="Messages Skinlu">
        <div className="container">
          <div className="section-heading reveal">
            <span className="eyebrow">Pourquoi Skinlu</span>
            <h2>Le déclic : comprendre sa peau avant d'acheter.</h2>
          </div>
          <div className="review-grid">
            <article className="review-card reveal reveal-delay-1">
              <p>&ldquo;Enfin un diagnostic skincare qui ne pousse pas une seule marque.&rdquo;</p>
            </article>
            <article className="review-card reveal reveal-delay-2">
              <p>&ldquo;J&apos;ai compris ma peau en 2 minutes, sans jargon.&rdquo;</p>
            </article>
            <article className="review-card reveal reveal-delay-3">
              <p>&ldquo;Skinlu m&apos;a évité d&apos;acheter encore des produits au hasard.&rdquo;</p>
            </article>
            <article className="review-card reveal reveal-delay-4">
              <p>&ldquo;Avant, je suivais TikTok au hasard. Là, j&apos;ai une routine adaptée à ma peau.&rdquo;</p>
            </article>
          </div>
          <blockquote className="review-pullquote reveal">
            &ldquo;Comme une conseillère skincare, mais en plus rapide.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* ── 5. BÉNÉFICES ────────────────────────────────────────── */}
      <section className="benefits-section">
        <div className="container">
          <div className="section-heading reveal">
            <span className="eyebrow">Ce que tu reçois</span>
            <h2>Un diagnostic lisible, une routine à appliquer.</h2>
          </div>

          <div className="feature-grid">
            <article className="reveal reveal-delay-1">
              <span>01</span>
              <h3>Priorité peau</h3>
              <p>
                Skinlu met en avant le sujet à traiter en premier&nbsp;:
                hydratation, pores, sensibilité, taches ou imperfections.
              </p>
            </article>
            <article className="reveal reveal-delay-2">
              <span>02</span>
              <h3>Routine AM/PM</h3>
              <p>
                Une routine matin et soir, structurée par étapes, pour éviter
                les achats dispersés et les doublons.
              </p>
            </article>
            <article className="reveal reveal-delay-3">
              <span>03</span>
              <h3>Produits multi-marques</h3>
              <p>
                Des recommandations parmi des marques connues, sélectionnées
                selon ton type de peau et tes préoccupations.
              </p>
            </article>
          </div>

          <div className="result-preview-grid reveal">
            <article className="result-preview-main">
              <span>Priorité détectée</span>
              <h3>Déshydratation</h3>
              <p>
                Ta routine commence par réparer la barrière cutanée et retenir
                l&apos;eau, avant d&apos;ajouter des actifs plus ciblés.
              </p>
            </article>
            <article>
              <span>À surveiller</span>
              <strong>Pores visibles</strong>
            </article>
            <article>
              <span>Routine</span>
              <strong>Matin + soir</strong>
            </article>
            <article>
              <span>Produits</span>
              <strong>Multi-marques</strong>
            </article>
          </div>
        </div>
      </section>

      {/* ── 6. CONVERSION ───────────────────────────────────────── */}
      <section
        className="conversion-section"
        id="diagnostic"
        aria-label="Diagnostic de peau"
      >
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
                        <input
                          type="file"
                          name="selfie"
                          accept="image/*"
                          onChange={handleSelfieChange}
                        />
                        <img
                          src={previewUrl}
                          alt="Preview du selfie"
                          className="photo-preview"
                        />
                      </label>
                    ) : (
                      <label className="drop-zone">
                        <input
                          type="file"
                          name="selfie"
                          accept="image/*"
                          onChange={handleSelfieChange}
                        />
                        <span className="drop-zone-empty">
                          <strong>Ajouter une photo</strong>
                          <span>{helperText}</span>
                        </span>
                      </label>
                    )}
                  </div>

                  {previewUrl && selfie ? (
                    <p className="file-meta">{formatBytes(selfie.size)}</p>
                  ) : null}

                  <p className="upload-reassurance">
                    Ton selfie est analysé puis supprimé. Jamais stocké.
                  </p>

                  <fieldset className="skin-type-fieldset">
                    <legend>Type de peau ressenti</legend>
                    <div className="skin-type-grid">
                      {SKIN_TYPES.map((option) => (
                        <label
                          className={`skin-type-option ${
                            skinType === option.value ? "is-selected" : ""
                          }`}
                          key={option.value}
                        >
                          <input
                            type="radio"
                            name="skin_type"
                            value={option.value}
                            checked={skinType === option.value}
                            onChange={() => handleSkinTypeChange(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {error ? <p className="form-error">{error}</p> : null}

                  <button
                    className="analyze-button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Diagnostic en cours..." : "Voir mon analyse gratuite"}
                  </button>
                  <p className="cta-microcopy">Gratuit · Résultat en 30 secondes</p>
                </form>

                {loading ? (
                  <div className="status-box" role="status" aria-live="polite">
                    <div className="skeleton-line wide" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                ) : null}

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
                      <div className="paywall-teasers" aria-label="Aperçu du rapport">
                        <span>Routine matin</span>
                        <span>Routine soir</span>
                        <span>Produits multi-marques</span>
                        <span>Liens affiliés</span>
                      </div>
                    </div>

                    <label className="email-field unlock-email">
                      <span>Email pour recevoir ta routine</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="vous@email.com"
                      />
                    </label>

                    <button
                      className="stripe-button"
                      type="button"
                      onClick={startCheckout}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading
                        ? "Ouverture de Stripe..."
                        : "Débloquer ma routine complète · 9,99 EUR"}
                    </button>
                    <p className="paywall-note">
                      Le paiement débloque la routine AM/PM et les produits
                      recommandés. Les recommandations dépendent du catalogue
                      produits ajouté dans Supabase.
                    </p>

                    {reportLoading ? (
                      <div className="status-box" role="status" aria-live="polite">
                        <div className="skeleton-line wide" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line short" />
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

      {/* ── 7. IMMERSIVE BANNER ─────────────────────────────────── */}
      <section className="immersive-section" aria-label="Ambiance Skinlu">
        <div className="immersive-banner reveal">
          <img
            src="/faces/face-04.png"
            alt=""
            aria-hidden="true"
            className="immersive-img"
          />
          <div className="immersive-overlay">
            <div className="container">
              <span className="eyebrow">Skin first</span>
              <p className="immersive-tagline">
                Une expérience pensée<br />
                comme un éditorial beauté.
              </p>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="accent-portraits">
            <div className="accent-portrait reveal reveal-delay-1">
              <img src="/faces/face-01.png" alt="" aria-hidden="true" />
            </div>
            <div className="accent-portrait reveal reveal-delay-2">
              <img src="/faces/face-03.png" alt="" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ──────────────────────────────────────────────── */}
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
                <p>
                  Non. Il sert à générer l&apos;analyse et n&apos;est pas conservé
                  comme fichier par Skinlu.
                </p>
              </details>
              <details>
                <summary>Est-ce un diagnostic médical&nbsp;?</summary>
                <p>
                  Non. Skinlu fournit une lecture cosmétique informative, pas un
                  avis médical ou dermatologique.
                </p>
              </details>
              <details>
                <summary>Comment les produits sont-ils choisis&nbsp;?</summary>
                <p>
                  La routine s&apos;appuie sur ton type de peau, tes préoccupations
                  et le catalogue multi-marques renseigné dans Skinlu.
                </p>
              </details>
            </div>

          </div>
        </div>
      </section>

      {/* ── 9. FINAL CTA ────────────────────────────────────────── */}
      <section className="final-cta">
        <div className="container">
          <div className="final-cta-inner reveal">
            <span className="eyebrow">Prête&nbsp;?</span>
            <h2>Commence par ton analyse gratuite.</h2>
            <a href="#diagnostic">Voir mon analyse gratuite</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container">
          <div className="site-footer-inner">
            <p>
              Analyse cosmétique informative. Skinlu ne fournit pas de diagnostic
              médical ou dermatologique.
            </p>
            <nav aria-label="Liens légaux">
              <a href="/mentions-legales">Mentions légales</a>
              <a href="/politique-de-confidentialite">
                Politique de confidentialité
              </a>
            </nav>
          </div>
        </div>
      </footer>

    </main>
  );
}
