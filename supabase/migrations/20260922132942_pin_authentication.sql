-- PIN authentication challenges plus WebAuthn credential/challenge persistence.
alter table public.app_users
  add column if not exists pin_hash text,
  add column if not exists pin_failed_attempts integer not null default 0,
  add column if not exists pin_locked_until timestamptz;

alter table public.pending_registrations
  add column if not exists pin_hash text;

create table if not exists public.pin_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  wallet_address text not null,
  expires_at timestamptz not null default now() + interval '5 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pin_challenges_user_active
  on public.pin_challenges(user_id, expires_at)
  where used_at is null;

alter table public.pin_challenges enable row level security;
revoke all on table public.pin_challenges from anon, authenticated;

create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  challenge text not null unique,
  kind text not null check (kind in ('registration','login')),
  expires_at timestamptz not null default now() + interval '5 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_webauthn_challenges_active
  on public.webauthn_challenges(kind, expires_at)
  where used_at is null;

alter table public.webauthn_challenges enable row level security;
revoke all on table public.webauthn_challenges from anon, authenticated;

create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  credential_id text not null unique,
  user_handle text not null,
  public_key_der text not null,
  sign_count bigint not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_webauthn_credentials_user
  on public.webauthn_credentials(user_id);

alter table public.webauthn_credentials enable row level security;
revoke all on table public.webauthn_credentials from anon, authenticated;