-- Production package-payment settlement hardening.
alter table public.package_purchases
  add column if not exists settlement_block_number bigint,
  add column if not exists settlement_confirmations integer,
  add column if not exists settlement_error text;

create index if not exists idx_package_purchases_user_status
  on public.package_purchases(user_id,status,created_at desc);
create index if not exists idx_package_purchases_tx_hash
  on public.package_purchases(payment_tx_hash);
create index if not exists idx_matrix_earnings_recipient_status
  on public.matrix_earnings(recipient_user_id,status,created_at desc);
create index if not exists idx_ledger_transactions_user_occurred
  on public.ledger_transactions(user_id,occurred_at desc);
