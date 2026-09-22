-- Production QA hardening: remove duplicate ledger index and add covering indexes
-- for foreign keys used by authenticated dashboard, matrix, package and wallet queries.

create unique index if not exists idx_wallet_accounts_address_chain_unique
  on public.wallet_accounts(lower(address), chain_id);

create index if not exists idx_audit_logs_actor_user_id
  on public.audit_logs(actor_user_id);

create index if not exists idx_matrix_earnings_source_user_id
  on public.matrix_earnings(source_user_id);

create index if not exists idx_matrix_memberships_node_id
  on public.matrix_memberships(node_id);

create index if not exists idx_matrix_memberships_user_id
  on public.matrix_memberships(user_id);

create index if not exists idx_matrix_nodes_referrer_user_id
  on public.matrix_nodes(referrer_user_id);

create index if not exists idx_matrix_nodes_user_id
  on public.matrix_nodes(user_id);

create index if not exists idx_package_purchases_package_id
  on public.package_purchases(package_id);

create index if not exists idx_package_purchases_referrer_user_id
  on public.package_purchases(referrer_user_id);

create index if not exists idx_withdrawal_requests_user_id
  on public.withdrawal_requests(user_id);

drop index if exists public.idx_ledger_user_time;
