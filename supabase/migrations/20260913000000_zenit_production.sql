create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  display_name text not null,
  role text not null default 'Member' check (role in ('Member','Admin')),
  referral_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  theme text not null default 'dark',
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_nonces (
  id uuid primary key default gen_random_uuid(), nonce text not null unique, address text not null,
  message text not null, issued_at timestamptz not null, expires_at timestamptz not null, used_at timestamptz
);

create table if not exists public.user_sessions (
  id uuid primary key, user_id uuid not null references public.app_users(id) on delete cascade,
  wallet_address text not null, expires_at timestamptz not null, revoked_at timestamptz,
  ip_address inet, user_agent text, created_at timestamptz not null default now()
);

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete cascade,
  address text not null, chain_id bigint not null, label text, is_primary boolean not null default false,
  verified_at timestamptz, created_at timestamptz not null default now(), unique(user_id,address,chain_id)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  levels integer not null check(levels>0), capacity integer not null check(capacity>0),
  description text, active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matrix_nodes (
  id uuid primary key default gen_random_uuid(), program_id uuid not null references public.programs(id) on delete cascade,
  level integer not null, position integer not null,
  status text not null default 'available' check(status in ('available','pending','active','completed')),
  user_id uuid references public.app_users(id) on delete set null,
  referrer_user_id uuid references public.app_users(id) on delete set null,
  activated_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(),
  unique(program_id,position)
);

create table if not exists public.matrix_memberships (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade, node_id uuid references public.matrix_nodes(id) on delete set null,
  referrer_user_id uuid references public.app_users(id) on delete set null, level integer not null, position integer not null,
  status text not null default 'active', created_at timestamptz not null default now(), unique(program_id,user_id), unique(program_id,position)
);

create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete cascade,
  occurred_at timestamptz not null default now(), type text not null check(type in ('earned','withdrawal','deposit','fee','adjustment')),
  program_code text, amount numeric(20,8) not null, asset text not null default 'USDT',
  status text not null default 'pending' check(status in ('pending','completed','failed','cancelled')),
  reference text not null unique, tx_hash text, description text, metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete cascade,
  amount numeric(20,8) not null check(amount>0), asset text not null, destination_address text not null,
  status text not null default 'pending' check(status in ('pending','approved','processing','completed','rejected','failed')),
  tx_hash text, rejection_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null, message text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete cascade,
  icon text not null, title text not null, description text not null, status text not null, occurred_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid references public.app_users(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

insert into public.programs(code,name,levels,capacity,description,sort_order) values
('2x4','ZENIT 2×4',4,30,'A compact binary matrix.',1),
('2x6','ZENIT 2×6',6,126,'An extended binary matrix.',2)
on conflict(code) do nothing;

insert into public.matrix_nodes(program_id,level,position,status)
select p.id, case when g=1 then 1 else floor(log(2,g))::int+1 end, g, 'available'
from public.programs p cross join generate_series(1,30) g where p.code='2x4'
on conflict(program_id,position) do nothing;
insert into public.matrix_nodes(program_id,level,position,status)
select p.id, case when g=1 then 1 else floor(log(2,g))::int+1 end, g, 'available'
from public.programs p cross join generate_series(1,126) g where p.code='2x6'
on conflict(program_id,position) do nothing;

create index if not exists idx_auth_nonces_address_expires on public.auth_nonces(address,expires_at);
create index if not exists idx_sessions_user_active on public.user_sessions(user_id,expires_at) where revoked_at is null;
create index if not exists idx_matrix_nodes_program on public.matrix_nodes(program_id,level,position);
create index if not exists idx_ledger_user_time on public.ledger_transactions(user_id,occurred_at desc);
create index if not exists idx_activity_user_time on public.activity_events(user_id,occurred_at desc);
create index if not exists idx_notifications_user_time on public.notifications(user_id,created_at desc);
create index if not exists idx_audit_time on public.audit_logs(created_at desc);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['app_users','user_preferences','auth_nonces','user_sessions','wallet_accounts','programs','matrix_nodes','matrix_memberships','ledger_transactions','withdrawal_requests','notifications','activity_events','audit_logs'] LOOP
    EXECUTE format('alter table public.%I enable row level security', t);
    EXECUTE format('revoke all on table public.%I from anon, authenticated', t);
  END LOOP;
END $$;
