-- Supabase target migration: run after creating the project.
-- This variant keeps auth.users as the identity source while storing Zenit-specific profile data in public.app_profiles.
create extension if not exists pgcrypto;

create table if not exists public.app_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Zenit Member',
  role text not null default 'Member' check (role in ('Member','Admin','Support')),
  referral_code text not null unique,
  avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check(theme in ('dark','light','system')),
  compact_density boolean not null default true, activity_notifications boolean not null default true,
  reduced_motion boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  address text not null, chain_id bigint not null, label text, is_primary boolean not null default false,
  verified_at timestamptz, created_at timestamptz not null default now(), unique(user_id,address,chain_id)
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid references auth.users(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.app_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.app_profiles, public.user_preferences, public.wallet_accounts, public.audit_logs from anon;
grant select,insert,update on public.app_profiles, public.user_preferences, public.wallet_accounts to authenticated;

drop policy if exists "profile_self" on public.app_profiles;
create policy "profile_self" on public.app_profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "preferences_self" on public.user_preferences;
create policy "preferences_self" on public.user_preferences for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "wallets_self" on public.wallet_accounts;
create policy "wallets_self" on public.wallet_accounts for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.app_profiles(user_id,display_name,referral_code) values(new.id, coalesce(new.raw_user_meta_data->>'name','Zenit Member'), upper(substr(encode(gen_random_bytes(8),'hex'),1,12))) on conflict(user_id) do nothing;
  insert into public.user_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
