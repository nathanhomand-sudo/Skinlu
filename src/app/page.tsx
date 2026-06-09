"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Concern } from "@/lib/skin-diagnostic";
import type { Product } from "@/lib/matching";
import type { SkinType } from "@/lib/visual-age";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 70_000;
const DIAGNOSTIC_STORAGE_KEY = "skinlu:last-diagnostic";

const SKIN_TYPES: { value: SkinType; label: string }[] = [
  { value: "dry", label: "Seche" },
  { value: "oily", label: "Grasse" },
  { value: "combination", label: "Mixte" },
  { value: "sensitive", label: "Sensible" },
  { value: "normal", label: "Normale" },
];

const CONCERN_LABELS: Record<Concern, string> = {
  acne: "Imperfections",
  dehydration: "Deshydratation",
  dark_spots: "Taches",
  aging: "Signes de l'age",
  sensitivity: "Sensibilite",
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
        Aucun produit disponible pour l&apos;instant. Ajoutez le catalogue produits
        dans Supabase pour activer les recommandations.
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
              {product.price_eur ? `${product.price_eur.toFixed(2)} EUR` : "Prix a verifier"}
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
      return "Selfie net, visage bien eclaire. JPG, PNG ou WebP. 4 MB max.";
    }

    return `Selfie pret - ${formatBytes(selfie.size)}`;
  }, [selfie]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      const timeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
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
            ? "Le diagnostic met trop de temps a repondre. Reessayez avec une photo plus nette."
            : data.error ?? "Le diagnostic n'a pas pu demarrer.",
        );
      }

      setDiagnostic(data as DiagnosticPreview);
      window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(data));
    } catch (caughtError) {
      setError(
        caughtError instanceof DOMException && caughtError.name === "AbortError"
          ? "Le diagnostic prend trop de temps. Reessayez avec un selfie net et bien cadre."
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
            : data.error ?? "Routine verrouillee.",
        );
      }

      setRoutine(data as RoutineReport);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Routine verrouillee.",
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
    <main className={`app-shell ${diagnostic ? "has-result" : ""}`}>
      <section className="hero-panel" aria-labelledby="product-title">
        <div className="eyebrow">Diagnostic de peau par IA</div>
        <h1 id="product-title">Skinlu</h1>
        <p className="lead">
          Ajoutez un selfie, obtenez un apercu cosmetique de votre peau, puis
          debloquez une routine de soin personnalisee avec produits multi-marques.
        </p>
        <p className="privacy-note">
          Votre selfie sert a generer l&apos;analyse et n&apos;est pas conserve comme
          fichier par Skinlu.
        </p>
        <p className="disclaimer-note">
          Analyse cosmetique informative. Skinlu ne fournit pas de diagnostic
          medical ou dermatologique.
        </p>
        <nav className="legal-links" aria-label="Liens legaux">
          <a href="/mentions-legales">Mentions legales</a>
          <a href="/politique-de-confidentialite">Politique de confidentialite</a>
        </nav>
      </section>

      <section className="upload-panel" aria-label="Diagnostic de peau">
        <div className="panel-heading">
          <span>Selfie peau</span>
          <strong>4 MB max</strong>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <label className="drop-zone">
            <input
              type="file"
              name="selfie"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSelfieChange}
            />
            {previewUrl ? (
              <img src={previewUrl} alt="Preview du selfie" className="photo-preview" />
            ) : (
              <span className="drop-zone-empty">
                <strong>Selectionner un selfie</strong>
                <span>{helperText}</span>
              </span>
            )}
          </label>

          {previewUrl && selfie ? <p className="file-meta">{formatBytes(selfie.size)}</p> : null}

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

          <label className="email-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@email.com"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="analyze-button" type="submit" disabled={loading}>
            {loading ? "Diagnostic en cours..." : "Analyser ma peau"}
          </button>
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
            <span className="status-label">Apercu gratuit</span>
            <div className="diagnostic-summary">
              <h2>{concernLabel(diagnostic.top_priority)}</h2>
              <p>{diagnostic.summary}</p>
            </div>

            <div className="concern-list">
              {diagnostic.concerns.map((concern) => (
                <span key={concern}>{concernLabel(concern)}</span>
              ))}
            </div>

            <div className="locked-section" aria-label="Routine complete masquee">
              <div className="locked-header">
                <span>Routine complete AM/PM</span>
                <strong>Verrouille</strong>
              </div>
              <div className="paywall-teasers" aria-label="Apercu du rapport">
                <span>Routine matin</span>
                <span>Routine soir</span>
                <span>Produits multi-marques</span>
                <span>Liens affilies</span>
              </div>
            </div>

            <button
              className="stripe-button"
              type="button"
              onClick={startCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading
                ? "Ouverture de Stripe..."
                : "Debloquer ma routine complete - 9,99 EUR"}
            </button>
            <p className="paywall-note">
              Le paiement debloque la routine AM/PM et les produits recommandes.
              Les recommandations dependent du catalogue produits ajoute dans
              Supabase.
            </p>

            {reportLoading ? (
              <div className="status-box" role="status" aria-live="polite">
                <div className="skeleton-line wide" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ) : null}

            {routine ? (
              <section className="full-report" aria-label="Routine complete">
                <div className="report-heading">
                  <span>Routine complete</span>
                  <strong>Debloquee</strong>
                </div>

                <section className="compatibility-card">
                  <h2>Priorite</h2>
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
      </section>
    </main>
  );
}
