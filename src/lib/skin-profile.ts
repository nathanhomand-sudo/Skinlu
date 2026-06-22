// Dérive un "profil peau" crédible à partir des réponses du briefing, et
// le passe au résultat (sessionStorage). But : que le résultat reflète
// VRAIMENT ce que l'user a dit (pas du générique "IA bullshit").
// Démo : la vraie analyse viendra de l'image (MediaPipe + IA) plus tard ;
// ici on croise déjà les réponses pour personnaliser.

export type SkinProfile = {
  answers: string[][]; // labels sélectionnés par question
  priority: string;
  priorityNote: string;
  line: string;
  contextNote: string | null;
};

const KEY = "skinlu_profile";

const has = (flat: string, ...words: string[]) => words.some((w) => flat.includes(w));

export function deriveProfile(answers: string[][]): Omit<SkinProfile, "answers"> {
  const flat = answers.flat().join(" · ").toLowerCase();

  // Priorité dérivée des signes déclarés (ordre = importance).
  let priority = "Équilibre général";
  let priorityNote = "On stabilise les bases avant d'aller plus loin.";
  if (has(flat, "sèche", "tendue", "sécheresse", "déshydrat")) {
    priority = "Hydratation + barrière";
    priorityNote = "Ta peau semble surtout demander plus de régularité sur l'hydratation.";
  } else if (has(flat, "sensible", "rougeurs", "réactive", "inconfort")) {
    priority = "Apaisement + barrière";
    priorityNote = "On privilégie des gestes doux pour calmer les réactions.";
  } else if (has(flat, "brillante", "grasse")) {
    priority = "Équilibre du sébum";
    priorityNote = "On régule la brillance sans agresser ni assécher.";
  } else if (has(flat, "terne", "éclat", "teint")) {
    priority = "Éclat + uniformité";
    priorityNote = "On relance l'éclat et on travaille l'homogénéité du teint.";
  } else if (has(flat, "imperfections", "pores", "rugueuse", "texture")) {
    priority = "Texture + imperfections";
    priorityNote = "On lisse la texture et on limite les imperfections visibles.";
  }

  // Ligne "onboarding rejoué" : reprend ce que l'user a dit.
  const q1 = answers[0]?.[0]?.toLowerCase();
  const q5 = answers[4]?.[0]?.toLowerCase();
  let line = "On a croisé tes réponses avec ce qui est visible aujourd'hui.";
  if (q1 && q5) line = `Tu as dit que ta peau te semblait « ${q1} » et que tu voulais surtout « ${q5} » — on a regardé ça en priorité.`;
  else if (q1) line = `Tu as dit que ta peau te semblait « ${q1} » — on a regardé ça de près.`;

  // Note contexte (distinguer état habituel vs temporaire — Q4 multi).
  const q4 = (answers[3] ?? []).filter((a) => a && !a.toLowerCase().includes("rien de particulier"));
  const contextNote = q4.length
    ? `Tu as mentionné ${q4.map((x) => x.toLowerCase()).join(", ")} ces dernières 24h : ça peut influencer ce qu'on voit aujourd'hui, on en tient compte.`
    : null;

  return { priority, priorityNote, line, contextNote };
}

export function saveProfile(answers: string[][]): void {
  try {
    const p: SkinProfile = { answers, ...deriveProfile(answers) };
    window.sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function loadProfile(): SkinProfile | null {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}
