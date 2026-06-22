import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'accès au dev server depuis le réseau local (test sur tél).
  // Sans ça, Next 16 bloque les ressources dev (JS client) cross-origin.
  allowedDevOrigins: ["192.168.1.226"],
};

export default nextConfig;
