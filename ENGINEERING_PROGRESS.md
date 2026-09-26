# Zenith Protocol — Engineering Progress

Last updated: 2026-09-26 (continued)
Branch: `main`

## Completed

### Authentication / session integrity
- Authentication middleware now distinguishes invalid credentials (401) from backend/session-store failures (503), avoiding misleading authentication errors during infrastructure outages.
- WebAuthn registration is now insert-only for credential IDs, preventing an existing credential from being overwritten.
- WebAuthn registration challenges are atomically claimed before credential creation.
- WebAuthn registration challenge consumption and credential insertion now commit or roll back together.
- WebAuthn login challenge consumption, credential counter advancement, and session creation now commit or roll back together with row locking.
- Successful PIN login challenge consumption, lockout reset, and session creation now commit or roll back together.
- Wallet nonce verification and session issuance hardened with transactional row locking.
- PIN challenge consumption made atomic.
- PIN setup moved into a transaction with challenge row locking and rollback handling.
- WebAuthn login challenge consumption made atomic.
- WebAuthn credential sign-count update guarded against replay/non-monotonic counters.
- JWT middleware validates the backing session and revocation/expiry state.

### Package purchase / settlement
- Capacity preflight now applies only to creation of a new purchase intent; existing pending purchases can still be completed if capacity changed afterward.
- Re-submitting confirmation for the same already-confirmed transaction is now idempotent; a different transaction remains rejected.
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

### Frontend login regression
- Fixed the onboarding `CONNECT WALLET / LOGIN` click path by removing competing event handling, adding a wallet fallback, and raising the modal layer above onboarding.
- Fix commit: `e89d9d9`.
- Render deployment `dep-das19ifavr4c738jo2qg` is live on that commit.

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
- The capacity-preflight/admin-test/WebAuthn hardening set was verified by CI before merge.
- Review admin/audit behavior around payout reconciliation and operational visibility.
- Reconcile repository migration history/name drift with Supabase's applied migration history before any production migration cleanup.
- Verify the newest commits with CI before treating each change as fully validated.

### Build architecture
- Added `BUILD_CONCEPT.md` as the consolidated source of truth for frontend/backend/database/blockchain responsibilities, authentication, package settlement, withdrawals, deployment boundaries, invariants, and engineering workflow.
- Updated `README.md` to point to the current architecture/migration guidance instead of the obsolete single-migration instructions.

### Database security / performance
- Confirmed `anon`/`authenticated`/`public` have no table grants on the core backend-owned tables; RLS-without-policy advisories are therefore consistent with the backend-only access model.
- Added the missing partial index for active WebAuthn challenges by user/kind/expiry; applied to production and mirrored in repository migrations.

### Migration reconciliation
- Reintroduced repository migration files matching the two production-applied migration versions for package settlement and withdrawal payout idempotency. These are no-op/idempotent DDL because the indexes already exist in production.

## Pending / intentionally not implemented

### Treasury signing / automatic payouts
- No private key is stored or used by the backend.
- No automatic payout signer/worker has been introduced.
- Actual treasury payout execution remains an operational step outside this API.
- The secure completion endpoint only verifies an already-broadcast payout transaction.

### Production deployment
- Security hardening PR #7 was merged to `main` on 2026-09-26 after CI verification.
- Render auto-deploys from `main`; the merged release was deployed successfully.

### Render configuration
- Render service configuration still has a health-check drift: live service reports an empty health-check path while repository `render.yaml` declares `/health`.
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
- `d46714e` — Make WebAuthn login atomic
- `212ef81` — Make PIN login atomic
- `5268b9d` — Make repeated package confirmation idempotent
- `0658d84` — Distinguish auth failures from session store outages
- `cdec042` — Reconcile package settlement migration history
- `12e68c9` — Reconcile withdrawal payout migration history
- `a4f4c23` — Index active WebAuthn challenges by user
- `1940ef9` — Align WebAuthn migration version with production
- `38c0192f` — Normalize package payment unique-constraint races
- `3031cf3d` — Require withdrawal reservation before processing
- `7ae27fcb` — Fail fast on unsafe production configuration
- `771b97a3` — Track live deployment versus security branch
- `c9b6953` — Document complete build concept
- `1883f08` — Update README architecture/migration guidance

## Engineering rule going forward

Every substantive change should be recorded here under Completed, In Progress, or Pending/Intentionally not implemented, with verification status noted separately from implementation status.


### Withdrawal reservation enforcement
- Admin transitions to `approved` or `processing` now require the matching pending withdrawal reservation ledger row under the same database transaction. This prevents advancing legacy/incomplete withdrawals into active payout states without a financial reservation.

### Package settlement race handling
- Production `package_purchases` has both the existing unique `payment_tx_hash` constraint and the newer partial uniqueness index. The package API now recognizes both constraint names and returns a controlled conflict instead of leaking a database error during concurrent duplicate settlement attempts.

### Production configuration hardening
- Production startup now fails fast for weak/unsafe authentication and deployment configuration: JWT secret length, HTTPS app/API URLs, HTTPS CORS origins, BNB chain ID, confirmation count, session TTL, and nonce TTL are validated explicitly.
- Development defaults remain available for local development; production no longer silently accepts localhost/HTTP security settings.

### Deployment state tracking
- Added `DEPLOYMENT_STATE.md` to record the live Render commit, deployment source branch, health-check configuration drift, production migration state, security-branch head, and explicit release gates.
- Current live Render deployment is `70c76b8` from `main`; the security branch is separate and has not been manually deployed.

## Current verification gate
- Release branch: `main`
- PR #7: merged
- Latest tracked change: `e89d9d9`
- CI for the release candidate passed: Zenit CI #285 (backend lint/tests + frontend build).
- Production migration history is reconciled through `20260926174932_webauthn_challenge_user_index`.
- Production financial integrity checks performed during this cycle remain clean.
