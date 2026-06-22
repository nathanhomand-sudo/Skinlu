import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildSkinDiagnosticPrompt,
  parseSkinDiagnostic,
  skinDiagnosticJsonSchema,
} from "@/lib/skin-diagnostic";
import { getSupabaseAdmin } from "@/lib/supabase";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 45_000;

// Garde-fou anti-abus : rate-limit par IP (chaque scan = 1 appel OpenAI payant).
// In-memory (par instance serverless) = v1 ; à renforcer (Upstash/auth) avant
// de scaler. Suffisant au stade actuel pour éviter qu'un bot spamme la facture.
const RL_MAX = 5; // requêtes
const RL_WINDOW_MS = 10 * 60 * 1000; // par 10 min
const rlGlobal = globalThis as typeof globalThis & { skinRl?: Map<string, number[]> };
const rlStore = rlGlobal.skinRl ?? new Map<string, number[]>();
rlGlobal.skinRl = rlStore;

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  return (xff?.split(",")[0].trim()) || request.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rlStore.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length >= RL_MAX) {
    rlStore.set(ip, hits);
    return true;
  }
  hits.push(now);
  rlStore.set(ip, hits);
  return false;
}

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function imageDataUrl(buffer: ArrayBuffer, contentType: string) {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

function formatSkinProfile(input: FormDataEntryValue | null) {
  if (typeof input !== "string" || !input.trim()) return undefined;

  try {
    const parsed = JSON.parse(input) as Record<string, unknown>;
    const lines: string[] = [];

    if (typeof parsed.tight_after_cleansing === "string") {
      lines.push(`- Apres nettoyage, la peau tire : ${parsed.tight_after_cleansing}`);
    }
    if (typeof parsed.shine_area === "string") {
      lines.push(`- En journee, brillance surtout : ${parsed.shine_area}`);
    }
    if (typeof parsed.reacts_to_products === "string") {
      lines.push(`- Reaction aux nouveaux produits : ${parsed.reacts_to_products}`);
    }

    return lines.length ? lines.join("\n") : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return jsonError("rate_limited", 429);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("multipart_form_required", 400);
  }

  const selfie = formData.get("selfie");
  const emailInput = formData.get("email");
  const skinProfileInput = formData.get("skin_profile");

  if (!(selfie instanceof File)) {
    return jsonError("selfie_required", 400);
  }

  if (!ACCEPTED_TYPES.has(selfie.type)) {
    return jsonError("invalid_file_type", 400);
  }

  if (selfie.size > MAX_FILE_SIZE) {
    return jsonError("file_too_large", 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("openai_key_missing", 500);
  }

  try {
    const buffer = await selfie.arrayBuffer();
    const skinProfileContext = formatSkinProfile(skinProfileInput);
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await withTimeout(
      client.responses.create({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini",
        temperature: 0, // scoring reproductible : même photo → même note
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildSkinDiagnosticPrompt(skinProfileContext),
              },
              {
                type: "input_image",
                image_url: imageDataUrl(buffer, selfie.type),
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            ...skinDiagnosticJsonSchema,
          },
        },
      }),
      OPENAI_TIMEOUT_MS,
      "openai_timeout",
    );

    const diagnostic = parseSkinDiagnostic(response.output_text);

    if (!diagnostic.face_detected) {
      return jsonError("no_face_detected", 400);
    }

    const sessionToken = crypto.randomUUID();
    const email =
      typeof emailInput === "string" && emailInput.trim()
        ? emailInput.trim()
        : null;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("diagnostics").insert({
      session_token: sessionToken,
      skin_type: diagnostic.skin_type,
      concerns: diagnostic.concerns,
      top_priority: diagnostic.top_priority,
      email,
    });

    if (error) {
      console.error("diagnostic_insert_failed", error);
      return jsonError("diagnostic_save_failed", 500);
    }

    return NextResponse.json({
      session_token: sessionToken,
      skin_type: diagnostic.skin_type,
      concerns: diagnostic.concerns.slice(0, 2),
      top_priority: diagnostic.top_priority,
      summary: diagnostic.summary,
      scores: diagnostic.scores ?? null,
      positive_observations: diagnostic.positive_observations ?? [],
      improvement_axes: diagnostic.improvement_axes ?? [],
      disclaimer: "Analyse cosmetique indicative. Ne remplace pas l'avis d'un professionnel de sante.",
      zones: diagnostic.zones ?? null,
      confidence: diagnostic.confidence ?? null,
      confidence_reason: diagnostic.confidence_reason ?? null,
      skin_priority: diagnostic.skin_priority ?? null,
      derma_flag: diagnostic.derma_flag ?? false,
    });
  } catch (error) {
    console.error("skin_diagnostic_failed", error);

    if (error instanceof Error && error.message === "openai_timeout") {
      return jsonError("service_timeout", 504);
    }

    return jsonError("skin_diagnostic_failed", 500);
  }
}
