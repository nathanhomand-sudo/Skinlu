import { z } from "zod";
import { skinTypeSchema, type SkinType } from "@/lib/visual-age";

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

export const skinDiagnosticSchema = z.object({
  skin_type: skinTypeSchema,
  concerns: z.array(concernSchema).min(1),
  top_priority: concernSchema,
  summary: z.string().min(1),
});

export type SkinDiagnostic = z.infer<typeof skinDiagnosticSchema>;

const skinDiagnosticApiSchema = z.object({
  skin_type: skinTypeSchema,
  concerns: z.array(concernSchema),
  top_priority: concernSchema,
  summary: z.string(),
});

export const skinDiagnosticJsonSchema = {
  name: "skin_selfie_diagnostic",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["skin_type", "concerns", "top_priority", "summary"],
    properties: {
      skin_type: {
        type: "string",
        enum: ["dry", "oily", "combination", "sensitive", "normal"],
      },
      concerns: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "acne",
            "dehydration",
            "dark_spots",
            "aging",
            "sensitivity",
            "dullness",
            "enlarged_pores",
          ],
        },
      },
      top_priority: {
        type: "string",
        enum: [
          "acne",
          "dehydration",
          "dark_spots",
          "aging",
          "sensitivity",
          "dullness",
          "enlarged_pores",
        ],
      },
      summary: {
        type: "string",
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

export function buildSkinDiagnosticPrompt(skinType: SkinType) {
  return `Tu es un systeme d'analyse cosmetique de selfie pour routine skincare. L'utilisateur declare avoir une peau ${skinTypeLabels[skinType]}.

Analyse seulement les indices cosmetiques visibles: brillance, zones qui semblent seches, rougeurs apparentes, texture visible, pores apparents, teint terne, marques visibles. Ne fais jamais de diagnostic medical, dermatologique ou pathologique. Ne parle pas de maladie. N'identifie pas la personne.

Tu dois retourner un JSON strict avec:
- skin_type: le type de peau declare par l'utilisateur, sauf si l'image contredit clairement ce choix cosmetiquement
- concerns: entre 1 et 4 preoccupations parmi acne, dehydration, dark_spots, aging, sensitivity, dullness, enlarged_pores
- top_priority: la preoccupation la plus importante parmi concerns
- summary: une phrase courte, prudente et non medicale

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
  });
}
