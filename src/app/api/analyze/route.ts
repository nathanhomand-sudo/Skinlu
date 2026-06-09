import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildVisualAgePrompt,
  parseVisualAgeResult,
  skinTypeSchema,
  visualAgeJsonSchema,
  type VisualAgeResult,
  type SkinType,
} from "@/lib/visual-age";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MIN_IMAGE_SIDE = 256;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const BLOB_TIMEOUT_MS = 15_000;
const OPENAI_TIMEOUT_MS = 45_000;

export const runtime = "nodejs";
export const maxDuration = 60;

type CacheEntry = {
  result: VisualAgeResult;
  expiresAt: number;
};

const globalCache = globalThis as typeof globalThis & {
  visualAgeCache?: Map<string, CacheEntry>;
};

const resultCache = globalCache.visualAgeCache ?? new Map<string, CacheEntry>();
globalCache.visualAgeCache = resultCache;

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

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function sanitizeFilename(filename: string) {
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return safeName || "skincare-label";
}

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16);
}

function getPngDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function getJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];

    if (length < 2) {
      return null;
    }

    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3
    ) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }

    offset += 2 + length;
  }

  return null;
}

function getWebpDimensions(bytes: Uint8Array) {
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  const chunk = String.fromCharCode(...bytes.slice(12, 16));

  if (bytes.length < 30 || riff !== "RIFF" || webp !== "WEBP") {
    return null;
  }

  if (chunk === "VP8X") {
    return {
      width: readUint24LittleEndian(bytes, 24) + 1,
      height: readUint24LittleEndian(bytes, 27) + 1,
    };
  }

  if (chunk === "VP8 " && bytes.length >= 30) {
    return {
      width: bytes[26] + ((bytes[27] & 0x3f) << 8),
      height: bytes[28] + ((bytes[29] & 0x3f) << 8),
    };
  }

  if (chunk === "VP8L" && bytes.length >= 25) {
    const bits =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

function getImageDimensions(buffer: ArrayBuffer, contentType: string) {
  const bytes = new Uint8Array(buffer);

  if (contentType === "image/png") {
    return getPngDimensions(bytes);
  }

  if (contentType === "image/jpeg") {
    return getJpegDimensions(bytes);
  }

  if (contentType === "image/webp") {
    return getWebpDimensions(bytes);
  }

  return null;
}

function hasEnoughImageDetail(buffer: ArrayBuffer, contentType: string) {
  const dimensions = getImageDimensions(buffer, contentType);

  if (!dimensions) {
    return false;
  }

  return dimensions.width >= MIN_IMAGE_SIDE && dimensions.height >= MIN_IMAGE_SIDE;
}

function getCachedResult(hash: string) {
  const cached = resultCache.get(hash);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    resultCache.delete(hash);
    return null;
  }

  return cached.result;
}

function setCachedResult(hash: string, result: VisualAgeResult) {
  resultCache.set(hash, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function analyzeImageUrl(imageUrl: string, skinType: SkinType) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

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
              text: buildVisualAgePrompt(skinType),
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          ...visualAgeJsonSchema,
        },
      },
    }),
    OPENAI_TIMEOUT_MS,
    "openai_timeout",
  );

  return parseVisualAgeResult(response.output_text);
}

function imageDataUrl(buffer: ArrayBuffer, contentType: string) {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

async function uploadTemporaryBlob(
  pathname: string,
  uploadBody: Blob,
  contentType: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BLOB_TIMEOUT_MS);

  try {
    const blob = await put(pathname, uploadBody, {
      access: "private",
      addRandomSuffix: true,
      contentType,
      abortSignal: controller.signal,
    });

    return blob.url;
  } catch (error) {
    if (isAbortError(error)) {
      console.warn("blob_upload_aborted_after_timeout");
      return null;
    }

    console.warn("blob_upload_skipped", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("multipart_form_required", 400);
  }

  const photo = formData.get("photo");
  const skinTypeInput = formData.get("skin_type");

  if (!(photo instanceof File)) {
    return jsonError("photo_required", 400);
  }

  const skinType = skinTypeSchema.safeParse(skinTypeInput);

  if (!skinType.success) {
    return jsonError("skin_type_required", 400);
  }

  if (!ACCEPTED_TYPES.has(photo.type)) {
    return jsonError("invalid_file_type", 400);
  }

  if (photo.size > MAX_FILE_SIZE) {
    return jsonError("file_too_large", 400);
  }

  const buffer = await photo.arrayBuffer();
  const imageHash = await sha256Hex(buffer);
  const cacheKey = `${imageHash}:${skinType.data}`;

  if (!hasEnoughImageDetail(buffer, photo.type)) {
    return NextResponse.json({
      error: "no_label_detected",
      result_id: imageHash,
    });
  }

  const cachedResult = getCachedResult(cacheKey);

  if (cachedResult) {
    return NextResponse.json({
      ...cachedResult,
      result_id: imageHash,
    });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return jsonError("blob_token_missing", 500);
  }

  let blobUrl: string | null = null;

  try {
    const extension = photo.type.split("/")[1] ?? "jpg";
    const pathname = `analysis/${imageHash}-${sanitizeFilename(photo.name)}.${extension}`;
    const uploadBody = new Blob([buffer], { type: photo.type });
    blobUrl = await uploadTemporaryBlob(
      pathname,
      uploadBody,
      photo.type,
    );

    const result = await analyzeImageUrl(
      imageDataUrl(buffer, photo.type),
      skinType.data,
    );
    setCachedResult(cacheKey, result);

    return NextResponse.json({
      ...result,
      result_id: imageHash,
    });
  } catch (error) {
    console.error("skincare_label_analysis_failed", error);

    if (
      error instanceof Error &&
      error.message === "openai_timeout"
    ) {
      return jsonError("service_timeout", 504);
    }

    return jsonError("analysis_failed", 500);
  } finally {
    if (blobUrl) {
      try {
        await del(blobUrl);
      } catch (deleteError) {
        console.error("blob_delete_failed", deleteError);
      }
    }
  }
}
