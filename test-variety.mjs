/**
 * test-variety.mjs — Skinlu diagnostic variety test
 *
 * Tests whether the skin diagnostic prompt produces genuinely varied outputs
 * for 5 distinct skin profiles. Calls OpenAI text API with simulated "vision"
 * descriptions (no real image needed — tests prompt logic).
 *
 * Run: node test-variety.mjs
 * Requires: OPENAI_API_KEY in environment or .env.local
 */

import { readFileSync } from "fs";

// Load .env.local if present
try {
  const env = readFileSync(new URL(".env.local", import.meta.url), "utf-8");
  for (const line of env.split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  }
} catch {
  // no .env.local — continue with shell env
}

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini";

if (!apiKey) {
  console.error("❌  OPENAI_API_KEY manquante. Exporte-la ou crée .env.local");
  process.exit(1);
}

// ── Prompt builder (TS source inlined) ──────────────────────────────────────

function buildSkinDiagnosticPrompt(userContext) {
  return `Tu es un systeme d'analyse cosmetique de selfie pour routine skincare.

ETAPE 1 — VALIDATION : L'image montre-t-elle un visage humain clairement visible, assez proche, pas coupe, et suffisamment eclaire ? Si non (carte, objet, animal, main, flou total, document, screenshot, visage partiel, photo trop sombre, visage trop loin, etc.), retourne face_detected: false avec des valeurs par defaut pour les autres champs.

ETAPE 2 — ANALYSE (seulement si face_detected: true) : Observe les indices cosmetiques visibles uniquement : brillance/exces de sebum visible, zones qui semblent seches, signes de deshydratation possible, rougeurs apparentes, texture irreguliere, pores apparents, teint terne, marques visibles, boutons/imperfections visibles. Deduis un type de peau probable depuis ces indices visuels, en restant prudent. Ne fais jamais de diagnostic medical. Ne parle pas de maladie. N'identifie pas la personne.

CONTEXTE UTILISATEUR OPTIONNEL :
${userContext?.trim() ? userContext.trim() : "Aucune reponse utilisateur fournie."}

Si le contexte utilisateur est fourni, combine les signes visibles et le ressenti utilisateur pour nuancer le type probable et la priorite cosmetique indicative. Si les deux se contredisent, reste prudent et emploie des formulations comme "semble", "probable", "possible", "a confirmer".

JSON attendu :
- face_detected: true si visage humain clairement visible, false sinon
- skin_type: type probable (dry/oily/combination/sensitive/normal). Si face_detected: false, mets "normal" par defaut.
- concerns: 1 a 4 parmi acne, dehydration, dark_spots, aging, sensitivity, dullness, enlarged_pores. Ne choisis dehydration que si des signes visibles de secheresse/deshydratation OU le contexte utilisateur le soutient. Si face_detected: false, mets ["dullness"].
- top_priority: priorite cosmetique indicative la plus importante. Varie selon les signes les plus visibles : brillance/zone T -> enlarged_pores ou acne si imperfections visibles ; rougeurs/ressenti reaction -> sensitivity ; teint plat -> dullness ; marques -> dark_spots ; secheresse/tiraillements -> dehydration. Si face_detected: false, mets "dullness".
- summary: 3 phrases en francais, ton direct et personnel (jamais medical, jamais categorique). Phrase 1 : commence par "Ta peau semble..." ou "On voit surtout..." et decris les signes visibles ou probables. Phrase 2 : relie ces signes au ressenti utilisateur si disponible. Phrase 3 : propose une direction de routine claire, sans promettre de resultat clinique. Si face_detected: false, mets "Aucun visage detecte."

Retourne uniquement le JSON.`;
}

// ── Schema (for response_format) ────────────────────────────────────────────

const SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "skin_selfie_diagnostic",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["face_detected", "skin_type", "concerns", "top_priority", "summary"],
      properties: {
        face_detected: { type: "boolean" },
        skin_type: { type: "string", enum: ["dry", "oily", "combination", "sensitive", "normal"] },
        concerns: {
          type: "array",
          items: {
            type: "string",
            enum: ["acne", "dehydration", "dark_spots", "aging", "sensitivity", "dullness", "enlarged_pores"],
          },
        },
        top_priority: {
          type: "string",
          enum: ["acne", "dehydration", "dark_spots", "aging", "sensitivity", "dullness", "enlarged_pores"],
        },
        summary: { type: "string" },
      },
    },
  },
};

// ── Test cases ───────────────────────────────────────────────────────────────

const TEST_CASES = [
  {
    label: "🟠  Peau grasse / brillante (zone T visible)",
    // We tell the model what it would "see" via the system note below + strong user context
    simulatedVisual:
      "Le selfie montre un visage bien cadré, frontalement, éclairé. " +
      "On distingue une brillance marquée sur le front et le nez (zone T). " +
      "Les pores sont visibles sur la zone nasale. Pas de rougeurs ni de marques notables.",
    userContext:
      "- En journée, brillance surtout : Partout\n" +
      "- Apres nettoyage, la peau tire : Rarement\n" +
      "- Reaction aux nouveaux produits : Non",
  },
  {
    label: "🟢  Peau nette / équilibrée",
    simulatedVisual:
      "Selfie bien éclairé, visage centré. La peau semble uniforme, pas de brillance visible, " +
      "texture lisse et régulière. Teint équilibré, pas de rougeurs ni d'imperfections.",
    userContext:
      "- Apres nettoyage, la peau tire : Rarement\n" +
      "- En journée, brillance surtout : Presque pas\n" +
      "- Reaction aux nouveaux produits : Non",
  },
  {
    label: "🔴  Rougeurs / sensibilité",
    simulatedVisual:
      "Selfie avec des rougeurs légères et diffuses visibles sur les joues et autour du nez. " +
      "La peau semble réactive. Pas de brillance notable. Texture légèrement irrégulière.",
    userContext:
      "- Reaction aux nouveaux produits : Oui\n" +
      "- Apres nettoyage, la peau tire : Souvent\n" +
      "- En journée, brillance surtout : Presque pas",
  },
  {
    label: "⚫  Teint terne / dull",
    simulatedVisual:
      "Le selfie montre un teint assez terne, manquant d'éclat. " +
      "Pas de brillance. Peau mate de façon uniforme, sans imperfections majeures mais sans luminosité.",
    userContext:
      "- Apres nettoyage, la peau tire : Parfois\n" +
      "- En journée, brillance surtout : Presque pas\n" +
      "- Reaction aux nouveaux produits : Parfois",
  },
  {
    label: "💧  Sécheresse / déshydratation",
    simulatedVisual:
      "Selfie montrant des zones de peau sèche visibles sur le front et les joues. " +
      "Légères squames, zones mates prononcées. Quelques lignes fines visibles. Pas de brillance.",
    userContext:
      "- Apres nettoyage, la peau tire : Souvent\n" +
      "- En journée, brillance surtout : Presque pas\n" +
      "- Reaction aux nouveaux produits : Parfois",
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

async function runTest(tc) {
  // We modify the prompt's ETAPE 2 to include the simulated visual description.
  // This makes the text model behave as if it had seen the image.
  const contextWithVisual =
    `[DESCRIPTION VISUELLE SIMULEE POUR TEST] ${tc.simulatedVisual}\n\n` +
    tc.userContext;

  const systemPrompt = buildSkinDiagnosticPrompt(contextWithVisual);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Analyse le selfie comme décrit dans le contexte et retourne uniquement le JSON.",
        },
      ],
      response_format: SCHEMA,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log(` Skinlu — Test de variété diagnostics`);
console.log(` Modèle: ${model}`);
console.log(`${"═".repeat(64)}\n`);

const results = [];
const topPriorities = [];
const skinTypes = [];

for (const tc of TEST_CASES) {
  process.stdout.write(`Testing: ${tc.label}... `);
  try {
    const out = await runTest(tc);
    results.push({ label: tc.label, out });
    topPriorities.push(out.top_priority);
    skinTypes.push(out.skin_type);
    console.log("✓");
  } catch (err) {
    console.log(`✗ (${err.message})`);
    results.push({ label: tc.label, out: null, error: err.message });
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(64)}`);
console.log(" RÉSULTATS\n");

for (const { label, out, error } of results) {
  console.log(label);
  if (error) {
    console.log(`  ❌ Erreur: ${error}`);
  } else {
    console.log(`  skin_type:    ${out.skin_type}`);
    console.log(`  top_priority: ${out.top_priority}`);
    console.log(`  concerns:     [${out.concerns.join(", ")}]`);
    console.log(`  summary:      ${out.summary.slice(0, 120)}...`);
  }
  console.log();
}

// ── Variety analysis ─────────────────────────────────────────────────────────

const uniquePriorities = new Set(topPriorities.filter(Boolean));
const uniqueSkinTypes = new Set(skinTypes.filter(Boolean));
const dehydrationCount = topPriorities.filter((p) => p === "dehydration").length;

console.log("─".repeat(64));
console.log(" ANALYSE VARIÉTÉ\n");
console.log(`  top_priority distinct:  ${uniquePriorities.size}/5 — [${[...uniquePriorities].join(", ")}]`);
console.log(`  skin_type distinct:     ${uniqueSkinTypes.size}/5 — [${[...uniqueSkinTypes].join(", ")}]`);
console.log(`  "dehydration" en top:   ${dehydrationCount}/5 fois`);

const varietyOk = uniquePriorities.size >= 3;
const dehydrationBias = dehydrationCount >= 3;

console.log();
if (varietyOk && !dehydrationBias) {
  console.log("  ✅ Variété OK — le prompt discrimine bien les profils");
} else if (!varietyOk) {
  console.log("  ⚠️  Variété FAIBLE — le prompt skew vers peu de sorties distinctes");
  console.log("     → Facteur limitant probable : le MODÈLE (gpt-4.1-mini lite trop prudent)");
  console.log("     → Essaie avec OPENAI_VISION_MODEL=gpt-4o dans .env.local");
} else if (dehydrationBias) {
  console.log("  ⚠️  BIAIS DÉSHYDRATATION — top_priority=dehydration trop fréquent");
  console.log("     → Revoir le prompt : ajouter un exemple négatif explicite");
}

console.log(`\n${"═".repeat(64)}\n`);
