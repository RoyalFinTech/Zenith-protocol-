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
- CI PostgreSQL integration environment completed: GitHub Actions starts disposable PostgreSQL 16, bootstraps Supabase-compatible roles, applies every repository migration, and runs authenticated endpoint integration tests using a disposable database user/session. CI #329 verified 8/8 integration tests executed and passed; the suite contains no skips.

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

## Dual-program Starter activation and withdrawal eligibility — 2026-09-26

### Completed
- Enabled **2x4 Starter** package purchase at **10 USDT**.
- Enabled **2x6 Starter** package purchase at **30 USDT**.
- Kept Growth and Elite packages unpriced so only Starter packages can activate a matrix position.
- Backend package purchase now explicitly rejects non-Starter tiers before creating a purchase intent.
- Frontend package purchase now lets the authenticated member choose **2x4 or 2x6** and displays the corresponding Starter price.
- Confirmed settlement continues to allocate the purchased position from the selected program's available matrix node; the existing row lock prevents concurrent double placement.
- Added active-membership eligibility to withdrawal requests: a member must have an active matrix membership before a withdrawal reservation can be created.
- Production package configuration was applied and verified: 2x4 Starter = 10 USDT; 2x6 Starter = 30 USDT; Growth/Elite remain unpriced.
- Added source migration: `20260926210000_enable_dual_starter_matrix_packages.sql`.

### Economics note
- Both Starter packages use the established **20% direct / 70% matrix / 10% admin** allocation model.
- The 2x6 Starter retains its existing six-level distribution.
- The 2x4 Starter **level-by-level matrix distribution is intentionally not invented** because no approved split was supplied. The package can be purchased and the matrix position activated; matrix-level earning allocation for 2x4 remains pending an explicit approved distribution.

### Verification
- Production currently has 30 available 2x4 positions and 126 available 2x6 positions.
- Production currently has zero memberships and zero active nodes in either program, so no existing member position was altered by this change.
- Production migration history now includes `enable_dual_starter_matrix_packages`.
- Backend source and frontend purchase flow were updated on `main`; automated CI verification is still pending for the new commits.

### Pending
- Add/verify integration coverage for the new active-membership withdrawal gate and both Starter package codes.
- Define the approved 2x4 level distribution before crediting 2x4 matrix-level earnings.

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


## Admin Control Center and package lifecycle — 2026-09-27

### Completed
- Added migration 20260927110000_upgrade_package_lifecycle_and_admin.sql for package tiers, matrix parent tracking, purchase accounting fields, platform revenue ledger, and staff admin sessions.
- Implemented separate staff email/password authentication with scrypt, timing-safe verification, five-failure/10-minute lockout, server-side sessions, JWT session binding, and credential-change session revocation.
- Added protected admin portal login, session, credential, analytics, revenue, withdrawal, matrix, and audit endpoints.
- Added live Admin Control Center UI with staff-only language, KPI cards, charts, tables, accounting views, matrix/audit views, lock/refresh controls, and credential security.
- Replaced stale package pricing/economics UI with the approved six-package catalog and current member tier state.
- Added matrix metadata to member state and UI: package tier and explicit explanation of sponsor/referrer versus matrix parent.
- Corrected admin package-mix SQL and hardened matrix placement so available nodes require valid active binary parents.
- Rotated the seeded admin credential to a newly generated scrypt hash; plaintext is not stored in source.
- Added integration coverage for member/admin authentication separation, admin login, wrong-password handling, lockout, credential change, session revocation, and admin overview access.

### Verification
- Supabase production schema inspection confirms matrix level convention: 2x4 positions 1–2 / 3–6 / 7–14 / 15–30 and 2x6 positions 1–2 / 3–6 / 7–14 / 15–30 / 31–62 / 63–126.
- Supabase security advisor currently reports the existing backend-only RLS-without-policy informational findings; no public table grants are being added.
- CI run #373 passed before the latest branch commits. CI run #377 is the current validation run for the latest branch head and must pass before PR creation.

### Remaining release gates
- Confirm current-head CI run #377 succeeds.
- Review final PR diff.
- Create PR from feature/admin-control-center-and-package-lifecycle to main.
- Do not claim production deployment until Render reports the new commit live.


## Lifecycle / frontend state continuation — 2026-09-27 12:12 UTC

### Completed in this continuation
- Repository documentation is now being treated as the engineering checkpoint/source of truth rather than relying on conversation history.
- Feature branch was refreshed to the latest main commit before continuing inspection.
- Removed the obsolete duplicate manual matrix-placement endpoint from backend/src/routes/mutations.ts; package confirmation remains the authoritative lifecycle path for paid package activation and placement.
- Added authenticated notification APIs: GET /api/me/notifications, PATCH /api/me/notifications/:id/read, and PATCH /api/me/notifications/read-all.
- Replaced the frontend's hard-coded notification list/badge with backend-backed notification state, unread count, individual read handling, and mark-all-read handling.
- Dashboard balance state now consumes the backend withdrawal reservation amount so the displayed available balance does not ignore funds already reserved by pending/completed withdrawal requests.
- Production inspection confirmed the notification table exists with id, user_id, title, message, created_at, and nullable read_at fields.

### Production observations recorded during this continuation
- notifications: 0 rows; unread notifications: 0.
- activity_events: 0 rows.
- package_purchases: 2 rows; confirmed purchases: 0.
- withdrawal_requests: 0 rows; open withdrawals: 0.
- platform_revenue_ledger: 0 rows.
- admin_users: 0 rows. Admin provisioning remains intentionally pending.

### Pending / intentionally incomplete
- Admin Security / first administrator provisioning: intentionally pending until the operator is ready to provision the administrator. No claim of completed admin access is made.
- Admin bootstrap must remain an operator-controlled credential-provisioning step; no plaintext password is committed to the repository.
- Current frontend/backend notification and balance changes are awaiting current-head CI verification.
- Continue review of withdrawal drawer/status behavior, accounting/ledger presentation, package lifecycle edge cases, and frontend state synchronization after CI returns.

### Current verification
- CI for current continuation head 0aaf4fd9ddc18d15758a58469f3325679369f982 is currently IN PROGRESS for both backend and frontend jobs.
- Production database inspection was read-only for this continuation; no production rows were modified.

### Engineering checkpoint
- Completed: lifecycle/admin implementation, package tier state, matrix parent metadata, accounting fields, protected admin APIs/UI, backend notification read APIs, backend-backed notification UI, reservation-aware balance display, duplicate placement endpoint removal.
- Pending: administrator provisioning/security handoff, CI validation of current continuation, final withdrawal/accounting/frontend-state review, final release/deployment decision.


## Engineering continuation checkpoint — 2026-09-27 12:41 UTC

### Validation completed
- Current continuation CI run **passed**: backend lint, migration application, unit tests, integration tests, frontend build, and frontend login test all succeeded.
- Package lifecycle preflight was tightened so Starter purchases only proceed when an available node has either a valid root position or an active binary parent, matching the settlement-time placement invariant.
- Withdrawal lifecycle code was reviewed end-to-end: pending → approved → processing → completed, with rejection/failure reservation release, on-chain payout verification, confirmation checks, treasury sender checks, exact USDT destination/amount matching, duplicate transaction protection, and audit logging.
- Frontend withdrawal lifecycle UI already represents pending/approved/processing/completed/rejected/failed states and explains reservation release on rejection/failure.
- Frontend accounting state now includes the backend reservation value when calculating available balance.
- No production database mutation was performed during this continuation.

### Current production observations
- Production currently has zero open withdrawals and zero admin users, so withdrawal/admin state could only be validated structurally rather than through live records.
- Admin Security / first administrator provisioning remains **PENDING** by explicit decision.

### Remaining review gates
- Continue checking frontend accounting labels and withdrawal history against backend state fields.
- Continue package lifecycle edge-case review, especially upgrade idempotency and settlement retry behavior.
- Reconcile stale deployment/documentation timestamps and release-gate references before the next promotion decision.
- Do not mark Admin Security complete until the operator explicitly authorizes the administrator handoff.


## Engineering continuation checkpoint — 2026-09-27 12:43 UTC

### Completed
- Reviewed package settlement idempotency constraints: unique payment transaction hash and one pending purchase per user/package are source-controlled; matrix earnings and ledger writes use idempotent references.
- Tightened package capacity preflight to require a structurally eligible available node with a root or active parent.
- Identified and closed the Admin Control Center withdrawal operations gap: the queue was previously read-only.
- Added protected admin withdrawal transitions for approved, processing, rejected, and failed states, including required rejection/failure reasons and reservation checks.
- Added protected admin withdrawal completion with exact on-chain USDT payout verification: configured treasury sender, correct chain/token, successful receipt, required confirmations, exact destination and amount, and duplicate transaction protection.
- Added audit records for staff withdrawal operations.
- Added regression coverage for authenticated notifications and admin withdrawal transition guards.
- Refreshed `docs/api.md` to document notification APIs and the protected admin portal endpoints, and removed the obsolete manual matrix-placement endpoint from the API contract.

### Pending / release gates
- Current code changes require CI validation before being called complete.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.
- Production deployment of this continuation is not claimed; Render deploys from `main`.
- Continue checking accounting/ledger presentation, upgrade idempotency, settlement retries, and frontend state refresh after CI.


## Engineering continuation checkpoint — 2026-09-27 12:48 UTC

### Completed
- Settlement allocation now uses the actual `package_purchases.amount` that the member's confirmed payment was verified against, instead of re-reading `package_economics.entry_amount` during settlement. This prevents catalog-price changes between purchase creation and confirmation from changing the financial split.
- Direct, matrix, and admin allocation calculations still use the configured 20/70/10 percentages and PostgreSQL numeric arithmetic.
- Withdrawal transition/completion logic was consolidated into `backend/src/services/admin-withdrawals.ts` so the separate staff portal and legacy admin authorization path share the same transition and payout-verification rules.
- Legacy app-user admin routes now reuse the shared withdrawal service instead of maintaining a second copy of payout logic.
- Extended integration coverage for notification read behavior and both blocked/valid admin withdrawal transitions.
- Fixed the frontend delegated action handler so Admin withdrawal controls have a defined event target.

### Validation state
- Prior continuation CI passed completely before this accounting/consolidation pass.
- Current latest CI run #415 is queued/in progress for the newest test cleanup commit; this commit must pass before these newest changes are marked validated.
- Production inspection remains read-only; no financial or admin production rows were created.

### Pending
- Admin Security / first administrator provisioning remains intentionally **PENDING**.
- Final current-head CI validation for the accounting/admin-route consolidation.
- Continue frontend accounting/history review and settlement retry edge-case review after CI.


## Engineering continuation checkpoint — 2026-09-27 12:50 UTC

### Completed
- Confirmed the previous accounting/consolidation changes are under CI validation.
- Fixed dashboard pending-balance semantics so only `earned` ledger entries with `pending` status contribute to pending earnings; withdrawal reservations no longer inflate the member's pending earnings display.
- Added integration coverage asserting that creating a pending withdrawal does not increase pending earnings.
- Shared admin withdrawal service and legacy admin route consolidation remain in the current feature branch.

### Validation
- Latest CI runs are still processing the newest commits; do not mark the current head fully validated until the corresponding run completes successfully.
- Production database remains read-only during this engineering continuation.

### Pending
- Admin Security / first administrator provisioning remains intentionally **PENDING**.
- Continue final settlement retry/upgrade review and frontend state reconciliation after CI.


## Engineering continuation checkpoint — 2026-09-27 12:52 UTC

### Completed
- Added a shared transactional user-notification helper.
- Package lifecycle now emits notifications when a new purchase is created and when a confirmed package activates a matrix position.
- Withdrawal submission now emits a member notification.
- Staff withdrawal approval/processing/rejection/failure/completion now emits member-facing status notifications.
- Notification read APIs and the frontend notification center now have real lifecycle events feeding them rather than static placeholder content.

### Validation state
- CI runs are being triggered for the notification changes; the latest run for the current head is still in progress.
- No production rows were created or changed by this continuation.

### Pending
- Confirm current-head CI success after the notification event changes.
- Continue final frontend/accounting synchronization review.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 13:10 UTC

### Completed
- Added server-backed browser/device push subscriptions in `push_subscriptions`, with per-user ownership, endpoint uniqueness, delivery timestamps, failure counters, RLS enabled, and public/anonymous Data API access revoked.
- Added native Web Push `aes128gcm` encryption and VAPID authorization without introducing a third-party push dependency.
- Added authenticated push subscription registration/removal endpoints.
- Added post-commit push dispatch for package purchase creation, package activation, withdrawal submission, withdrawal status changes, and withdrawal completion.
- Added a root service worker, installable web-app manifest, phone-notification permission flow, push status controls in Notifications/Profile, notification deep links, foreground refresh, and push cleanup on wallet logout.
- Fixed an existing frontend notification-state destructuring defect so backend notifications are loaded into the correct state slot.

### Production verification
- Supabase push subscription migration was applied successfully to production and verified: expected columns exist, RLS is enabled, and no `anon`/`authenticated` table grants were found.
- Supabase security advisor now shows the expected backend-owned `push_subscriptions` RLS/no-policy informational finding; no elevated security finding was reported for the new table.
- VAPID credentials have not been placed in source control and must be provisioned as Render environment secrets before production device delivery can be enabled.

### Pending / release gates
- Run and pass current-head backend/frontend CI after the push changes.
- Perform one real device acceptance test on HTTPS: grant notification permission, register a phone subscription, trigger a lifecycle notification, receive it with the app backgrounded, and tap it to return to the member workspace.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.
- Continue the remaining accounting/history and settlement retry review after CI.


## Engineering continuation checkpoint — 2026-09-27 13:14 UTC

### New correction
- Fixed member available-balance accounting so withdrawal reservations remain reserved through `pending`, `approved`, `processing`, and `completed` states.
- This prevents a member from submitting another withdrawal against funds already approved or being paid out.
- Added regression coverage proving an approved withdrawal remains present in the dashboard `earnings.reserved` amount.

### Validation
- Previous push/device and withdrawal-history CI head passed.
- New current-head CI run #454 is in progress for the reservation correction.
- Render `main` is live on commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`; the feature branch is not yet live.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 13:16 UTC

### Lifecycle correction
- Withdrawal reservations now remain counted in available-balance calculations through `pending`, `approved`, `processing`, and `completed` states.
- Added an API-level regression showing a second withdrawal is rejected when an already-approved reservation would consume the requested funds.
- Package lifecycle now enforces forward-only tier progression: Starter → Growth → Elite. Same-tier purchases and lower-tier downgrades are blocked during purchase preflight and rechecked while settling the on-chain payment.
- Added package-tier progression unit coverage.

### Validation
- Current feature head: `68f5225ec2470230ec901dbec0c2d10e47926504` before the latest double-spend regression commit.
- CI run #460 is in progress for the tier/reservation changes; the later double-spend regression will trigger a subsequent CI run.
- Production Render `main` remains live on commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 13:17 UTC

### Frontend state correction
- Replaced the member Earnings page's fixed example chart and fixed activity bars with values derived from the authenticated backend ledger response.
- Historical earnings now use completed `earned` ledger entries from the last seven calendar days.
- Activity mix now reflects completed ledger values for earnings, withdrawals, and deposits.
- Empty accounts explicitly show that no completed earnings have been recorded instead of displaying fabricated performance.

### Release state
- Feature branch is 72 commits ahead of `main` with no commits behind.
- Latest feature-head CI run #464 is in progress after the ledger-driven Earnings correction; do not mark the current head validated until it completes successfully.
- Render `main` remains live on commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 13:25 UTC

### CI regression fix
- The approved-withdrawal reservation regression test was made independent of earlier suite state by capturing the member's reserved balance before creating its test withdrawals and asserting the 0.75 USDT reservation increase after approval.
- This corrects the CI failure that began at run #455; later frontend and documentation commits were reporting the same backend test failure because the failing integration test remained in the suite.
- The package purchase creation response was also corrected to return the locked `package_purchases.amount` when reusing a pending purchase, rather than the current catalog price.

### Validation state
- Current feature head: `383a8cce1e3cdc035caf84a001658ee3610ea5b5`.
- Feature branch is 78 commits ahead of `main`, 0 behind.
- CI run #470 is in progress and is the current validation gate.
- Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`; the feature branch is not deployed.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 13:28 UTC

### Validation complete
- Fixed the final CI regression in the withdrawal reservation integration test: the double-spend request now spreads the authenticated header object so the test reaches the authorization-protected withdrawal endpoint correctly.
- CI run #473 passed end-to-end on feature head `7c9ba098b183b574ad4e61c789a74a63c2eed959`.
- Backend lint, all backend unit tests, all integration tests, database migration application, frontend build, and frontend login tests are green.
- Pending package purchase responses now return the purchase's locked `amount`, preventing catalog-price drift while a pending purchase is reused.

### Release state
- Feature branch is validated but not deployed.
- Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Real-device Web Push acceptance remains required before production phone delivery can be called validated.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 13:41 UTC

### Settlement consistency hardening
- Added `supabase/migrations/20260927134000_snapshot_package_economics.sql`.
- New package purchases snapshot the package tier, direct/matrix/admin allocation percentages, and matrix distribution rules at creation time.
- Confirmation now settles from the purchase snapshot instead of re-reading mutable `package_economics` and `matrix_distribution_rules`.
- Existing purchases are backfilled from the configured economics where present; the member's stored purchase `amount` remains authoritative.
- Production inspection confirmed the two current pending purchases are 10.00000000 USDT 2×6 Starter purchases while current catalog economics have a 30.00000000 entry amount; no production rows were changed.

### Validation
- CI run #481 passed all backend and frontend checks, including database migration application and the integration suite.
- Feature head at this validation point: `d6e618ca360559a166ff85f750c7be250005ad30`.
- A temporary local clone was not possible because the execution environment cannot resolve github.com; CI is the authoritative validation for the branch.
- Feature branch remains un-deployed.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 14:04 UTC

### Purchase settlement snapshot hardening
- Made new package purchase snapshot creation atomic at the SQL statement level: package price, package tier, allocation percentages, and matrix distribution rules are captured together from the same database statement.
- If package pricing/tier changes between preflight and insert, or settlement economics are missing, purchase creation now fails safely instead of creating a partially or inconsistently snapshotted purchase.
- Strengthened the snapshot migration so existing purchases must be fully backfilled before the snapshot columns become NOT NULL; the migration now fails closed rather than leaving a purchase that cannot be settled from a complete snapshot.
- Corrected the migration's anonymous-block delimiter before final validation.

### Validation / release state
- Current validated feature head: `c344de45d2fea27f85fb35eb26f890254c765cad`.
- CI run #488 passed end-to-end: backend lint, database migrations, backend unit/integration tests, frontend build, and frontend login tests.
- Production Supabase inspection remains read-only. The two pending 2×6 Starter purchases remain 10.00000000 USDT while current package economics show a 30.00000000 entry amount; no production purchase rows were changed.
- Feature branch remains un-deployed; Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Render service configuration was rechecked: the live Health Check Path remains blank while repository `render.yaml` declares `/health`; this is still a separate infrastructure-drift item.
- Real-device Web Push acceptance remains a release gate.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 14:19 UTC

### Settlement retry/idempotency hardening
- Tightened package confirmation retry handling so a request that reaches a row already confirmed with a different transaction hash now returns HTTP 409 instead of reporting a generic confirmed response.
- Added an integration regression that verifies the recorded transaction hash is idempotent while a different hash is rejected for the same confirmed purchase.

### Validation / release state
- Current validated feature head: `19f6a13089a488d41ddd60680cd0e1fd41c60375`.
- CI run #491 passed end-to-end: backend lint, migration application, unit tests, integration tests, frontend build, and frontend login tests.
- Production Supabase remains unchanged. The live `package_purchases` table still does not contain the new economics-snapshot columns; the feature migration remains unpromoted.
- The two existing pending 2×6 Starter purchases remain 10.00000000 USDT while current package economics show a 30.00000000 entry amount; no production purchase rows were changed.
- Feature branch remains un-deployed; Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Live Render Health Check Path remains blank while repository `render.yaml` declares `/health`; the live health URL could not be verified through the available web retrieval channel.
- Real-device Web Push acceptance remains a release gate.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Engineering continuation checkpoint — 2026-09-27 14:23 UTC

### Snapshot immutability hardening
- Added a database trigger that makes the purchase-time settlement economics snapshot immutable after creation/backfill.
- Snapshot mutation attempts now fail at the database layer for package tier, direct/matrix/admin percentages, and matrix distribution rules.
- The trigger function is explicitly revoked from `public`, `anon`, and `authenticated` execution because it is trigger-only infrastructure and not an application RPC.
- Added an integration regression that attempts to mutate a stored snapshot and requires the database to reject the change.

### Validation / release state
- Current validated feature head: `6cce8f5bbe2987447315ccc36f836397b9522319`.
- CI run #496 passed end-to-end: backend lint, migration application, unit tests, integration tests, frontend build, and frontend login tests.
- Production Supabase remains unchanged. The live `package_purchases` table still does not contain the five economics-snapshot columns, so the snapshot/immutability migrations remain feature-only.
- The two existing pending 2×6 Starter purchases remain 10.00000000 USDT while current package economics show a 30.00000000 entry amount; no production financial rows were changed.
- Feature branch remains un-deployed; Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Render live Health Check Path remains blank while repository `render.yaml` declares `/health`; the live health URL could not be verified through the available retrieval channel.
- Real-device Web Push acceptance remains a release gate.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## 2026-09-27 14:38 UTC — Purchase integrity + admin provisioning gate
- Confirmed CI #497 passed for the prior snapshot-immutability documentation checkpoint.
- Hardened package_purchases immutability: settlement-critical user_id, package_id, amount, and asset are now frozen alongside the purchase-time economics snapshot fields.
- Added an integration regression proving a purchase amount mutation is rejected by the database trigger; CI #499 passed fully (backend lint, migrations, unit/integration tests, frontend build/login).
- Removed the historical seeded admin@zenitprotocol.com bootstrap via an idempotent, hash-specific cleanup migration; administrator provisioning remains an explicit operator-controlled step.
- Added an integration regression asserting the default administrator email is absent after migrations; CI #501 passed fully.
- Production Supabase remains unchanged by these feature migrations. Current production read-only check reports admin_users=0 and no historical seed email.
- Real-device Web Push acceptance remains pending; live Render main still does not contain the feature branch push implementation.
- Render health-check configuration drift (render.yaml /health vs live blank path) remains pending and was not changed.
- Admin Security / first administrator provisioning remains intentionally pending.
- Feature branch remains unmerged and not deployed to production.


## 2026-09-27 15:35 UTC — Full email/onboarding/security audit checkpoint
- Audited the registration, email verification, wallet handoff, Resend, Render, Supabase RLS/grants, public functions, production data state, and CI pipeline.
- Resend production email infrastructure was provisioned: verified-domain record set created for zenitprotocol.com, least-privileged sending credential stored in Render, and branded Welcome + Verify Email templates published.
- The production sending domain remains pending DNS verification. No email delivery test can honestly be called complete until those DNS records are present.
- The application already used the official repository PNG logo; no SVG was generated. Branded verification emails point to the official PNG asset and successful verification redirects to the wallet-connect step.
- Hardened verification failure UX: invalid/expired links now redirect to the branded registration surface instead of exposing a raw API error.
- Hardened Resend delivery calls with a 10-second timeout and welcome-email idempotency.
- Identified and fixed a security weakness in the post-verification wallet handoff: the old reusable registration UUID was replaced with a short-lived, hashed, one-time wallet handoff secret. The raw registration identifier is no longer returned to the browser.
- Added migration and regression coverage for the one-time wallet handoff.
- Supabase security advisor review: 26 public tables have RLS enabled with no anon/authenticated table privileges; the only public function is the read-only package economics quote function. Advisor RLS-without-policy findings are consistent with the backend-owned database access model.
- Production read-only state: 2 pending package purchases, 0 confirmed, 0 admin users, 0 push subscriptions, and 0 active pending registrations. No production purchase rows were altered.
- Render production environment now contains the least-privileged Resend sender configuration and the resulting environment deployment is live on the existing main commit.
- Real-device Web Push remains the only physical-device acceptance item; the implementation is complete but cannot be truthfully certified without a browser/device test.
- Admin provisioning remains intentionally operator-controlled and was not performed.
- Feature branch remains unmerged; feature code was not deployed to production.
