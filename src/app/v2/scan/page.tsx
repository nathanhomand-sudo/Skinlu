"use client";

import { ScanBriefing } from "@/components/landing/ScanBriefing";

// Briefing avant analyse (déclenché par "Commencer mon scan" sur /v2).
// Hérite du layout /v2 (scope .v2-dark). À la fin → "/" (vrai scan).
export default function ScanBriefingPage() {
  return <ScanBriefing />;
}
