-- Matches the production-applied migration recorded as
-- 20260926145028_package_payment_settlement_hardening_constraints.
create unique index if not exists uq_package_purchases_payment_tx_hash
  on public.package_purchases(payment_tx_hash)
  where payment_tx_hash is not null;

create unique index if not exists uq_package_purchases_one_pending_per_user_package
  on public.package_purchases(user_id, package_id)
  where status = 'pending';
