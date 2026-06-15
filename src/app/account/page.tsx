"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-client";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace("/"); return; }
      setUser(session.user);
      setLoading(false);
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <div className="account-loading">Chargement…</div>;
  if (!user) return null;

  const displayName: string | null =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
  const initial = (displayName ?? user.email ?? "?")[0].toUpperCase();

  return (
    <main className="account-page">
      <div className="account-container">
        <a href="/" className="account-back">← Retour</a>

        <div className="account-avatar-wrap">
          <div className="account-avatar">{initial}</div>
        </div>

        {displayName && <p className="account-name">{displayName}</p>}
        <p className="account-email">{user.email}</p>

        <div className="account-status-badge">Compte gratuit · 1 scan inclus</div>

        <div className="account-actions">
          <a href="/history" className="account-link-btn">Historique des scans</a>
          <button
            className="account-signout-btn"
            type="button"
            onClick={handleSignOut}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  );
}
