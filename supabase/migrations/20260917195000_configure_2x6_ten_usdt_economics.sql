-- Configure the client-supplied $10 USDT 2x6 package economics.
-- No payout is booked by this migration; settlement remains gated on verified payment.

update public.program_packages
set price = 10,
    asset = 'USDT',
    description = '2x6 matrix package with $10 USDT entry and 20/70/10 allocation.',
    active = true
where code = '2x6-starter';

create table if not exists public.package_economics (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.program_packages(id) on delete cascade,
  entry_amount numeric(20,8) not null check (entry_amount > 0),
  asset text not null default 'USDT',
  direct_percent numeric(7,4) not null check (direct_percent >= 0 and direct_percent <= 100),
  matrix_percent numeric(7,4) not null check (matrix_percent >= 0 and matrix_percent <= 100),
  admin_percent numeric(7,4) not null check (admin_percent >= 0 and admin_percent <= 100),
  matrix_levels integer not null check (matrix_levels > 0),
  matrix_capacity integer not null check (matrix_capacity > 0),
  created_at timestamptz not null default now(),
  unique (package_id),
  check (direct_percent + matrix_percent + admin_percent = 100)
);

create table if not exists public.matrix_distribution_rules (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.program_packages(id) on delete cascade,
  level integer not null check (level > 0),
  percent_of_matrix_pool numeric(7,4) not null check (percent_of_matrix_pool >= 0 and percent_of_matrix_pool <= 100),
  created_at timestamptz not null default now(),
  unique (package_id, level)
);

create table if not exists public.package_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  package_id uuid not null references public.program_packages(id) on delete restrict,
  referral_code text,
  referrer_user_id uuid references public.app_users(id) on delete set null,
  amount numeric(20,8) not null check (amount > 0),
  asset text not null default 'USDT',
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  payment_tx_hash text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (payment_tx_hash)
);

create index if not exists idx_package_purchases_user on public.package_purchases(user_id, created_at desc);
create index if not exists idx_package_purchases_status on public.package_purchases(status, created_at desc);

create table if not exists public.matrix_earnings (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.package_purchases(id) on delete restrict,
  recipient_user_id uuid not null references public.app_users(id) on delete restrict,
  source_user_id uuid not null references public.app_users(id) on delete restrict,
  level integer not null check (level > 0),
  amount numeric(20,8) not null check (amount > 0),
  asset text not null default 'USDT',
  status text not null default 'pending' check (status in ('pending','credited','reversed')),
  created_at timestamptz not null default now(),
  unique (purchase_id, recipient_user_id, level)
);

create index if not exists idx_matrix_earnings_recipient on public.matrix_earnings(recipient_user_id, created_at desc);
create index if not exists idx_matrix_earnings_purchase on public.matrix_earnings(purchase_id);

alter table public.package_economics enable row level security;
alter table public.matrix_distribution_rules enable row level security;
alter table public.package_purchases enable row level security;
alter table public.matrix_earnings enable row level security;
revoke all on table public.package_economics from anon, authenticated;
revoke all on table public.matrix_distribution_rules from anon, authenticated;
revoke all on table public.package_purchases from anon, authenticated;
revoke all on table public.matrix_earnings from anon, authenticated;

insert into public.package_economics (package_id, entry_amount, asset, direct_percent, matrix_percent, admin_percent, matrix_levels, matrix_capacity)
select pp.id, 10, 'USDT', 20, 70, 10, 6, 126
from public.program_packages pp
where pp.code = '2x6-starter'
on conflict (package_id) do update set
  entry_amount=excluded.entry_amount,
  asset=excluded.asset,
  direct_percent=excluded.direct_percent,
  matrix_percent=excluded.matrix_percent,
  admin_percent=excluded.admin_percent,
  matrix_levels=excluded.matrix_levels,
  matrix_capacity=excluded.matrix_capacity;

insert into public.matrix_distribution_rules (package_id, level, percent_of_matrix_pool)
select pp.id, x.level, x.pct
from public.program_packages pp
cross join (values
  (1,30::numeric),(2,20::numeric),(3,15::numeric),(4,10::numeric),(5,10::numeric),(6,15::numeric)
) x(level,pct)
where pp.code = '2x6-starter'
on conflict (package_id, level) do update set percent_of_matrix_pool=excluded.percent_of_matrix_pool;

create or replace function public.package_economics_quote(p_package_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'entryAmount', e.entry_amount,
    'asset', e.asset,
    'directAmount', round(e.entry_amount * e.direct_percent / 100, 8),
    'matrixAmount', round(e.entry_amount * e.matrix_percent / 100, 8),
    'adminAmount', round(e.entry_amount * e.admin_percent / 100, 8),
    'matrixLevels', e.matrix_levels,
    'matrixCapacity', e.matrix_capacity,
    'distribution', coalesce((select jsonb_agg(jsonb_build_object(
      'level', r.level,
      'percentOfMatrixPool', r.percent_of_matrix_pool,
      'amount', round((e.entry_amount * e.matrix_percent / 100) * r.percent_of_matrix_pool / 100, 8)
    ) order by r.level) from public.matrix_distribution_rules r where r.package_id=e.package_id),'[]'::jsonb)
  )
  from public.package_economics e
  where e.package_id=p_package_id;
$$;
revoke all on function public.package_economics_quote(uuid) from anon, authenticated;
