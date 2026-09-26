# Zenith Protocol — Engineering Progress

Last updated: 2026-09-26 (continued)
Branch: `security/atomic-auth-withdrawal`

## Completed

### Authentication / session integrity
- WebAuthn registration is now insert-only for credential IDs, preventing an existing credential from being overwritten.
- WebAuthn registration challenges are atomically claimed before credential creation.
- WebAuthn registration challenge consumption and credential insertion now commit or roll back together.
- Wallet nonce verification and session issuance hardened with transactional row locking.
- PIN challenge consumption made atomic.
- PIN setup moved into a transaction with challenge row locking and rollback handling.
- WebAuthn login challenge consumption made atomic.
- WebAuthn credential sign-count update guarded against replay/non-monotonic counters.
- JWT middleware validates the backing session and revocation/expiry state.

### Package purchase / settlement
- Capacity preflight now applies only to creation of a new purchase intent; existing pending purchases can still be completed if capacity changed afterward.
- Added package-creation capacity preflight so users are blocked when no matrix position remains.
- Authenticated purchase creation and settlement flow reviewed.
- Exact USDT transfer verification added: sender, receiver, token contract, amount, chain, receipt success, and confirmation count.
- Settlement runs atomically with purchase row locking and matrix-node locking.
- Membership creation protected by database uniqueness constraints.
- Deposit ledger references are idempotent.
- Direct and matrix earnings use PostgreSQL numeric arithmetic rather than JavaScript Number.
- Package settlement validation errors are persisted in `package_purchases.settlement_error` while keeping retryable purchases pending.
- Package payment transaction hash is uniquely protected.
- Only one pending purchase per user/package is uniquely protected.
- Concurrent duplicate-purchase and duplicate-payment races return controlled 409 responses.
- Package status API and frontend status card implemented with polling and settlement-error display.
- Package/withdrawal status cards were visually stacked to avoid overlap.

### Withdrawals / ledger reservations
- Withdrawal creation validates positive decimal amounts and EVM destination addresses.
- User row is locked during balance check and reservation creation.
- Available balance calculation includes pending/completed withdrawal reservations.
- A pending withdrawal ledger reservation is created atomically with the withdrawal request.
- Admin withdrawal transitions are controlled by explicit state rules.
- Rejection/failure requires a reason and releases/fails the pending reservation.
- Withdrawal payout transaction hash uniqueness is protected.
- Added an admin completion endpoint that verifies the payout on BNB Smart Chain before marking the withdrawal completed.
- Payout completion requires configured treasury sender, correct chain/token, successful receipt, confirmations, exact destination, and exact token-unit amount.
- Completion requires the corresponding pending reservation ledger entry and finalizes that entry atomically.
- Duplicate payout transaction races return controlled 409 responses.

### Regression coverage
- Added shared financial transition/unique-constraint helpers.
- Added Vitest coverage for withdrawal state transitions and PostgreSQL unique-constraint classification.
- Admin withdrawal transitions now consume the shared state-machine invariant.

### Source-control / deployment integrity
- Settlement idempotency constraints are now represented in a source-controlled Supabase migration:
  `supabase/migrations/20260926163000_settlement_idempotency_constraints.sql`
- Latest verified CI run for commit `51be4a908c82afdfa7a10ab8d857f6ba08aa0d94`: Zenit CI run #226 — success.

## Current production observations

- `package_purchases`: 2 rows, both currently `pending`.
- Duplicate pending user/package groups: 0.
- `withdrawal_requests`: no rows currently returned by the status-count check.
- Settlement-error count previously verified: 0.
- Confirmed purchases with settlement errors previously verified: 0.

These production counts are observations only; no records were changed as part of this log update.

### Testability
- Added direct regression coverage for the admin-role authorization boundary.
- Made \`createApp()\` available without automatically opening a listener on module import, enabling real endpoint integration tests.

- Continue backend financial-integrity review for remaining ledger invariants and edge cases.
- CI verification for the latest capacity-preflight/admin-test/WebAuthn hardening changes is pending.
- Review admin/audit behavior around payout reconciliation and operational visibility.
- Reconcile repository migration history/name drift with Supabase's applied migration history before any production migration cleanup.
- Verify the newest commits with CI before treating each change as fully validated.

## Pending / intentionally not implemented

### Treasury signing / automatic payouts
- No private key is stored or used by the backend.
- No automatic payout signer/worker has been introduced.
- Actual treasury payout execution remains an operational step outside this API.
- The secure completion endpoint only verifies an already-broadcast payout transaction.

### Production deployment
- Security branch is not being deployed to the Render `main` service automatically.
- Changes are being accumulated on `security/atomic-auth-withdrawal` until explicitly merged/deployed.

### Render configuration
- Render service configuration and repository `render.yaml` still need reconciliation for any drift, including health-check settings.
- No unsupported claim is made that the live Render health-check configuration is already fixed.

### Test coverage
- Initial focused regression coverage is now implemented.
- CI exposed and the constraint-classifier test fixture mismatch was corrected; latest fix is awaiting CI.
- Still pending: endpoint-level integration tests around real database transactions and on-chain payout verification.

## Recent commits

- `496e7e3` — Persist package settlement validation errors
- `ec645c5` — Show package settlement errors in frontend
- `7a0644c` — Fix package settlement error scope
- `a87b96f` — Stack package and withdrawal status cards
- `244ce5b` — Handle duplicate package payment race cleanly
- `eb095c3` — Add explicit payout sender configuration
- `1dd63a7` — Verify withdrawals on-chain before completion
- `3384c3c` — Use token units for payout verification
- `0a92b0f` — Handle duplicate payout transaction races
- `e573946` — Track settlement idempotency constraints in migrations
- `449d305` — Handle concurrent package purchase creation
- `51be4a9` — Require withdrawal reservation before completion
- `70c76b8` — Add financial transition invariants
- `93aaa3b` — Add financial state regression tests
- `a995e92` — Use shared financial invariants in admin routes
- `bfb3e01` — Fix PostgreSQL constraint classification on security branch
- `74ab6d9` — Preflight package matrix capacity
- `348e47d` — Make server app import-safe for integration tests
- `c14b13b` — Add admin authorization regression tests
- `39f19d7` — Allow existing pending purchases through capacity checks
- `54b6d3d` — Harden WebAuthn credential registration
- `91acb27` — Make WebAuthn registration atomic

## Engineering rule going forward

Every substantive change should be recorded here under Completed, In Progress, or Pending/Intentionally not implemented, with verification status noted separately from implementation status.
