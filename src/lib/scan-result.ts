// Analyse réelle de l'image via /api/skin-context (OpenAI Vision), avec
// fallback géré par l'appelant (si null → on retombe sur le profil dérivé
// des réponses). Stockage du résultat en sessionStorage pour la page résultat.

import type { Concern } from "@/lib/skin-diagnostic";

export type ScanZone = { observation: string; concern: Concern | null };
export type ScanResult = {
  skin_type: string;
  top_priority: Concern;
  concerns?: Concern[];
  summary: string;
  zones?: { forehead: ScanZone; cheeks: ScanZone; t_zone: ScanZone; texture: ScanZone } | null;
  confidence?: number | null;
  derma_flag?: boolean;
};

const KEY = "skinlu_scan_result";

export const CONCERN_LABEL: Record<Concern, string> = {
  acne: "Imperfections",
  dehydration: "Hydratation + barrière",
  dark_spots: "Taches pigmentaires",
  aging: "Signes de l'âge",
  sensitivity: "Apaisement + barrière",
  dullness: "Éclat + uniformité",
  enlarged_pores: "Pores visibles",
};

// Observations courtes pour l'écran AHA (max 2-3, pas de pavé).
export const CONCERN_SHORT: Record<Concern, string> = {
  acne: "Imperfections à surveiller",
  dehydration: "Hydratation à renforcer",
  dark_spots: "Taches à uniformiser",
  aging: "Premiers signes de l'âge",
  sensitivity: "Sensibilité à apaiser",
  dullness: "Éclat à relancer",
  enlarged_pores: "Pores plus visibles",
};

export const CONCERN_COLOR: Record<Concern, string> = {
  acne: "#D08373",
  dehydration: "#4682C3",
  dark_spots: "#C49A4A",
  aging: "#8C6EBE",
  sensitivity: "#D08373",
  dullness: "#0F6B5F",
  enlarged_pores: "#9aa39f",
};

export const SKIN_TYPE_LABEL: Record<string, string> = {
  dry: "Peau sèche",
  oily: "Peau grasse",
  combination: "Peau mixte",
  normal: "Peau normale",
  sensitive: "Peau sensible",
};

// Mappe les réponses du briefing vers le format skin_profile attendu par l'API.
function toSkinProfile(answers: string[][]): string {
  const flat = answers.flat().join(" ").toLowerCase();
  const has = (...w: string[]) => w.some((x) => flat.includes(x));
  return JSON.stringify({
    tight_after_cleansing: has("sèche", "tendue", "sécheresse") ? "oui" : "non",
    shine_area: has("brillante", "grasse") ? "zone T" : "non",
    reacts_to_products: has("sensible", "réactive", "rougeurs", "inconfort") ? "oui" : "non",
  });
}

/** Envoie la photo à l'analyse IA. Retourne le diagnostic, ou null si échec
 *  (pas de clé, rate-limit, pas de visage, timeout…) → fallback côté appelant. */
export async function analyzePhoto(dataUrl: string, answers: string[][]): Promise<ScanResult | null> {
  if (!dataUrl) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("selfie", file);
    form.append("skin_profile", toSkinProfile(answers));

    const res = await fetch("/api/skin-context", { method: "POST", body: form });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error || !data.top_priority) return null;
    return data as ScanResult;
  } catch {
    return null;
  }
}

const PHOTO_KEY = "skinlu_scan_photo";

export function saveResult(r: ScanResult): void {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ }
}
export function loadResult(): ScanResult | null {
  try { return JSON.parse(window.sessionStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
export function savePhoto(dataUrl: string): void {
  try { window.sessionStorage.setItem(PHOTO_KEY, dataUrl); } catch { /* ignore */ }
}
export function loadPhoto(): string | null {
  try { return window.sessionStorage.getItem(PHOTO_KEY); } catch { return null; }
}
export function clearResult(): void {
  try { window.sessionStorage.removeItem(KEY); window.sessionStorage.removeItem(PHOTO_KEY); } catch { /* ignore */ }
}
