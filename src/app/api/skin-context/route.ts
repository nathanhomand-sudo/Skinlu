import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isCheckoutRecordPaid } from "@/lib/checkout-store";
import {
  buildSkinContextPrompt,
  parseSkinContextResult,
  skinContextJsonSchema,
  skinTypeSchema,
  visualAgeSchema,
} from "@/lib/visual-age";

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

  const photo = formData.get("photo");
  const resultId = formData.get("result_id");
  const accessToken = formData.get("access_token");
  const skinTypeInput = formData.get("skin_type");
  const resultInput = formData.get("result");

  if (
    !(photo instanceof File) ||
    typeof resultId !== "string" ||
    typeof accessToken !== "string" ||
    typeof resultInput !== "string"
  ) {
    return jsonError("skin_context_payload_invalid", 400);
  }

  const skinType = skinTypeSchema.safeParse(skinTypeInput);

  if (!skinType.success) {
    return jsonError("skin_type_required", 400);
  }

  if (!isCheckoutRecordPaid(accessToken, resultId)) {
    return jsonError("report_locked", 402);
  }

  if (!ACCEPTED_TYPES.has(photo.type)) {
    return jsonError("invalid_file_type", 400);
  }

  if (photo.size > MAX_FILE_SIZE) {
    return jsonError("file_too_large", 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("openai_key_missing", 500);
  }

  const result = visualAgeSchema.safeParse(JSON.parse(resultInput));

  if (!result.success || "error" in result.data) {
    return jsonError("analysis_result_invalid", 400);
  }

  try {
    const buffer = await photo.arrayBuffer();
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
                text: buildSkinContextPrompt(skinType.data, result.data),
              },
              {
                type: "input_image",
                image_url: imageDataUrl(buffer, photo.type),
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            ...skinContextJsonSchema,
          },
        },
      }),
      OPENAI_TIMEOUT_MS,
      "openai_timeout",
    );

    return NextResponse.json(parseSkinContextResult(response.output_text));
  } catch (error) {
    console.error("skin_context_analysis_failed", error);

    if (error instanceof Error && error.message === "openai_timeout") {
      return jsonError("service_timeout", 504);
    }

    return jsonError("skin_context_failed", 500);
  }
}
