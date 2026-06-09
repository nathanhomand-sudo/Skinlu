import { z } from "zod";

export const skinTypeSchema = z.enum([
  "dry",
  "oily",
  "combination",
  "sensitive",
  "normal",
]);

export type SkinType = z.infer<typeof skinTypeSchema>;

const ingredientVerdictSchema = z.enum(["bon", "neutre", "attention"]);

const ingredientAnalysisSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  verdict: ingredientVerdictSchema,
});

export const visualAgeSchema = z.union([
  z.object({
    product_name: z.string().min(1),
    ingredients_count: z.number().int().min(0),
    score: z.number().min(0).max(100),
    verdict: z.string().min(1),
    top_ingredients_free: z.array(ingredientAnalysisSchema).length(3),
    full_analysis: z
      .array(
        ingredientAnalysisSchema.extend({
          detail: z.string().min(1),
        }),
      )
      .min(1),
    skin_type_compatibility: z.string().min(1),
    warnings: z.array(z.string()),
    positives: z.array(z.string()),
  }),
  z.object({
    error: z.literal("no_label_detected"),
  }),
]);

export type VisualAgeResult = z.infer<typeof visualAgeSchema>;

const visualAgeApiSchema = z.union([
  z.object({
    product_name: z.string(),
    ingredients_count: z.number().int().min(0),
    score: z.number().min(0).max(100),
    verdict: z.string(),
    top_ingredients_free: z.array(ingredientAnalysisSchema).length(3),
    full_analysis: z.array(
      ingredientAnalysisSchema.extend({
        detail: z.string(),
      }),
    ),
    skin_type_compatibility: z.string(),
    warnings: z.array(z.string()),
    positives: z.array(z.string()),
    error: z.null(),
  }),
  z.object({
    product_name: z.string(),
    ingredients_count: z.number().int().min(0),
    score: z.number().min(0).max(100),
    verdict: z.string(),
    top_ingredients_free: z.array(ingredientAnalysisSchema),
    full_analysis: z.array(
      ingredientAnalysisSchema.extend({
        detail: z.string(),
      }),
    ),
    skin_type_compatibility: z.string(),
    warnings: z.array(z.string()),
    positives: z.array(z.string()),
    error: z.literal("no_label_detected"),
  }),
  z.object({
    error: z.literal("no_label_detected"),
  }),
]);

export const fullReportSchema = z.object({
  full_analysis: z
    .array(
      ingredientAnalysisSchema.extend({
        detail: z.string().min(1),
      }),
    )
    .min(1),
  skin_type_compatibility: z.string().min(1),
  warnings: z.array(z.string()),
  positives: z.array(z.string()),
  disclaimer:
    z.literal("Ceci est une estimation visuelle, pas un diagnostic medical."),
});

export type FullReport = z.infer<typeof fullReportSchema>;

export const skinContextSchema = z.union([
  z.object({
    visible_skin_context: z.string().min(1),
    observations: z.array(z.string()).length(3),
    personalization_note: z.string().min(1),
    disclaimer: z.literal(
      "Analyse visuelle cosmetique, pas un diagnostic medical.",
    ),
  }),
  z.object({
    error: z.literal("no_skin_photo_detected"),
  }),
]);

export type SkinContextResult = z.infer<typeof skinContextSchema>;

const skinContextApiSchema = z.object({
  visible_skin_context: z.string(),
  observations: z.array(z.string()),
  personalization_note: z.string(),
  disclaimer: z.string(),
  error: z.enum(["no_skin_photo_detected"]).nullable(),
});

export const skinContextJsonSchema = {
  name: "skin_context_analysis",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "visible_skin_context",
      "observations",
      "personalization_note",
      "disclaimer",
      "error",
    ],
    properties: {
      visible_skin_context: {
        type: "string",
      },
      observations: {
        type: "array",
        items: { type: "string" },
      },
      personalization_note: {
        type: "string",
      },
      disclaimer: {
        type: "string",
        enum: ["Analyse visuelle cosmetique, pas un diagnostic medical."],
      },
      error: {
        type: ["string", "null"],
        enum: ["no_skin_photo_detected", null],
      },
    },
  },
  strict: true,
} as const;

export const visualAgeJsonSchema = {
  name: "skincare_label_analysis",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "product_name",
      "ingredients_count",
      "score",
      "verdict",
      "top_ingredients_free",
      "full_analysis",
      "skin_type_compatibility",
      "warnings",
      "positives",
      "error",
    ],
    properties: {
      product_name: {
        type: "string",
      },
      ingredients_count: {
        type: "integer",
        minimum: 0,
      },
      score: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      verdict: {
        type: "string",
      },
      top_ingredients_free: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "role", "verdict"],
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            verdict: {
              type: "string",
              enum: ["bon", "neutre", "attention"],
            },
          },
        },
      },
      full_analysis: {
        type: "array",
        items: {
        type: "object",
        additionalProperties: false,
          required: ["name", "role", "verdict", "detail"],
        properties: {
            name: { type: "string" },
            role: { type: "string" },
            verdict: {
              type: "string",
              enum: ["bon", "neutre", "attention"],
            },
            detail: { type: "string" },
          },
        },
      },
      skin_type_compatibility: {
        type: "string",
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
      positives: {
        type: "array",
        items: { type: "string" },
      },
      error: {
        type: ["string", "null"],
        enum: ["no_label_detected", null],
      },
    },
  },
  strict: true,
} as const;

const skinTypeLabels: Record<SkinType, string> = {
  dry: "seche",
  oily: "grasse",
  combination: "mixte",
  sensitive: "sensible",
  normal: "normale",
};

export function buildVisualAgePrompt(skinType: SkinType) {
  const skinTypeLabel = skinTypeLabels[skinType];

  return `Tu es un systeme d'analyse d'etiquettes skincare par IA. L'utilisateur a declare avoir une peau ${skinTypeLabel}. Ton role est de lire l'etiquette visible sur la photo, d'identifier les ingredients cosmetiques, puis d'evaluer leur compatibilite avec ce type de peau.

Analyse uniquement les informations visibles sur l'etiquette. Ne devine pas une liste INCI complete si elle n'est pas lisible. Tu peux regrouper les ingredients notables, mais sois prudent et concret. Le score represente la compatibilite globale avec une peau ${skinTypeLabel}, de 0 a 100. Ce n'est pas un diagnostic medical.

Classe chaque ingredient notable avec:
- "bon": utile ou generalement favorable pour une peau ${skinTypeLabel}
- "neutre": effet attendu limite ou depend du contexte
- "attention": ingredient a surveiller pour une peau ${skinTypeLabel}, sans affirmer qu'il est dangereux

Retourne uniquement un objet JSON valide avec cette structure exacte :
{
  "product_name": string,
  "ingredients_count": number,
  "score": number (0-100, compatibilite avec le type de peau declare),
  "verdict": string (1 phrase sobre),
  "top_ingredients_free": [
    { "name": string, "role": string, "verdict": "bon" | "neutre" | "attention" }
  ] (3 ingredients cles seulement pour le niveau gratuit),
  "full_analysis": [
    { "name": string, "role": string, "verdict": "bon" | "neutre" | "attention", "detail": string }
  ] (tous les ingredients notables pour le niveau payant),
  "skin_type_compatibility": string (1 phrase),
  "warnings": [string] (ingredients a surveiller pour ce type de peau),
  "positives": [string] (ingredients benefiques pour ce type de peau),
  "error": null
}
Si la photo ne montre pas d'etiquette skincare lisible ou si les ingredients ne sont pas assez lisibles, retourne le meme objet avec "error": "no_label_detected", des chaines vides, ingredients_count: 0, score: 0, top_ingredients_free: [], full_analysis: [], warnings: [], positives: [].
Ne retourne rien d'autre que le JSON.`;
}

export function parseVisualAgeResult(rawText: string): VisualAgeResult {
  const parsed = visualAgeApiSchema.parse(JSON.parse(rawText));

  if (parsed.error === "no_label_detected") {
    return { error: "no_label_detected" };
  }

  return visualAgeSchema.parse({
    product_name: parsed.product_name,
    ingredients_count: parsed.ingredients_count,
    score: parsed.score,
    verdict: parsed.verdict,
    top_ingredients_free: parsed.top_ingredients_free,
    full_analysis: parsed.full_analysis,
    skin_type_compatibility: parsed.skin_type_compatibility,
    warnings: parsed.warnings,
    positives: parsed.positives,
  });
}

export function buildSkinContextPrompt(
  skinType: SkinType,
  result: Exclude<VisualAgeResult, { error: "no_label_detected" }>,
) {
  const skinTypeLabel = skinTypeLabels[skinType];

  return `Tu ajoutes un contexte visuel cosmetique prudent au rapport skincare deja paye. L'utilisateur declare une peau ${skinTypeLabel}. La photo montre sa peau actuelle, mais elle peut etre influencee par la lumiere, l'angle, le maquillage, la camera et le moment de la journee.

N'identifie pas la personne. Ne fais pas de diagnostic dermatologique. Ne parle pas de maladie. Ne recommande pas de traitement medical. Observe seulement des indices visuels cosmetiques possibles: brillance apparente, rougeurs visibles, zones qui semblent seches, texture visible, sensibilite apparente, sans certitude.

Analyse etiquette deja obtenue:
${JSON.stringify(result)}

Retourne uniquement un JSON valide avec cette structure exacte:
{
  "visible_skin_context": string (1 phrase sobre sur le contexte visuel observe),
  "observations": [string, string, string] (3 observations cosmetiques prudentes et actionnables),
  "personalization_note": string (1 phrase expliquant comment ce contexte affine la lecture des ingredients),
  "disclaimer": "Analyse visuelle cosmetique, pas un diagnostic medical.",
  "error": null
}
Si la photo ne montre pas assez clairement une zone de peau, retourne le meme objet avec "error": "no_skin_photo_detected", des chaines vides et observations: [].
Ne retourne rien d'autre que le JSON.`;
}

export function parseSkinContextResult(rawText: string): SkinContextResult {
  const parsed = skinContextApiSchema.parse(JSON.parse(rawText));

  if (parsed.error === "no_skin_photo_detected") {
    return { error: "no_skin_photo_detected" };
  }

  return skinContextSchema.parse({
    visible_skin_context: parsed.visible_skin_context,
    observations: parsed.observations,
    personalization_note: parsed.personalization_note,
    disclaimer: parsed.disclaimer,
  });
}
