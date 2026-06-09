import { getSupabaseAdmin } from "@/lib/supabase";

export async function attachCheckoutEmail(sessionToken: string, email: string | null) {
  if (!email) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("diagnostics")
    .update({ email })
    .eq("session_token", sessionToken);

  if (error) {
    throw new Error(`diagnostic_email_update_failed: ${error.message}`);
  }
}

export async function markCheckoutRecordPaid(
  sessionToken: string,
  stripeSessionId: string,
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("diagnostics")
    .update({
      paid: true,
      stripe_session_id: stripeSessionId,
    })
    .eq("session_token", sessionToken);

  if (error) {
    throw new Error(`diagnostic_payment_update_failed: ${error.message}`);
  }
}

export async function getPaidDiagnostic(sessionToken: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("diagnostics")
    .select("*")
    .eq("session_token", sessionToken)
    .eq("paid", true)
    .maybeSingle();

  if (error) {
    throw new Error(`paid_diagnostic_query_failed: ${error.message}`);
  }

  return data;
}
