-- ZENIT package lifecycle, true matrix ancestry, platform revenue accounting, and staff admin authentication.
-- Approved package pricing:
-- 2x4: Starter 10 / Growth 25 / Elite 50 USDT
-- 2x6: Starter 30 / Growth 60 / Elite 120 USDT
-- Every confirmed package purchase uses 20% direct / 70% matrix / 10% admin.
-- One matrix position is retained per user/program; Growth and Elite upgrade that position.

alter table public.matrix_memberships
  add column if not exists package_id uuid references public.program_packages(id) on delete set null,
  add column if not exists package_tier text not null default 'starter',
  add column if not exists parent_node_id uuid references public.matrix_nodes(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.matrix_memberships
  drop constraint if exists matrix_memberships_package_tier_check;
alter table public.matrix_memberships
  add constraint matrix_memberships_package_tier_check check (package_tier in ('starter','growth','elite'));

create index if not exists idx_matrix_memberships_program_tier
  on public.matrix_memberships(program_id, package_tier);
create index if not exists idx_matrix_memberships_parent_node
  on public.matrix_memberships(parent_node_id);

alter table public.package_purchases
  add column if not exists direct_amount numeric(20,8),
  add column if not exists matrix_amount numeric(20,8),
  add column if not exists admin_amount numeric(20,8),
  add column if not exists unallocated_matrix_amount numeric(20,8) not null default 0,
  add column if not exists unallocated_direct_amount numeric(20,8) not null default 0;

create table if not exists public.platform_revenue_ledger (
  id uuid primary key default gen_random_uuid(),
  package_purchase_id uuid not null references public.package_purchases(id) on delete restrict,
  kind text not null check (kind in ('admin_revenue','unallocated_matrix','unallocated_direct')),
  amount numeric(20,8) not null check (amount > 0),
  asset text not null default 'USDT',
  status text not null default 'accrued' check (status in ('accrued','reversed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(package_purchase_id, kind)
);

create index if not exists idx_platform_revenue_kind_time
  on public.platform_revenue_ledger(kind, created_at desc);
create index if not exists idx_platform_revenue_purchase
  on public.platform_revenue_ledger(package_purchase_id);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_sessions (
  id uuid primary key,
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_sessions_active
  on public.admin_sessions(admin_user_id, expires_at)
  where revoked_at is null;

do $$
declare t text;
begin
  foreach t in array array['admin_users','admin_sessions','platform_revenue_ledger'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Reconcile the approved package catalog.
update public.program_packages set price=10, asset='USDT', active=true,
  description='Starter entry for the ZENIT 2×4 matrix. Activates one position.'
where code='2x4-starter';
update public.program_packages set price=25, asset='USDT', active=true,
  description='Growth upgrade for an existing ZENIT 2×4 Starter position.'
where code='2x4-growth';
update public.program_packages set price=50, asset='USDT', active=true,
  description='Elite upgrade for an existing ZENIT 2×4 Growth position.'
where code='2x4-elite';

update public.program_packages set price=30, asset='USDT', active=true,
  description='Starter entry for the ZENIT 2×6 matrix. Activates one position.'
where code='2x6-starter';
update public.program_packages set price=60, asset='USDT', active=true,
  description='Growth upgrade for an existing ZENIT 2×6 Starter position.'
where code='2x6-growth';
update public.program_packages set price=120, asset='USDT', active=true,
  description='Elite upgrade for an existing ZENIT 2×6 Growth position.'
where code='2x6-elite';

-- Rebuild economics for the six approved packages.
insert into public.package_economics
(package_id, entry_amount, asset, direct_percent, matrix_percent, admin_percent, matrix_levels, matrix_capacity)
select pp.id, x.price, 'USDT', 20, 70, 10, p.levels, p.capacity
from public.program_packages pp
join public.programs p on p.id=pp.program_id
join (values
  ('2x4-starter',10::numeric),('2x4-growth',25::numeric),('2x4-elite',50::numeric),
  ('2x6-starter',30::numeric),('2x6-growth',60::numeric),('2x6-elite',120::numeric)
) x(code,price) on x.code=pp.code
on conflict (package_id) do update set
  entry_amount=excluded.entry_amount,
  asset=excluded.asset,
  direct_percent=excluded.direct_percent,
  matrix_percent=excluded.matrix_percent,
  admin_percent=excluded.admin_percent,
  matrix_levels=excluded.matrix_levels,
  matrix_capacity=excluded.matrix_capacity;

-- Approved 2×4 four-level distribution: 30 / 25 / 25 / 20.
-- Approved 2×6 six-level distribution: 30 / 20 / 15 / 10 / 10 / 15.
delete from public.matrix_distribution_rules
where package_id in (
  select id from public.program_packages
  where code in ('2x4-starter','2x4-growth','2x4-elite','2x6-starter','2x6-growth','2x6-elite')
);

insert into public.matrix_distribution_rules(package_id,level,percent_of_matrix_pool)
select pp.id,r.level,r.pct
from public.program_packages pp
join (values
  ('2x4',1,30::numeric),('2x4',2,25::numeric),('2x4',3,25::numeric),('2x4',4,20::numeric),
  ('2x6',1,30::numeric),('2x6',2,20::numeric),('2x6',3,15::numeric),('2x6',4,10::numeric),('2x6',5,10::numeric),('2x6',6,15::numeric)
) r(program_code,level,pct) on r.program_code=split_part(pp.code,'-',1)
where pp.code in ('2x4-starter','2x4-growth','2x4-elite','2x6-starter','2x6-growth','2x6-elite');

-- Backfill legacy memberships, if any, to Starter tier.
update public.matrix_memberships m
set package_tier='starter',
    package_id=coalesce(m.package_id, (
      select pp.id from public.program_packages pp
      where pp.program_id=m.program_id and pp.tier='starter'
      order by pp.sort_order
      limit 1
    ))
where m.package_tier is null or m.package_tier='';

-- Helpful cleanup/indexing for admin and settlement paths.
create index if not exists idx_package_purchases_program_status
  on public.package_purchases(package_id, status, created_at desc);
create index if not exists idx_ledger_package_reference
  on public.ledger_transactions(reference);

-- The Data API stays disabled; the Node backend uses the database role directly.
