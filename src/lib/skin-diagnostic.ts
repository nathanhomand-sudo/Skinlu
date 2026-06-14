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

export const skinDiagnosticSchema = z.object({
  face_detected: z.boolean(),
  skin_type: skinTypeSchema,
  concerns: z.array(concernSchema).min(1),
  top_priority: concernSchema,
  summary: z.string().min(1),
});

export type SkinDiagnostic = z.infer<typeof skinDiagnosticSchema>;

const skinDiagnosticApiSchema = z.object({
  face_detected: z.boolean(),
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
    required: ["face_detected", "skin_type", "concerns", "top_priority", "summary"],
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

export function buildSkinDiagnosticPrompt(userContext?: string) {
  return `Tu es un systeme d'analyse cosmetique de selfie pour routine skincare.

ETAPE 1 — VALIDATION : L'image montre-t-elle un visage humain clairement visible et bien eclaire ? Si non (carte, objet, animal, main, flou total, document, screenshot, etc.), retourne face_detected: false avec des valeurs par defaut pour les autres champs.

ETAPE 2 — ANALYSE (seulement si face_detected: true) : Observe les indices cosmetiques visibles uniquement : brillance, zones qui semblent seches, rougeurs apparentes, texture visible, pores apparents, teint terne, marques visibles. Deduis un type de peau probable depuis ces indices visuels, en restant prudent. Ne fais jamais de diagnostic medical. Ne parle pas de maladie. N'identifie pas la personne.

CONTEXTE UTILISATEUR OPTIONNEL :
${userContext?.trim() ? userContext.trim() : "Aucune reponse utilisateur fournie."}

Si le contexte utilisateur est fourni, combine les signes visibles et le ressenti utilisateur pour nuancer le type probable et la priorite cosmetique indicative. Si les deux se contredisent, reste prudent et emploie des formulations comme "semble", "probable", "possible", "a confirmer".

JSON attendu :
- face_detected: true si visage humain clairement visible, false sinon
- skin_type: type probable (dry/oily/combination/sensitive/normal). Si face_detected: false, mets "normal" par defaut.
- concerns: 1 a 4 parmi acne, dehydration, dark_spots, aging, sensitivity, dullness, enlarged_pores. Si face_detected: false, mets ["dehydration"].
- top_priority: priorite cosmetique indicative la plus importante. Si face_detected: false, mets "dehydration".
- summary: 3 phrases en francais, ton direct et personnel (jamais medical, jamais categorique). Phrase 1 : commence par "Ta peau semble..." ou "On voit surtout..." et decris les signes visibles ou probables. Phrase 2 : relie ces signes au ressenti utilisateur si disponible. Phrase 3 : propose une direction de routine claire, sans promettre de resultat clinique. Si face_detected: false, mets "Aucun visage detecte."

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
