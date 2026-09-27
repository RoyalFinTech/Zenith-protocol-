-- Keep purchase-time settlement economics immutable after creation/backfill.
-- This prevents later application changes from rewriting the snapshot used by settlement.

create or replace function public.prevent_package_purchase_snapshot_mutation()
returns trigger
language plpgsql
as $snap$
begin
  if
    new.package_tier is distinct from old.package_tier
    or new.direct_percent is distinct from old.direct_percent
    or new.matrix_percent is distinct from old.matrix_percent
    or new.admin_percent is distinct from old.admin_percent
    or new.matrix_distribution_rules is distinct from old.matrix_distribution_rules
  then
    raise exception 'Package purchase settlement economics snapshot is immutable';
  end if;
  return new;
end
$snap$;

revoke all on function public.prevent_package_purchase_snapshot_mutation() from public, anon, authenticated;

drop trigger if exists trg_package_purchase_snapshot_immutable on public.package_purchases;

create trigger trg_package_purchase_snapshot_immutable
before update on public.package_purchases
for each row
execute function public.prevent_package_purchase_snapshot_mutation();
