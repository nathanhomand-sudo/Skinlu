import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "").trim();

  if (!accessToken) return jsonError("unauthorized", 401);

  let body: { sessionToken?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("json_required", 400);
  }

  if (!body.sessionToken) return jsonError("session_token_required", 400);

  const admin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(accessToken);

  if (userError || !user) return jsonError("invalid_token", 401);

  const { error: updateError } = await admin
    .from("diagnostics")
    .update({ user_id: user.id, email: user.email ?? null })
    .eq("session_token", body.sessionToken)
    .is("user_id", null);

  if (updateError) {
    console.error("link_diagnostic_failed", updateError);
    return jsonError("link_failed", 500);
  }

  return NextResponse.json({ linked: true });
}
