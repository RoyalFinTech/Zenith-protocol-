-- Replace the post-email-verification wallet handoff identifier with a short-lived, one-time secret.
alter table public.pending_registrations
  add column if not exists wallet_handoff_token_hash text unique,
  add column if not exists wallet_handoff_expires_at timestamptz;

create index if not exists idx_pending_registrations_wallet_handoff
  on public.pending_registrations(wallet_handoff_token_hash, wallet_handoff_expires_at)
  where wallet_handoff_token_hash is not null and consumed_at is null;
