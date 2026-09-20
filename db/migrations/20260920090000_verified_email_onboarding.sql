create extension if not exists pgcrypto;

create table if not exists pending_registrations (
  id uuid primary key,
  username text not null,
  email text not null,
  display_name text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pending_registrations_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create index if not exists idx_pending_registrations_lookup
  on pending_registrations(lower(username), lower(email), expires_at);

create unique index if not exists idx_app_users_email_lower_unique
  on app_users(lower(email)) where email is not null;

create unique index if not exists idx_app_users_display_name_lower_unique
  on public.app_users(lower(display_name))
  where display_name is not null and trim(display_name) <> '';

