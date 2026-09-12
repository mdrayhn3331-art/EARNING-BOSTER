// ============================================================
// Supabase Edge Function: cpx-postback
// ------------------------------------------------------------
// This is the URL you paste into CPX Research's dashboard under
// "Postback URL". CPX calls this URL server-to-server whenever
// one of your users completes a survey/offer, so it can't be
// faked from the browser the way a client-side "I finished!"
// button could be.
//
// IMPORTANT — verify against your own CPX dashboard:
// The exact query parameter names below (status, trans_id,
// amount_local, user_id, hash) match CPX's commonly documented
// postback macros, but CPX can customize these per account.
// Before going live:
//   1. Open CPX Research → your App → "Postback" tab
//   2. Compare the parameter names shown there to the ones read
//      below (PARAM.get("...")) and adjust if they differ
//   3. If "Secure Hash" / postback signing is enabled on your
//      account, get the exact hashing formula from your account
//      manager and fill in verifyHash() accordingly — the
//      version below is a placeholder pattern, not a confirmed
//      CPX formula.
//
// Deploy with:
//   supabase functions deploy cpx-postback
// Then set these secrets (never hard-code them in the file):
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
//   supabase secrets set CPX_POSTBACK_SECRET=xxx   (if hashing enabled)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CPX_POSTBACK_SECRET = Deno.env.get("CPX_POSTBACK_SECRET") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verifyHash(params: URLSearchParams): Promise<boolean> {
  if (!CPX_POSTBACK_SECRET) return true; // hashing not enabled on this account
  const providedHash = params.get("hash") || "";
  if (!providedHash) return false;

  // Placeholder scheme: HMAC-SHA1 of the full query string using your
  // shared secret. Replace with the exact formula CPX gives you if
  // it differs (see comment block above).
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(CPX_POSTBACK_SECRET),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const paramsWithoutHash = new URLSearchParams(params);
  paramsWithoutHash.delete("hash");
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(paramsWithoutHash.toString())
  );
  const computedHash = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === providedHash;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const params = url.searchParams;

  // Common CPX-style postback fields — adjust names per your dashboard.
  const status = params.get("status");          // e.g. "1" = confirmed, "2" = reversed
  const transId = params.get("trans_id");        // unique transaction id
  const userId = params.get("user_id");          // this is the ext_user_id you sent = Supabase auth user id
  const amountLocal = params.get("amount_local"); // payout in your local currency/points

  if (!transId || !userId || !amountLocal) {
    return new Response("Missing required parameters", { status: 400 });
  }

  const validHash = await verifyHash(params);
  if (!validHash) {
    return new Response("Invalid hash", { status: 403 });
  }

  // Reversed/cancelled conversions (e.g. status === "2") should NOT pay out.
  if (status === "2") {
    return new Response("OK (reversal ignored)", { status: 200 });
  }

  const amount = parseFloat(amountLocal);
  if (isNaN(amount) || amount <= 0) {
    return new Response("Invalid amount", { status: 400 });
  }

  // Prevent double-crediting if CPX retries the same postback.
  const { data: existing } = await supabaseAdmin
    .from("earnings_log")
    .select("id")
    .eq("external_id", transId)
    .maybeSingle();

  if (existing) {
    return new Response("OK (already processed)", { status: 200 });
  }

  const { error: logError } = await supabaseAdmin.from("earnings_log").insert({
    user_id: userId,
    amount,
    source: "cpx-research",
    external_id: transId,
  });
  if (logError) {
    return new Response("Failed to log earning: " + logError.message, { status: 500 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("balance, earned_today")
    .eq("id", userId)
    .single();

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      balance: (profile?.balance || 0) + amount,
      earned_today: (profile?.earned_today || 0) + amount,
    })
    .eq("id", userId);

  if (updateError) {
    return new Response("Failed to update balance: " + updateError.message, { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
