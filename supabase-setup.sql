-- ============================================================
-- Earning Booster — Supabase setup
-- Run this once in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Table that stores each user's public profile + balance
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  balance numeric(10,2) not null default 0,
  earned_today numeric(10,2) not null default 0,
  created_at timestamp with time zone default now()
);

-- 2. Row Level Security: users can only read/update their OWN row
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- 3. Auto-create a profile row (balance = 0) whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, balance, earned_today)
  values (new.id, new.email, 0, 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Optional: a table to log each completed task/payout,
-- so "earned_today" isn't just a manually edited number.
-- ============================================================
create table if not exists public.earnings_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  amount numeric(10,2) not null,
  source text,
  external_id text unique, -- the offerwall network's transaction id; stops double-crediting on retried postbacks
  created_at timestamp with time zone default now()
);

alter table public.earnings_log enable row level security;

create policy "Users can view own earnings"
  on public.earnings_log for select
  using ( auth.uid() = user_id );

create policy "Users can insert own earnings"
  on public.earnings_log for insert
  with check ( auth.uid() = user_id );
