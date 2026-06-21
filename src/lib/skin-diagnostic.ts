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

export const skinDiagnosticSchema = z.object({
  face_detected: z.boolean(),
  skin_type: skinTypeSchema,
  concerns: z.array(concernSchema).min(1),
  top_priority: concernSchema,
  summary: z.string().min(1),
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

  return skinDiagnosticSchema.parse({
    ...parsed,
    concerns: [...new Set(parsed.concerns)],
    confidence_reason: parsed.confidence_reason ?? undefined,
    skin_priority: parsed.skin_priority ?? undefined,
  });
}
