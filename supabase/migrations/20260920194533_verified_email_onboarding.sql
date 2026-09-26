-- Store verified email onboarding state before wallet authentication consumes it.
create table if not exists public.pending_registrations (
  id uuid primary key,
  username text not null,
  email text not null,
  display_name text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pending_registrations
  drop constraint if exists pending_registrations_username_format;
alter table public.pending_registrations
  add constraint pending_registrations_username_format check (username ~ '^[a-z0-9_]{3,24}$');

create index if not exists idx_pending_registrations_lookup
  on public.pending_registrations(lower(username), lower(email), expires_at);

alter table public.pending_registrations enable row level security;
revoke all on table public.pending_registrations from anon, authenticated;