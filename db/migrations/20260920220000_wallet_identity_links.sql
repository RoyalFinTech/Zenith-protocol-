create unique index if not exists idx_wallet_accounts_address_chain_unique
  on wallet_accounts(lower(address), chain_id);
