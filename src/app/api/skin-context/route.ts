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

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("multipart_form_required", 400);
  }

  const selfie = formData.get("selfie");
  const emailInput = formData.get("email");

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
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await withTimeout(
      client.responses.create({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildSkinDiagnosticPrompt(),
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
      disclaimer: "Analyse cosmetique generee par IA, pas un diagnostic medical.",
    });
  } catch (error) {
    console.error("skin_diagnostic_failed", error);

    if (error instanceof Error && error.message === "openai_timeout") {
      return jsonError("service_timeout", 504);
    }

    return jsonError("skin_diagnostic_failed", 500);
  }
}
