create index if not exists idx_webauthn_challenges_user_active
  on public.webauthn_challenges(user_id, kind, expires_at)
  where used_at is null;
