import { NextResponse } from "next/server";
import { isCheckoutRecordPaid } from "@/lib/checkout-store";
import { fullReportSchema, type VisualAgeResult } from "@/lib/visual-age";

export const runtime = "nodejs";
export const maxDuration = 60;

const DISCLAIMER = "Ceci est une estimation visuelle, pas un diagnostic medical.";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    resultId?: string;
    accessToken?: string;
    result?: VisualAgeResult;
  };

  if (!body.resultId || !body.accessToken || !body.result) {
    return jsonError("report_payload_invalid", 400);
  }

  if ("error" in body.result) {
    return jsonError("no_label_detected", 400);
  }

  if (!isCheckoutRecordPaid(body.accessToken, body.resultId)) {
    return jsonError("report_locked", 402);
  }

  const report = fullReportSchema.parse({
    full_analysis: body.result.full_analysis,
    skin_type_compatibility: body.result.skin_type_compatibility,
    warnings: body.result.warnings,
    positives: body.result.positives,
    disclaimer: DISCLAIMER,
  });

  return NextResponse.json(report);
}
