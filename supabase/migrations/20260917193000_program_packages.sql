-- Add a simple three-package catalog to each existing ZENIT program.
-- Pricing is intentionally nullable until the client supplies the approved amounts.
create table if not exists public.program_packages (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  code text not null,
  name text not null,
  tier text not null check (tier in ('starter','growth','elite')),
  description text,
  price numeric(20,8) check (price is null or price >= 0),
  asset text not null default 'USDT',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (program_id, code)
);

create index if not exists idx_program_packages_program
  on public.program_packages(program_id, sort_order);

alter table public.program_packages enable row level security;
revoke all on table public.program_packages from anon, authenticated;

insert into public.program_packages (program_id, code, name, tier, description, sort_order)
select p.id, x.code, x.name, x.tier, x.description, x.sort_order
from public.programs p
cross join (
  values
    ('starter', 'Starter', 'Entry package for the program.', 1),
    ('growth', 'Growth', 'Intermediate package for the program.', 2),
    ('elite', 'Elite', 'Highest package for the program.', 3)
) as x(tier, name, description, sort_order)
where p.code in ('2x4', '2x6')
on conflict (program_id, code) do nothing;
