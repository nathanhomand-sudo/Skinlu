"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-client";

const DIAGNOSTIC_STORAGE_KEY = "skinlu:last-diagnostic";

type StoredDiagnostic = {
  session_token: string;
  skin_type: string;
  concerns: string[];
  top_priority: string;
  summary: string;
  scanned_at?: string;
};

const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: "Sèche",
  oily: "Grasse",
  combination: "Mixte",
  sensitive: "Sensible",
  normal: "Équilibrée",
};

const CONCERN_LABELS: Record<string, string> = {
  acne: "Imperfections",
  dehydration: "Déshydratation possible",
  dark_spots: "Taches",
  aging: "Signes de l'âge",
  sensitivity: "Sensibilité",
  dullness: "Teint terne",
  enlarged_pores: "Pores visibles",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default function HistoryPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<StoredDiagnostic | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace("/"); return; }
      setAuthed(true);
      const stored = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
      if (stored) {
        try { setDiagnostic(JSON.parse(stored) as StoredDiagnostic); } catch { /* ignore */ }
      }
      setLoading(false);
    });
  }, [router]);

  if (loading || !authed) return <div className="account-loading">Chargement…</div>;

  return (
    <main className="history-page">
      <div className="account-container">
        <a href="/" className="account-back">← Retour</a>
        <h1 className="history-title">Historique des scans</h1>

        {diagnostic ? (
          <div className="history-card">
            <div className="hc-meta">
              <span className="hc-label">Dernier scan</span>
              {diagnostic.scanned_at && (
                <span className="hc-date">{formatDate(diagnostic.scanned_at)}</span>
              )}
            </div>
            <div className="hc-body">
              <div className="hc-row">
                <span>Type de peau probable</span>
                <strong>{SKIN_TYPE_LABELS[diagnostic.skin_type] ?? diagnostic.skin_type}</strong>
              </div>
              <div className="hc-row">
                <span>Priorité principale</span>
                <strong>{CONCERN_LABELS[diagnostic.top_priority] ?? diagnostic.top_priority}</strong>
              </div>
              {diagnostic.concerns.length > 0 && (
                <div className="hc-concerns">
                  {diagnostic.concerns.map((c) => (
                    <span key={c} className="hc-badge">
                      {CONCERN_LABELS[c] ?? c}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <a href="/#diagnostic" className="hc-cta">
              Voir mon analyse →
            </a>
          </div>
        ) : (
          <div className="history-empty">
            <p>Tu n&apos;as pas encore fait de scan.</p>
            <a href="/" className="hero-cta">Scanner ma peau gratuitement</a>
          </div>
        )}
      </div>
    </main>
  );
}
