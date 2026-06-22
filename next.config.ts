import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'accès au dev server depuis le réseau local (test sur tél).
  // Sans ça, Next 16 bloque les ressources dev (JS client) cross-origin.
  allowedDevOrigins: ["192.168.1.226"],
  // La racine sert l'expérience /v2 (nouvelle landing).
  async redirects() {
    return [{ source: "/", destination: "/v2", permanent: false }];
  },
};

export default nextConfig;
