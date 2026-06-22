// Flag "onboardé" (questionnaire + signup déjà faits une fois).
// Démo : localStorage. Prod : à remplacer par un flag sur le profil
// Supabase (ex. user_metadata.onboarding_done) — même API ici.

const KEY = "skinlu_onboarded";

export function isOnboarded(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setOnboarded(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetOnboarded(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
