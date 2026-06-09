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
import type {
  FullReport,
  SkinContextResult,
  SkinType,
  VisualAgeResult,
} from "@/lib/visual-age";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 70_000;
const RESULT_STORAGE_KEY = "visual-age:last-skincare-result";
const PAID_ACCESS_STORAGE_KEY = "visual-age:last-paid-access";

const SKIN_TYPES: { value: SkinType; label: string }[] = [
  { value: "dry", label: "Sèche" },
  { value: "oily", label: "Grasse" },
  { value: "combination", label: "Mixte" },
  { value: "sensitive", label: "Sensible" },
  { value: "normal", label: "Normale" },
];

type UploadState = "idle" | "ready" | "loading" | "done";
type ClientVisualAgeResult = VisualAgeResult & {
  result_id?: string;
};

type PaidAccess = {
  accessToken: string;
  resultId: string;
};

type IngredientVerdict = "bon" | "neutre" | "attention";

function getStoredResult() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedResult = window.localStorage.getItem(RESULT_STORAGE_KEY);

  if (!storedResult) {
    return null;
  }

  try {
    return JSON.parse(storedResult) as ClientVisualAgeResult;
  } catch {
    window.localStorage.removeItem(RESULT_STORAGE_KEY);
    return null;
  }
}

function getStoredPaidAccess() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedAccess = window.localStorage.getItem(PAID_ACCESS_STORAGE_KEY);

  if (!storedAccess) {
    return null;
  }

  try {
    return JSON.parse(storedAccess) as PaidAccess;
  } catch {
    window.localStorage.removeItem(PAID_ACCESS_STORAGE_KEY);
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

function getVerdictLabel(verdict: IngredientVerdict) {
  if (verdict === "bon") {
    return "Bon";
  }

  if (verdict === "attention") {
    return "Attention";
  }

  return "Neutre";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<SkinType>("sensitive");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClientVisualAgeResult | null>(
    getStoredResult,
  );
  const [uploadState, setUploadState] = useState<UploadState>(() =>
    getStoredResult() ? "done" : "idle",
  );
  const [fullReport, setFullReport] = useState<FullReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [paidAccess, setPaidAccess] = useState<PaidAccess | null>(
    getStoredPaidAccess,
  );
  const [skinPhoto, setSkinPhoto] = useState<File | null>(null);
  const [skinPreviewUrl, setSkinPreviewUrl] = useState<string | null>(null);
  const [skinContext, setSkinContext] = useState<SkinContextResult | null>(null);
  const [skinContextLoading, setSkinContextLoading] = useState(false);

  const helperText = useMemo(() => {
    if (!file) {
      return "JPG, PNG ou WebP. 4 MB maximum.";
    }

    return `Étiquette prête - ${formatBytes(file.size)}`;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (skinPreviewUrl) {
        URL.revokeObjectURL(skinPreviewUrl);
      }
    };
  }, [skinPreviewUrl]);

  function resetResultState() {
    setResult(null);
    setFullReport(null);
    setPaidAccess(null);
    setSkinPhoto(null);
    setSkinPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return null;
    });
    setSkinContext(null);
    window.localStorage.removeItem(RESULT_STORAGE_KEY);
    window.localStorage.removeItem(PAID_ACCESS_STORAGE_KEY);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    resetResultState();

    if (!nextFile) {
      setFile(null);
      setPreviewUrl(null);
      setUploadState("idle");
      return;
    }

    const validationError = validateFile(nextFile);
    if (validationError) {
      setFile(null);
      setPreviewUrl(null);
      setUploadState("idle");
      setError(validationError);
      event.target.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(nextFile);
    setFile(nextFile);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextPreviewUrl;
    });
    setError(null);
    setUploadState("ready");
  }

  function handleSkinTypeChange(nextSkinType: SkinType) {
    setSkinType(nextSkinType);
    resetResultState();

    if (file) {
      setUploadState("ready");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Ajoutez une photo d'étiquette avant de lancer l'analyse.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const body = new FormData();
    body.append("photo", file);
    body.append("skin_type", skinType);

    setUploadState("loading");
    setError(null);
    setResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, ANALYSIS_TIMEOUT_MS);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error === "service_timeout"
            ? "Le service d'analyse met trop de temps à répondre. Réessayez dans quelques instants."
            : data.error ?? "L'analyse n'a pas pu démarrer.",
        );
      }

      setResult(data as ClientVisualAgeResult);
      window.localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(data));
      setUploadState("done");
    } catch (caughtError) {
      setError(
        caughtError instanceof DOMException && caughtError.name === "AbortError"
          ? "L'analyse prend trop de temps. Réessayez avec une photo plus nette et bien cadrée."
          : caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue.",
      );
      setUploadState("ready");
    }
  }

  function handleSkinPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSkinContext(null);

    if (!nextFile) {
      setSkinPhoto(null);
      setSkinPreviewUrl(null);
      return;
    }

    const validationError = validateFile(nextFile);
    if (validationError) {
      setSkinPhoto(null);
      setSkinPreviewUrl(null);
      setError(validationError);
      event.target.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(nextFile);
    setSkinPhoto(nextFile);
    setSkinPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextPreviewUrl;
    });
    setError(null);
  }

  async function handleSkinContextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!skinPhoto || !result || "error" in result || !paidAccess) {
      setError("Rapport débloqué et photo de peau requis.");
      return;
    }

    const validationError = validateFile(skinPhoto);
    if (validationError) {
      setError(validationError);
      return;
    }

    const body = new FormData();
    body.append("photo", skinPhoto);
    body.append("skin_type", skinType);
    body.append("result_id", paidAccess.resultId);
    body.append("access_token", paidAccess.accessToken);
    body.append("result", JSON.stringify(result));

    setSkinContextLoading(true);
    setError(null);
    setSkinContext(null);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, ANALYSIS_TIMEOUT_MS);

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
            ? "Le contexte peau met trop de temps à répondre. Réessayez dans quelques instants."
            : data.error ?? "Le contexte peau n'a pas pu démarrer.",
        );
      }

      setSkinContext(data as SkinContextResult);
    } catch (caughtError) {
      setError(
        caughtError instanceof DOMException && caughtError.name === "AbortError"
          ? "Le contexte peau prend trop de temps. Réessayez avec une photo plus nette."
          : caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setSkinContextLoading(false);
    }
  }

  function handleCheckoutClick() {
    if (!result || "error" in result || !result.result_id) {
      setError("Analyse manquante pour ouvrir Stripe Checkout.");
      return;
    }

    void startCheckout(result.result_id);
  }

  async function startCheckout(resultId: string) {
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resultId }),
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
    }
  }

  const unlockReport = useCallback(
    async (accessToken: string, resultId: string) => {
      if (!result || "error" in result) {
        return;
      }

      setReportLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken,
            resultId,
            result,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Rapport verrouillé.");
        }

        setFullReport(data as FullReport);
        const nextPaidAccess = { accessToken, resultId };
        setPaidAccess(nextPaidAccess);
        window.localStorage.setItem(
          PAID_ACCESS_STORAGE_KEY,
          JSON.stringify(nextPaidAccess),
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Rapport verrouillé.",
        );
      } finally {
        setReportLoading(false);
      }
    },
    [result],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const resultId = params.get("result_id");

    if (params.get("payment") === "success" && accessToken && resultId) {
      window.setTimeout(() => {
        void unlockReport(accessToken, resultId);
      }, 0);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [result, unlockReport]);

  const isLoading = uploadState === "loading";
  const hasValidResult = Boolean(result && !("error" in result));

  return (
    <main className={`app-shell ${hasValidResult ? "has-result" : ""}`}>
      <section className="hero-panel" aria-labelledby="product-title">
        <div className="eyebrow">Décodeur skincare par IA</div>
        <h1 id="product-title">Skinlu</h1>
        <p className="lead">
          Importez une photo d&apos;étiquette skincare. L&apos;IA lit les
          ingrédients et estime leur compatibilité avec votre type de peau.
        </p>
        <p className="privacy-note">
          Votre photo est analysée et immédiatement supprimée. Aucun stockage.
        </p>
        <p className="disclaimer-note">
          Analyse cosmétique générée par IA, à partir des informations visibles.
          Ce service ne remplace pas un avis médical ou dermatologique.
        </p>
        <nav className="legal-links" aria-label="Liens légaux">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/politique-de-confidentialite">
            Politique de confidentialité
          </a>
        </nav>
      </section>

      <section className="upload-panel" aria-label="Upload étiquette skincare">
        <div className="panel-heading">
          <span>Étiquette produit</span>
          <strong>4 MB max</strong>
        </div>
        <form onSubmit={handleSubmit} className="upload-form">
          <label className="drop-zone">
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview de l'étiquette sélectionnée"
                className="photo-preview"
              />
            ) : (
              <span className="drop-zone-empty">
                <strong>Sélectionner une étiquette</strong>
                <span>{helperText}</span>
              </span>
            )}
          </label>

          {previewUrl && file ? (
            <p className="file-meta">{formatBytes(file.size)}</p>
          ) : null}

          <fieldset className="skin-type-fieldset">
            <legend>Type de peau</legend>
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

          <button className="analyze-button" type="submit" disabled={isLoading}>
            {isLoading ? "Analyse en cours..." : "Analyser l'étiquette"}
          </button>
        </form>

        {isLoading ? (
          <div className="status-box" role="status" aria-live="polite">
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ) : null}

        {result ? (
          <div className="result-panel" role="status" aria-live="polite">
            {"error" in result ? (
              <>
                <span className="status-label">Étiquette illisible</span>
                <p>
                  La photo ne montre pas une étiquette skincare suffisamment
                  lisible.
                </p>
              </>
            ) : (
              <>
                <div className="score-row">
                  <div>
                    <span className="status-label">Analyse gratuite</span>
                    <p className="score-label">
                      Compatibilité{" "}
                      {SKIN_TYPES.find((type) => type.value === skinType)?.label.toLowerCase()}
                    </p>
                  </div>
                  <div className="score-value">
                    <span>{Math.round(result.score)}</span>
                    <small>/100</small>
                  </div>
                </div>

                <div className="product-meta">
                  <span>{result.product_name || "Produit non identifié"}</span>
                  <strong>{result.ingredients_count} ingrédients lus</strong>
                </div>

                <p className="result-summary">{result.verdict}</p>

                <section
                  className="free-ingredients"
                  aria-label="Ingrédients à regarder en premier"
                >
                  <div className="locked-header">
                    <span>3 ingrédients à regarder en premier</span>
                    <strong>Gratuit</strong>
                  </div>
                  <ul className="ingredient-list">
                    {result.top_ingredients_free.map((ingredient) => (
                      <li key={`${ingredient.name}-${ingredient.role}`}>
                        <div>
                          <strong>{ingredient.name}</strong>
                          <span>{ingredient.role}</span>
                        </div>
                        <span className={`verdict-badge verdict-${ingredient.verdict}`}>
                          {getVerdictLabel(ingredient.verdict)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="locked-section" aria-label="Rapport complet masqué">
                  <div className="locked-header">
                    <span>Rapport complet</span>
                    <strong>Verrouillé</strong>
                  </div>
                  <div className="paywall-teasers" aria-label="Aperçu du rapport">
                    <span>Lecture complète de la formule</span>
                    <span>Alertes selon votre peau</span>
                    <span>Actifs utiles à repérer</span>
                    <span>Affinage avec photo optionnelle</span>
                  </div>
                  <ul className="locked-list">
                    {result.full_analysis.slice(0, 3).map((ingredient) => (
                      <li key={`${ingredient.name}-${ingredient.detail}`}>
                        <span className="blurred-text">
                          {ingredient.name} - {ingredient.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className="stripe-button"
                  type="button"
                  onClick={handleCheckoutClick}
                >
                  Débloquer mon analyse complète - 9,99 EUR
                </button>
                <p className="paywall-note">
                  Le rapport complet détaille les ingrédients à privilégier,
                  ceux à surveiller et peut être affiné avec une photo de votre
                  peau actuelle après déblocage.
                </p>

                {reportLoading ? (
                  <div className="status-box" role="status" aria-live="polite">
                    <div className="skeleton-line wide" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                ) : null}

                {fullReport ? (
                  <section className="full-report" aria-label="Rapport complet">
                    <div className="report-heading">
                      <span>Rapport complet</span>
                      <strong>Débloqué</strong>
                    </div>
                    <section className="compatibility-card">
                      <h2>Compatibilité peau</h2>
                      <p>{fullReport.skin_type_compatibility}</p>
                    </section>

                    <section>
                      <h2>Lecture complète des ingrédients</h2>
                      <div className="ingredient-table" role="table">
                        <div className="ingredient-table-head" role="row">
                          <span role="columnheader">Ingrédient</span>
                          <span role="columnheader">Rôle</span>
                          <span role="columnheader">Verdict</span>
                          <span role="columnheader">Détail</span>
                        </div>
                        {fullReport.full_analysis.map((ingredient) => (
                          <div
                            className="ingredient-table-row"
                            key={`${ingredient.name}-${ingredient.detail}`}
                            role="row"
                          >
                            <strong role="cell">{ingredient.name}</strong>
                            <span role="cell">{ingredient.role}</span>
                            <span role="cell">
                              <span
                                className={`verdict-badge verdict-${ingredient.verdict}`}
                              >
                                {getVerdictLabel(ingredient.verdict)}
                              </span>
                            </span>
                            <p role="cell">{ingredient.detail}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="report-lists">
                      <section className="report-list warning-list">
                        <h2>Points de vigilance</h2>
                        {fullReport.warnings.length ? (
                          <ul>
                            {fullReport.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Aucun point de vigilance majeur détecté.</p>
                        )}
                      </section>

                      <section className="report-list positive-list">
                        <h2>Points positifs</h2>
                        {fullReport.positives.length ? (
                          <ul>
                            {fullReport.positives.map((positive) => (
                              <li key={positive}>{positive}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Aucun bénéfice spécifique clairement lisible.</p>
                        )}
                      </section>
                    </div>

                    <section className="skin-context-card">
                      <div>
                        <h2>Affiner avec ma peau actuelle</h2>
                        <p>
                          Optionnel : ajoutez une photo prise maintenant pour
                          adapter la lecture de la formule à ce que l&apos;on
                          voit aujourd&apos;hui, comme brillance, rougeurs
                          apparentes ou zones de sécheresse.
                        </p>
                      </div>

                      <form
                        className="skin-context-form"
                        onSubmit={handleSkinContextSubmit}
                      >
                        <label className="skin-photo-zone">
                          <input
                            type="file"
                            name="skin_photo"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleSkinPhotoChange}
                          />
                          {skinPreviewUrl ? (
                            <img
                              src={skinPreviewUrl}
                              alt="Preview de la photo de peau sélectionnée"
                              className="skin-photo-preview"
                            />
                          ) : (
                            <span>Ajouter une photo de ma peau</span>
                          )}
                        </label>
                        <button
                          className="analyze-button"
                          type="submit"
                          disabled={skinContextLoading}
                        >
                          {skinContextLoading
                            ? "Personnalisation en cours..."
                            : "Affiner mon rapport"}
                        </button>
                      </form>

                      {skinContext ? (
                        "error" in skinContext ? (
                          <p className="form-error">
                            La photo ne montre pas assez clairement une zone de
                            peau.
                          </p>
                        ) : (
                          <div className="skin-context-result">
                            <strong>{skinContext.visible_skin_context}</strong>
                            <ul>
                              {skinContext.observations.map((observation) => (
                                <li key={observation}>{observation}</li>
                              ))}
                            </ul>
                            <p>{skinContext.personalization_note}</p>
                            <small>{skinContext.disclaimer}</small>
                          </div>
                        )
                      ) : null}
                    </section>

                    <p className="medical-disclaimer">
                      {fullReport.disclaimer}
                    </p>
                  </section>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
