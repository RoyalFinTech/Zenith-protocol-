-- Freeze package settlement economics at purchase creation time.
-- Existing purchases are backfilled from the currently configured package economics.
-- New purchases must carry their own percentage and matrix-distribution snapshot.

alter table public.package_purchases
  add column if not exists package_tier text,
  add column if not exists direct_percent numeric(7,4),
  add column if not exists matrix_percent numeric(7,4),
  add column if not exists admin_percent numeric(7,4),
  add column if not exists matrix_distribution_rules jsonb;

update public.package_purchases pp
set package_tier=(select ppk.tier from public.program_packages ppk where ppk.id=pp.package_id),
    direct_percent=e.direct_percent,
    matrix_percent=e.matrix_percent,
    admin_percent=e.admin_percent,
    matrix_distribution_rules=coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'level',r.level,
          'percentOfMatrixPool',r.percent_of_matrix_pool
        )
        order by r.level
      )
      from public.matrix_distribution_rules r
      where r.package_id=pp.package_id
    ),'[]'::jsonb)
from public.package_economics e
where e.package_id=pp.package_id
  and (
    pp.direct_percent is null
    or pp.matrix_percent is null
    or pp.admin_percent is null
    or pp.matrix_distribution_rules is null
  );

alter table public.package_purchases
  drop constraint if exists package_purchases_snapshot_tier_check;

alter table public.package_purchases
  add constraint package_purchases_snapshot_tier_check
  check (package_tier is null or package_tier in ('starter','growth','elite'));

alter table public.package_purchases
  drop constraint if exists package_purchases_snapshot_percentages_check;

alter table public.package_purchases
  add constraint package_purchases_snapshot_percentages_check
  check (
    (direct_percent is null and matrix_percent is null and admin_percent is null)
    or (
      package_tier is not null
      and direct_percent >= 0 and direct_percent <= 100
      and matrix_percent >= 0 and matrix_percent <= 100
      and admin_percent >= 0 and admin_percent <= 100
      and direct_percent + matrix_percent + admin_percent = 100
    )
  );

alter table public.package_purchases
  drop constraint if exists package_purchases_snapshot_distribution_check;

alter table public.package_purchases
  add constraint package_purchases_snapshot_distribution_check
  check (
    matrix_distribution_rules is null
    or jsonb_typeof(matrix_distribution_rules) = 'array'
  );

create index if not exists idx_package_purchases_economics_snapshot
  on public.package_purchases(package_id,status)
  where direct_percent is not null;
