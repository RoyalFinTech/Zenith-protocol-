create extension if not exists pgcrypto;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, levels integer not null check(levels>0),
  capacity integer not null check(capacity>0), description text, active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.matrix_nodes (
  id uuid primary key default gen_random_uuid(), program_id uuid not null references public.programs(id) on delete cascade,
  level integer not null, position integer not null, status text not null default 'available' check(status in ('available','pending','active','completed')),
  user_id uuid references auth.users(id) on delete set null, referrer_user_id uuid references auth.users(id) on delete set null,
  activated_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), unique(program_id,position)
);
create table if not exists public.matrix_memberships (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade, node_id uuid references public.matrix_nodes(id) on delete set null,
  referrer_user_id uuid references auth.users(id) on delete set null, level integer not null, position integer not null,
  status text not null default 'active', created_at timestamptz not null default now(), unique(program_id,user_id), unique(program_id,position)
);
create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(), type text not null check(type in ('earned','withdrawal','deposit','fee','adjustment')),
  program_code text, amount numeric(20,8) not null, asset text not null default 'USDT', status text not null default 'pending' check(status in ('pending','completed','failed','cancelled')),
  reference text not null unique, tx_hash text, description text, metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(20,8) not null check(amount>0), asset text not null, destination_address text not null,
  status text not null default 'pending' check(status in ('pending','approved','processing','completed','rejected','failed')),
  tx_hash text, rejection_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, message text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  icon text not null, title text not null, description text not null, status text not null, occurred_at timestamptz not null default now()
);

insert into public.programs(code,name,levels,capacity,description,sort_order) values
('2x4','ZENIT 2×4',4,30,'A compact binary matrix for exploring the core placement architecture.',1),
('2x6','ZENIT 2×6',6,126,'An extended binary matrix with six visible structural levels.',2)
on conflict(code) do nothing;

alter table public.programs enable row level security;
alter table public.matrix_nodes enable row level security;
alter table public.matrix_memberships enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_events enable row level security;
revoke all on public.programs,public.matrix_nodes,public.matrix_memberships,public.ledger_transactions,public.withdrawal_requests,public.notifications,public.activity_events from anon;
grant select on public.programs to authenticated;
grant select on public.matrix_nodes to authenticated;
grant select on public.matrix_memberships to authenticated;
grant select on public.ledger_transactions to authenticated;
grant select,insert on public.withdrawal_requests to authenticated;
grant select,update on public.notifications to authenticated;
grant select on public.activity_events to authenticated;

create policy "programs_authenticated_read" on public.programs for select to authenticated using (true);
create policy "nodes_authenticated_read" on public.matrix_nodes for select to authenticated using (true);
create policy "memberships_self_or_referrer" on public.matrix_memberships for select to authenticated using ((select auth.uid())=user_id or (select auth.uid())=referrer_user_id);
create policy "ledger_self_read" on public.ledger_transactions for select to authenticated using ((select auth.uid())=user_id);
create policy "withdrawals_self" on public.withdrawal_requests for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "notifications_self" on public.notifications for select to authenticated using ((select auth.uid())=user_id);
create policy "notifications_self_update" on public.notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "activity_self" on public.activity_events for select to authenticated using ((select auth.uid())=user_id);
