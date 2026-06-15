"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-client";

interface Props {
  user: User;
  hasDiagnostic: boolean;
}

export default function ProfileMenu({ user, hasDiagnostic }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    setOpen(false);
  }

  const displayName: string =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    "?";
  const initial = displayName[0].toUpperCase();

  return (
    <div className="profile-menu" ref={ref}>
      <button
        className="profile-avatar-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu compte"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="profile-avatar">{initial}</span>
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-user">
            {(user.user_metadata?.full_name || user.user_metadata?.name) && (
              <span className="profile-dropdown-name">
                {user.user_metadata?.full_name ?? user.user_metadata?.name}
              </span>
            )}
            <span className="profile-dropdown-email">{user.email}</span>
            <span className="profile-dropdown-status">Compte gratuit</span>
          </div>
          <hr className="profile-dropdown-sep" />
          {hasDiagnostic && (
            <a
              className="profile-dropdown-item"
              href="/#diagnostic"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Mon analyse
            </a>
          )}
          <a
            className="profile-dropdown-item"
            href="/history"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Historique des scans
          </a>
          <a
            className="profile-dropdown-item"
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Mon compte
          </a>
          <hr className="profile-dropdown-sep" />
          <button
            className="profile-dropdown-item profile-dropdown-item--danger"
            type="button"
            role="menuitem"
            onClick={handleSignOut}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
