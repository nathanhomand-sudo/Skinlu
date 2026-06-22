import { z } from "zod";
import { skinTypeSchema } from "@/lib/visual-age";

export const concernSchema = z.enum([
  "acne",
  "dehydration",
  "dark_spots",
  "aging",
  "sensitivity",
  "dullness",
  "enlarged_pores",
]);

export type Concern = z.infer<typeof concernSchema>;

const zoneSchema = z.object({
  observation: z.string(),
  concern: concernSchema.nullable().optional(),
});

const scoresSchema = z.object({
  evenness: z.number().min(0).max(25), // uniformité du teint
  texture: z.number().min(0).max(25), // grain / pores / irrégularités
  balance: z.number().min(0).max(25), // équilibre apparent (brillance, zones ternes)
  goal_match: z.number().min(0).max(25), // adéquation avec l'objectif utilisateur
  total: z.number().min(0).max(100),
});

export type SkinScores = z.infer<typeof scoresSchema>;

export const skinDiagnosticSchema = z.object({
  face_detected: z.boolean(),
  skin_type: skinTypeSchema,
  concerns: z.array(concernSchema).min(1),
  top_priority: concernSchema,
  summary: z.string().min(1),
  scores: scoresSchema.optional(),
  positive_observations: z.array(z.string()).optional(),
  improvement_axes: z.array(z.string()).optional(),
  zones: z
    .object({
      forehead: zoneSchema,
      cheeks: zoneSchema,
      t_zone: zoneSchema,
      texture: zoneSchema,
    })
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  confidence_reason: z.string().optional(),
  skin_priority: z.string().optional(),
  derma_flag: z.boolean().optional(),
});

export type SkinDiagnostic = z.infer<typeof skinDiagnosticSchema>;

const skinDiagnosticApiSchema = z.object({
  face_detected: z.boolean(),
  skin_type: skinTypeSchema,
  concerns: z.array(concernSchema),
  top_priority: concernSchema,
  summary: z.string(),
  scores: scoresSchema,
  positive_observations: z.array(z.string()),
  improvement_axes: z.array(z.string()),
  zones: z
    .object({
      forehead: z.object({ observation: z.string(), concern: concernSchema.nullable() }),
      cheeks: z.object({ observation: z.string(), concern: concernSchema.nullable() }),
      t_zone: z.object({ observation: z.string(), concern: concernSchema.nullable() }),
      texture: z.object({ observation: z.string(), concern: concernSchema.nullable() }),
    })
    .optional(),
  confidence: z.number().optional(),
  confidence_reason: z.string().nullable().optional(),
  skin_priority: z.string().nullable().optional(),
  derma_flag: z.boolean().optional(),
});

const CONCERN_ENUM = [
  "acne",
  "dehydration",
  "dark_spots",
  "aging",
  "sensitivity",
  "dullness",
  "enlarged_pores",
] as const;

const zonePropertySchema = {
  type: "object",
  additionalProperties: false,
  required: ["observation", "concern"],
  properties: {
    observation: { type: "string" },
    concern: {
      anyOf: [
        { type: "string", enum: [...CONCERN_ENUM] },
        { type: "null" },
      ],
    },
  },
} as const;

export const skinDiagnosticJsonSchema = {
  name: "skin_selfie_diagnostic",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "face_detected",
      "skin_type",
      "concerns",
      "top_priority",
      "summary",
      "scores",
      "positive_observations",
      "improvement_axes",
      "zones",
      "confidence",
      "confidence_reason",
      "skin_priority",
      "derma_flag",
    ],
    properties: {
      face_detected: {
        type: "boolean",
      },
      skin_type: {
        type: "string",
        enum: ["dry", "oily", "combination", "sensitive", "normal"],
      },
      concerns: {
        type: "array",
        items: {
          type: "string",
          enum: [...CONCERN_ENUM],
        },
      },
      top_priority: {
        type: "string",
        enum: [...CONCERN_ENUM],
      },
      summary: {
        type: "string",
      },
      scores: {
        type: "object",
        additionalProperties: false,
        required: ["evenness", "texture", "balance", "goal_match", "total"],
        properties: {
          evenness: { type: "number" },
          texture: { type: "number" },
          balance: { type: "number" },
          goal_match: { type: "number" },
          total: { type: "number" },
        },
      },
      positive_observations: {
        type: "array",
        items: { type: "string" },
      },
      improvement_axes: {
        type: "array",
        items: { type: "string" },
      },
      zones: {
        type: "object",
        additionalProperties: false,
        required: ["forehead", "cheeks", "t_zone", "texture"],
        properties: {
          forehead: zonePropertySchema,
          cheeks: zonePropertySchema,
          t_zone: zonePropertySchema,
          texture: zonePropertySchema,
        },
      },
      confidence: {
        type: "number",
      },
      confidence_reason: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      skin_priority: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      derma_flag: {
        type: "boolean",
      },
    },
  },
  strict: true,
} as const;

export function buildSkinDiagnosticPrompt(userContext?: string) {
  return `Tu es un systeme d'analyse cosmetique de selfie pour routine skincare.

ETAPE 1 — VALIDATION : L'image montre-t-elle un visage humain avec les yeux et le nez discernables, meme si l'image est un peu sombre, legerement floue, ou le visage partiellement cadre ? Si oui, face_detected: true. Retourne face_detected: false UNIQUEMENT si l'image ne contient clairement aucun visage humain (carte, objet, animal, main, document, screenshot, silhouette de dos, noir total, etc.).

ETAPE 2 — ANALYSE ZONE PAR ZONE (seulement si face_detected: true) :

Observe et analyse separement :
- forehead (front) : brillance, rides d'expression visibles, texture ?
- cheeks (joues) : secheresse, rougeurs, taches, pores ?
- t_zone (nez + menton) : sebum visible, pores dilates, imperfections ?
- texture (grain global) : lisse, granuleux, irregulier, pigmentation ?

Pour chaque zone : ecris une observation cosmetique courte (1 phrase) et indique la concern principale visible (ou null si aucune).

Deduis ensuite : skin_type probable, liste des concerns globales (1-4), top_priority, summary.

CONTEXTE UTILISATEUR OPTIONNEL :
${userContext?.trim() ? userContext.trim() : "Aucune reponse utilisateur fournie."}

Si le contexte utilisateur est fourni, combine les signes visibles et le ressenti pour nuancer les conclusions. Si contradiction, reste prudent avec "semble", "probable", "possible".

ETAPE 3 — SCORING COSMETIQUE (seulement si face_detected: true) :

Note la peau sur 4 criteres, chacun sur 25 points (25 = ideal cosmetique, 0 = tres marque). Sois rigoureux et coherent : la meme peau doit toujours donner les memes notes. Base-toi UNIQUEMENT sur ce qui est visible (+ le ressenti pour balance et goal_match).

1. evenness /25 — UNIFORMITE DU TEINT : homogeneite de la couleur, rougeurs visibles, differences de teint entre zones. Teint tres homogene = haut, rougeurs/heterogeneite marquees = bas.
2. texture /25 — TEXTURE : grain apparent, pores visibles, irregularites de surface. Grain lisse et regulier = haut, grain marque/pores dilates = bas.
3. balance /25 — EQUILIBRE APPARENT : brillance (sebum), zones ternes, croise avec le ressenti utilisateur (peau qui tire, brillance en zone T...). Peau equilibree = haut.
4. goal_match /25 — OBJECTIF UTILISATEUR : a quel point les elements VISIBLES correspondent (en bien) a la preoccupation indiquee par l'utilisateur. Si ce qui le preoccupe n'est pas/peu visible = haut (rassurant) ; si c'est tres visible = bas. Sans contexte utilisateur, note l'etat general par rapport a la top_priority.

total = evenness + texture + balance + goal_match (sur 100). Calcule-le exactement comme la somme.

positive_observations : 1 a 2 points reellement positifs et concrets, formules en francais court et valorisant (ex: "Teint homogene sur les joues", "Grain de peau regulier"). Jamais vide si face_detected.
improvement_axes : 1 a 2 axes d'amelioration cosmetiques concrets, en francais court, orientes action douce (ex: "Relancer l'eclat", "Reguler la brillance en zone T"). Distincts de la top_priority si possible.

FIABILITE DE L'ANALYSE :
- confidence : score entre 0.0 et 1.0 selon la qualite de l'image (netteté, luminosite, cadrage du visage). Bonne image = 0.75-0.95, floue/sombre = 0.35-0.60, tres mauvaise = 0.10-0.35.
- confidence_reason : null si confidence >= 0.7, sinon 1 phrase expliquant la limite (ex: "Image trop sombre pour bien lire la zone T.").
- skin_priority : 1 phrase en francais resumant la priorite cosmetique indicative principale (ex: "Regulation du sebum en zone T avec douceur pour eviter la surproduction."). null si face_detected: false.
- derma_flag : true uniquement si des signes visibles (rougeurs persistantes intenses, lesions atypiques, pigmentation irreguliere marquee) meritent un avis professionnel. Sinon false.

JSON attendu :
- face_detected: true/false
- skin_type: dry/oily/combination/sensitive/normal (defaut "normal" si pas de visage)
- concerns: 1 a 4 parmi acne/dehydration/dark_spots/aging/sensitivity/dullness/enlarged_pores (["dullness"] si pas de visage)
- top_priority: concern principale ("dullness" si pas de visage)
- summary: 3 phrases en francais, ton direct (jamais medical). P1: "Ta peau semble..." ou "On voit surtout...". P2: lien avec ressenti si dispo. P3: direction routine claire. ("Aucun visage detecte." si pas de visage)
- scores: objet { evenness, texture, balance, goal_match } chacun 0-25, et total = leur somme (0-100). Tout a 0 si pas de visage.
- positive_observations: 1-2 phrases courtes valorisantes ([] si pas de visage)
- improvement_axes: 1-2 phrases courtes d'axes d'amelioration ([] si pas de visage)
- zones: objet avec forehead/cheeks/t_zone/texture (observation + concern|null pour chaque)
- confidence: 0.0-1.0
- confidence_reason: string|null
- skin_priority: string|null
- derma_flag: boolean

Retourne uniquement le JSON.`;
}

export function parseSkinDiagnostic(rawText: string): SkinDiagnostic {
  const parsed = skinDiagnosticApiSchema.parse(JSON.parse(rawText));

  if (!parsed.concerns.includes(parsed.top_priority)) {
    parsed.concerns.unshift(parsed.top_priority);
  }

  // Stabilité du score : on ne fait jamais confiance à un "total" libre du
  // modèle. On clamp chaque sous-score sur 25 et le total EST leur somme.
  const sub = (n: number) => Math.max(0, Math.min(25, Math.round(n)));
  const ev = sub(parsed.scores.evenness);
  const tx = sub(parsed.scores.texture);
  const ba = sub(parsed.scores.balance);
  const go = sub(parsed.scores.goal_match);
  const scores = { evenness: ev, texture: tx, balance: ba, goal_match: go, total: ev + tx + ba + go };

  return skinDiagnosticSchema.parse({
    ...parsed,
    concerns: [...new Set(parsed.concerns)],
    scores,
    positive_observations: parsed.positive_observations.filter((s) => s.trim()).slice(0, 3),
    improvement_axes: parsed.improvement_axes.filter((s) => s.trim()).slice(0, 3),
    confidence_reason: parsed.confidence_reason ?? undefined,
    skin_priority: parsed.skin_priority ?? undefined,
  });
}
