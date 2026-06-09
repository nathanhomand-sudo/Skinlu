import { NextResponse } from "next/server";
import { getPaidDiagnostic } from "@/lib/checkout-store";
import { buildRoutineFromProducts } from "@/lib/matching";
import type { Concern } from "@/lib/skin-diagnostic";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { SkinType } from "@/lib/visual-age";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sessionToken?: string;
  };

  if (!body.sessionToken) {
    return jsonError("session_token_required", 400);
  }

  try {
    const diagnostic = await getPaidDiagnostic(body.sessionToken);

    if (!diagnostic) {
      return jsonError("report_locked", 402);
    }

    const supabase = getSupabaseAdmin();
    const { data: existingRoutine, error: routineQueryError } = await supabase
      .from("routines")
      .select("*")
      .eq("diagnostic_id", diagnostic.id)
      .maybeSingle();

    if (routineQueryError) {
      throw new Error(`routine_query_failed: ${routineQueryError.message}`);
    }

    const routine = await buildRoutineFromProducts(
      supabase,
      diagnostic.concerns as Concern[],
      diagnostic.skin_type as SkinType,
      diagnostic.top_priority as Concern,
    );

    if (!existingRoutine) {
      const { error: insertError } = await supabase.from("routines").insert({
        diagnostic_id: diagnostic.id,
        morning_product_ids: routine.morning.map((product) => product.id),
        evening_product_ids: routine.evening.map((product) => product.id),
        ai_explanation: routine.ai_explanation,
      });

      if (insertError) {
        throw new Error(`routine_insert_failed: ${insertError.message}`);
      }
    }

    return NextResponse.json({
      skin_type: diagnostic.skin_type,
      concerns: diagnostic.concerns,
      top_priority: diagnostic.top_priority,
      morning: routine.morning,
      evening: routine.evening,
      ai_explanation: routine.ai_explanation,
      disclaimer: "Routine cosmetique informative, pas un diagnostic medical.",
    });
  } catch (error) {
    console.error("report_generation_failed", error);
    return jsonError("report_generation_failed", 500);
  }
}
