-- Registered WhatsApp identity, update preference, and one-time PIN recovery challenges.
alter table public.app_users
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_updates_enabled boolean not null default false;

alter table public.pending_registrations
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_updates_enabled boolean not null default false;

create unique index if not exists idx_app_users_whatsapp_number
  on public.app_users(whatsapp_number)
  where whatsapp_number is not null;

create table if not exists public.pin_reset_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  whatsapp_number text not null,
  otp_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pin_reset_challenges_active
  on public.pin_reset_challenges(whatsapp_number, created_at desc)
  where consumed_at is null;

create index if not exists idx_pin_reset_challenges_user_active
  on public.pin_reset_challenges(user_id, created_at desc)
  where consumed_at is null;

alter table public.pin_reset_challenges enable row level security;
revoke all on table public.pin_reset_challenges from anon, authenticated;
