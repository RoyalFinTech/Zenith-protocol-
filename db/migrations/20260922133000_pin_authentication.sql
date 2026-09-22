create extension if not exists pgcrypto;

alter table public.app_users add column if not exists pin_hash text;
alter table public.app_users add column if not exists pin_failed_attempts integer not null default 0;
alter table public.app_users add column if not exists pin_locked_until timestamptz;

alter table public.pending_registrations add column if not exists pin_hash text;

create table if not exists public.pin_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  wallet_address text not null,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pin_challenges_user_active
  on public.pin_challenges(user_id, expires_at)
  where used_at is null;

alter table public.pin_challenges enable row level security;
revoke all on table public.pin_challenges from anon, authenticated;
