"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-client";

interface AuthGateProps {
  onSkip: () => void;
}

export default function AuthGate({ onSkip }: AuthGateProps) {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowser();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setLoading(false);
    if (otpError) {
      setError("Impossible d'envoyer le lien. Réessaie.");
    } else {
      setEmailSent(true);
    }
  }

  if (emailSent) {
    return (
      <div className="auth-gate">
        <div className="auth-gate-sent">
          <strong>Vérifie tes emails ✓</strong>
          <span>Un lien de connexion a été envoyé à {email}.</span>
        </div>
        <button className="auth-skip" type="button" onClick={onSkip}>
          Payer maintenant →
        </button>
      </div>
    );
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate-header">
        <strong>Retrouve ta routine depuis n&apos;importe où</strong>
        <span>Sauvegarde ton analyse en un clic.</span>
      </div>
      <button
        className="auth-google-btn"
        type="button"
        onClick={handleGoogle}
        disabled={loading}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.148 17.64 11.84 17.64 9.2Z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
          <path fill="#FBBC05" d="M3.964 10.705A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332Z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.963L3.964 7.295C4.672 5.163 6.656 3.58 9 3.58Z"/>
        </svg>
        Continuer avec Google
      </button>
      <div className="auth-separator" aria-hidden="true">ou</div>
      <form onSubmit={handleEmail} className="auth-email-form">
        <input
          type="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-email-input"
          disabled={loading}
          required
        />
        <button
          type="submit"
          className="auth-email-btn"
          disabled={loading || !email.trim()}
        >
          {loading ? "..." : "Recevoir le lien"}
        </button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      <button className="auth-skip" type="button" onClick={onSkip}>
        Continuer directement →
      </button>
    </div>
  );
}
