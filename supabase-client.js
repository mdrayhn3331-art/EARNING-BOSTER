/* ============================================================
   Supabase client + auth/balance helpers for Earning Booster
   ------------------------------------------------------------
   1. Fill in SUPABASE_URL and SUPABASE_ANON_KEY below.
      Find them in: Supabase Dashboard → Settings → API.
   2. That's the ONLY file you need to edit to go live.
   ============================================================ */

const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- Auth ---------- */

async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  return { data, error };
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signOut() {
  await supabaseClient.auth.signOut();
}

async function getCurrentUser() {
  const { data } = await supabaseClient.auth.getUser();
  return data?.user || null;
}

/* ---------- Balance / profile ---------- */

async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("balance, earned_today, email")
    .eq("id", userId)
    .single();
  return { data, error };
}

// Call this whenever a user completes a task, to add real money to their balance.
async function addEarning(userId, amount, source) {
  // 1. log it
  await supabaseClient.from("earnings_log").insert({ user_id: userId, amount, source });

  // 2. bump the running totals
  const { data: profile } = await getProfile(userId);
  const newBalance = (profile?.balance || 0) + amount;
  const newToday = (profile?.earned_today || 0) + amount;

  const { error } = await supabaseClient
    .from("profiles")
    .update({ balance: newBalance, earned_today: newToday })
    .eq("id", userId);

  return { newBalance, newToday, error };
}

/* ---------- Route guard ----------
   Drop this at the top of home.html's script to bounce
   signed-out visitors back to the login page. */
async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}
