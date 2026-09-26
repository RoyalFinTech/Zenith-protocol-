-- Matches the production-applied migration recorded as
-- 20260926145451_withdrawal_payout_idempotency.
create unique index if not exists uq_withdrawal_requests_tx_hash
  on public.withdrawal_requests(tx_hash)
  where tx_hash is not null;
