-- Harden the package purchase snapshot trigger against search_path manipulation.
-- The trigger function does not need caller-controlled object resolution.

create or replace function public.prevent_package_purchase_snapshot_mutation()
returns trigger
language plpgsql
set search_path = ''
as $snap$
begin
  if
    new.user_id is distinct from old.user_id
    or new.package_id is distinct from old.package_id
    or new.amount is distinct from old.amount
    or new.asset is distinct from old.asset
    or new.package_tier is distinct from old.package_tier
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
