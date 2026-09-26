-- Preserve production settlement idempotency constraints in source control.
-- Both indexes are intentionally partial so null transaction hashes remain allowed.

create unique index if not exists uq_package_purchases_payment_tx_hash
  on public.package_purchases(payment_tx_hash)
  where payment_tx_hash is not null;

create unique index if not exists uq_package_purchases_one_pending_per_user_package
  on public.package_purchases(user_id, package_id)
  where status = 'pending';

create unique index if not exists uq_withdrawal_requests_tx_hash
  on public.withdrawal_requests(tx_hash)
  where tx_hash is not null;
