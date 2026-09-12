# Earning Booster — Go-Live Setup

This turns the site from a static mockup into a real login + real balance
system, using Supabase (free tier, no credit card needed).

## Step 1 — Create a Supabase project
1. Go to https://supabase.com → sign up → "New project"
2. Wait ~2 minutes for it to spin up.

## Step 2 — Create the database tables
1. In your Supabase project, open **SQL Editor** → **New query**
2. Open `supabase-setup.sql` (in this folder), copy all of it, paste it in, click **Run**
   - This creates a `profiles` table (id, email, balance, earned_today)
   - It also creates an `earnings_log` table for a history of payouts
   - A trigger auto-creates a $0 balance profile for every new sign-up

## Step 3 — Get your API keys
1. In Supabase: **Settings → API**
2. Copy the **Project URL** and the **anon public key**

## Step 4 — Paste your keys into the code
Open `supabase-client.js` and replace these two lines near the top:

```js
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
```

That's the only file you need to edit. Save it.

## Step 5 — Test it
1. Open `index.html` in a browser (or host the folder anywhere — Netlify,
   Vercel, GitHub Pages all work since this is plain HTML/JS)
2. Click "Create a free account", sign up with an email + password
3. By default Supabase requires email confirmation — check your inbox,
   click the confirm link, then come back and sign in
4. You'll land on `home.html` with a real $0.00 balance pulled from the
   database
5. Click "Complete a task (+$0.25)" — this writes a row to `earnings_log`
   and updates your real balance in Supabase. Refresh the page — the
   balance persists, because it's real data now, not a random animation.

## What's still needed before this can pay real users
- **A payout method.** PayPal Payouts API, Payoneer, or local mobile
  banking (bKash/Nagad) to actually send money out when a user cashes out.
- **Legal/compliance check.** Handling other people's money for payouts
  often falls under money-services regulation — check the rules for
  wherever you're operating before taking this live.
- **Turn off email confirmation requirement** (optional) in Supabase →
  Authentication → Providers → Email, if you want instant sign-up without
  the confirmation email step.

## Step 6 — Connect a real task source (CPX Research)

The homepage now has a live task widget and a server-side postback handler.
Demo-only earning buttons are gone from the real flow — this wires actual
surveys in.

1. **Sign up as a publisher** at https://www.cpx-research.com and create
   an "App" in your dashboard. Copy its **App ID**.
2. **Open `home.html`**, find this block near the bottom, and paste your
   App ID:
   ```js
   const CPX_APP_ID = "PASTE_YOUR_CPX_APP_ID_HERE";
   ```
   The offer list will then load automatically inside the "Available
   tasks" section, matched to each signed-in user (their Supabase user id
   is passed as `ext_user_id`).
3. **Deploy the postback handler** so CPX can credit balances on your
   server, not the browser (this is what stops people from faking
   "task completed" themselves):
   ```
   supabase functions deploy cpx-postback
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   The service role key is in Supabase → Settings → API — keep it secret,
   never put it in `supabase-client.js` or any browser-facing file.
4. **Copy the deployed function's URL** (Supabase prints it after deploy,
   looks like `https://<project-ref>.functions.supabase.co/cpx-postback`)
   and paste it into CPX Research → your App → **Postback** tab.
5. **Check CPX's postback parameter names against the code.** CPX
   documents its macros per account — open `supabase/functions/cpx-postback/index.ts`
   and confirm the parameter names (`status`, `trans_id`, `user_id`,
   `amount_local`) match what's shown in your CPX dashboard's postback
   tab, adjusting the code if they differ. If your account has
   "Secure Hash" postback signing enabled, get the exact hashing formula
   from your CPX account manager and update the `verifyHash()` function —
   the one included is a reasonable placeholder, not a confirmed formula.
6. Test end to end: sign in, complete a real (or CPX sandbox) survey,
   and confirm your balance updates within a few seconds — the page
   polls for a fresh balance automatically.

## Files in this project
- `index.html` — login / sign-up page (now wired to real Supabase auth)
- `home.html` — dashboard with real balance + live CPX Research task widget
- `style.css` — shared visual design, including the 3D button effect
- `backdrop.js` — the animated canvas background
- `supabase-client.js` — **edit this one** with your project keys
- `supabase-setup.sql` — run this once in Supabase's SQL editor
- `supabase/functions/cpx-postback/index.ts` — server-side handler that
  credits real balances when CPX Research confirms a completed task
