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
- **A real task source.** The "+$0.25" button is a stand-in. To pay people
  for real, integrate an offerwall/affiliate network such as CPX Research,
  AdGate Media, or OfferToro — they send a "task completed" callback to
  your server, which then calls the same `addEarning()` function.
- **A payout method.** PayPal Payouts API, Payoneer, or local mobile
  banking (bKash/Nagad) to actually send money out when a user cashes out.
- **Legal/compliance check.** Handling other people's money for payouts
  often falls under money-services regulation — check the rules for
  wherever you're operating before taking this live.
- **Turn off email confirmation requirement** (optional) in Supabase →
  Authentication → Providers → Email, if you want instant sign-up without
  the confirmation email step.

## Files in this project
- `index.html` — login / sign-up page (now wired to real Supabase auth)
- `home.html` — dashboard with real balance pulled from the database
- `style.css` — shared visual design, including the 3D button effect
- `backdrop.js` — the animated canvas background
- `supabase-client.js` — **edit this one** with your project keys
- `supabase-setup.sql` — run this once in Supabase's SQL editor
