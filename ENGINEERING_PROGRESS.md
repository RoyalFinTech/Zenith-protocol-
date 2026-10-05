# 2026-10-03 — Engineering hygiene + production-gate checkpoint

- Re-verified the production Render service in **Royal's workspace** (`tea-dadvf02d0e5s73eha320`): `Zenith-protocol-` tracks `main`, auto-deploy is enabled for commits, and the current live deployment is `dep-db06mk5ckfvc73chhkj0` from commit `d243938a4e196556f1822244df80e5237504056d`.
- Current GitHub `main` has advanced to `90e341197d72469226c6d80c4a0431288df866f7`; CI run #727 completed successfully.
- No open pull requests remain. Historical PRs #15, #17, and #18 were closed as superseded/stale with comments; no code from those PRs was promoted by this cleanup.
- Render configuration drift remains unresolved: the live service still reports a blank health-check path while repository `render.yaml` declares `/health`, and the backend exposes `GET /health`. The available Render action surface still does not expose a service health-path update operation, so no unrelated production setting was changed.
- Push infrastructure remains source-complete: `frontend/public/sw.js`, authenticated subscription registration, and the member **Test** action are present. Production read-only counts remain 3 application users, 0 admins, 0 push subscriptions, 0 active pending wallet handoffs, and 0 notifications at this checkpoint.
- Real-device push acceptance is still open. No request traffic was observed on the Render service during 2026-10-03 02:40–02:55 UTC, so no device test has been demonstrated through the service logs.
- No production financial, membership, package, withdrawal, ledger, or admin records were modified during this engineering phase.

---

# 2026-10-03 — Push-device self-test release gate

- PR #23 (`feat: add authenticated push device self-test`) merged successfully into `main` as `d243938a4e196556f1822244df80e5237504056d` after GitHub Actions run #719 passed both backend and frontend jobs.
- Render **Royal's workspace** service `Zenith-protocol-` deployed the merge commit as deployment `dep-db06mk5ckfvc73chhkj0`, now `live`.
- The live build completed successfully and the service started normally at `https://zenith-protocol-qvfe.onrender.com`.
- The member notification panel now exposes an authenticated **Test** action after a device has subscribed to push notifications. The test route only targets the logged-in user's own subscriptions and does not create package, withdrawal, or financial records.
- Production Supabase remains read-only for this gate: 3 application users, 0 admin users, 0 push subscriptions, and 0 active pending wallet handoffs at the time of verification.
- Real-device push acceptance is still pending because no production device subscription exists yet. Acceptance requires enabling notifications on a real supported device and receiving the native test notification.

---

# Current verified release checkpoint — 2026-10-03 02:35 UTC

- Repository default branch `main` is at merge commit `96a53c2865c44c5b0f27045e436cc7e148ecac39`, the merged PR #21 frontend mobile markup/splash repair.
- Render **Royal's workspace** service `Zenith-protocol-` (`srv-dajmafdg1s2s73ba8k5g`) is confirmed to track `main` with auto-deploy enabled.
- Render deployment `dep-datu5r2d0e5s73dho0s0` was deployed from commit `96a53c2865c44c5b0f27045e436cc7e148ecac39` and is confirmed `live` as of 2026-09-29 16:12 UTC.
- GitHub Actions CI run #707 completed successfully for the current `main` commit.
- Render configuration drift remains: the live service reports a blank health-check path while repository `render.yaml` specifies `/health`. The application exposes `GET /health`; no production health-path mutation was made because the available Render action surface does not expose a service-config update operation.
- Current read-only Supabase counts: 3 application users, 0 admin users, 0 push subscriptions, and 0 active pending wallet handoffs. No production financial/member records were modified during this checkpoint.
- The real-device push gate is therefore still open: the code path and service worker are present, but no device subscription exists in production yet, so actual phone-delivery acceptance has not been demonstrated.
- Email release remains gated on an operator-controlled, Resend-verified sender domain and a real mailbox delivery test.

---

## Release gate audit — 2026-09-28 — post-PR #11 release gate audit

- PR #11 was merged into `main` as `26eea6edf4a5a7a1ee489bd86a96cfb06b3409c0`; GitHub Actions CI #629 passed.
- Supabase production function `public.prevent_package_purchase_snapshot_mutation()` now has `search_path = ''`; the prior mutable-search-path WARN is cleared.
- Production security advisors now show only the established 26 RLS-without-policy INFO findings; no new function-search-path warning remains.
- Read-only production financial audit: 2 `package_purchases` (both pending), 0 withdrawals, 0 ledger transactions, 0 matrix memberships, 156 matrix nodes, 0 admins, 0 push subscriptions, 0 notifications, and 0 active pending registrations.
- Both historical pending purchases still carry their original 10 USDT amount while the current 2x6 Starter catalog price is 30 USDT; they were not rewritten and are intentionally treated as historical pending records.
- Snapshot completeness is 100% for existing purchases, and the snapshot immutability trigger is present.
- Render live service still reports a blank health-check path while repository `render.yaml` declares `/health`. The available Render MCP surface has no update operation for this field; no unrelated production settings were changed.
- Real-device Web Push acceptance remains unverified; production `push_subscriptions` remains at 0. Source `frontend/public/sw.js` is present and handles push display, click routing, and subscription-change signaling.
- Resend currently exposes one failed/unverified sender-domain configuration; no operator-controlled sender domain has been independently verified, so mailbox delivery certification remains gated.
- First-admin provisioning remains intentionally operator-controlled.
# Zenith Protocol — Engineering Progress

Last updated: 2026-09-28 (continued)
Active validation branch: `feature/admin-control-center-and-package-lifecycle`

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
- Source-level frontend verification caught and fixed an Admin withdrawal-rendering parser defect and an async delegated-action-listener defect; all six inline script blocks now parse successfully at the current feature head.
- The frontend trust regression suite now asserts the delegated action listener is async so protected admin operations using `await` remain valid.

- Production currently has 30 available 2x4 positions and 126 available 2x6 positions.
- Production currently has zero memberships and zero active nodes in either program, so no existing member position was altered by this change.
- Production migration history now includes `enable_dual_starter_matrix_packages`.
- Backend source and frontend purchase flow were updated on `main`; automated CI verification is still pending for the new commits.

### Pending
- Add/verify integration coverage for the new active-membership withdrawal gate and both Starter package codes.
- Define the approved 2x4 level distribution before crediting 2x4 matrix-level earnings.


## Frontend visual trust / official-brand redesign — 2026-09-28

### Completed
- Reworked the authenticated Dashboard toward the approved premium reference layout while keeping backend-sourced member state and package data.
- Standardized the member workspace around the official ZENIT gold visual language rather than introducing a separate blue primary brand.
- Kept green reserved for real positive/connected status indicators.
- Shared the visual treatment across Dashboard, Programs, Matrix, Team, Wallet, Profile, Earnings, Transactions, Security and Help.
- Kept the official logo source as `frontend/public/zenit-logo.png`; no substitute logo asset was introduced.
- Added gold 3D-style visual treatments for the Dashboard hero, settlement flow, onboarding finance visualization, Matrix preview and Profile identity surface.
- Added backend-driven package cards and removed frontend purchase-price fallback values.
- Removed hardcoded Starter pricing and distribution calculations from the Matrix page; it now reads the selected program package catalog and `matrix_distribution` returned by the backend.
- Removed legacy stock/Unsplash imagery from branded frontend surfaces.
- Removed static claims that a separate ZENIT smart contract is deployed or that projected earnings are live activity.
- Wallet UI masks the full address and provides a copy action; connection/network state is shown separately.
- Username UX visibly supplies the `@` prefix and normalizes the stored username to lowercase letters, numbers and underscores.
- Profile photo upload now persists through the authenticated backend `avatar_url` field rather than device-only storage.
- Fixed the mobile hamburger breakpoint so the navigation control is visible on screens at or below 820px; Escape and outside-click close behavior remains wired.
- Preserved the existing day/night preference with an explicit light-mode treatment for the new gold visual system.
- Expanded frontend regression checks for the official logo, dynamic package economics, Matrix catalog sourcing, masked wallet behavior, mobile navigation, frontend action handlers and the new Matrix pricing guard.
- Escaped backend-provided member content in Programs and Team before inserting it into the UI.

### Verification
- CI run #568: success — Matrix UI hardcoded-pricing removal.
- CI run #569: success — shared official-brand visual system across member pages.
- CI run #570: success — real program active state in program cards.
- CI run #571: success — Matrix UI regression guard against hardcoded package economics.
- CI run #572: success — gold-compatible light-mode treatment.
- CI run #573: success — backend member-content escaping in Programs and Team.
- Newer commits after #573 are undergoing current-head CI validation; they are not treated as fully validated until that run succeeds.

### Final gold palette pass
- Updated the PWA manifest `theme_color` and `background_color` to the ZENIT dark-gold shell while retaining `frontend/public/zenit-logo.png` as the only app icon.
- Final brand pass: converted remaining literal blue admin chart/tab accents to the ZENIT gold family; semantic green/red status colors remain intentionally unchanged.
### Current release boundary
- All work in this section remains on `feature/admin-control-center-and-package-lifecycle`.
- No merge into `main`.
- No production deployment.
- Production database remains untouched by these frontend changes.


## Frontend endpoint / runtime consistency checkpoint — 2026-09-28

- Audited frontend `backendFetch()` paths against the actual Express route registrations on the feature branch; the Dashboard, Matrix, Leaderboard, Referrals, Member Profile, Notifications, Preferences, Push Subscriptions, Package Catalog, Transactions and Withdrawals calls all map to existing backend routes.
- Added frontend regression coverage for the expected backend route inventory.
- Added inline-frontend-script syntax validation to the trust UI regression suite.
- Fixed the Admin withdrawal renderer's nested action expression so the page parses cleanly.
- Fixed the delegated frontend action listener to be asynchronous because protected admin actions use awaited backend calls.
- Independently re-ran a full inline-script syntax check after those fixes; all six application script blocks now parse successfully.
- Current feature-head CI validation is green through **CI #595** after the runtime-safety fixes.
- CI #596 exposed an over-escaped regular expression in the new inline-script regression test; the frontend production build and login regression still passed. The test harness was corrected in commit `766c706123f1b602c0860fa4fcb3f22896c0da01` and is being revalidated by CI #600.
- No production deployment, production database mutation, or merge into `main` was performed.


## Shared gold visual stage / chart continuation — 2026-09-28

- Added a consistent premium gold 3D-style visual stage behind page headers so Programs, Matrix, Team, Earnings, Transactions, Wallet, Profile, Security, Help and related member pages share the same visual language as the Dashboard.
- Converted shared earnings/ledger chart lines, fills and bar treatments to the ZENIT gold family; green remains reserved for semantic status states.
- Kept light mode functional with matching light page-stage treatment.
- No backend behavior or production data was changed by this visual-only continuation.


## Premium withdrawal UX continuation — 2026-09-28

- Replaced the Wallet withdrawal browser `prompt()` flow with a branded ZENIT modal.
- The modal previews the currently loaded available earnings and whether an active matrix membership is detected before the request is submitted.
- Client validation mirrors the backend request constraints: positive decimal amount with up to 8 decimal places, amount cannot exceed currently available earnings, and destination must be a valid EVM address.
- Submission still goes through the backend `POST /api/transactions/withdrawals`, where the authoritative active-membership, balance, reservation and audit checks remain enforced.
- Added regression coverage preventing the old prompt-based withdrawal flow from returning.
- CI #602/#603 exposed malformed HTML from the initial string-based modal implementation; that was replaced with a template literal.
- Current source-level validation confirms all six inline frontend script blocks parse successfully and no legacy withdrawal prompts remain.
- CI #604 exposed the then-current withdrawal-prompt regression assertion against a branch snapshot that still contained the legacy prompt handler; later cleanup removed that stale path.
- CI #605 exposed the malformed withdrawal modal HTML in that same intermediate snapshot; the modal was rewritten as a template literal.
- CI #606 exposed the trust-test matcher issue from the earlier snapshot; the inline-script extractor was simplified to a parser-safe regex.
- CI #607 passed the stale-handler cleanup with backend and frontend jobs green.
- CI #608 passed the premium withdrawal UX/parser-hardening checkpoint with backend and frontend jobs green.

- No production data or deployment configuration was changed.


## Premium Wallet / endpoint audit continuation — 2026-09-28

- Added a gold 3D Wallet command-center surface using the official ZENIT PNG logo and the same gold-first visual language as Dashboard, onboarding and Profile.
- Wallet status, network, asset, masked address and earnings values remain sourced from authenticated frontend state/backend data; the 3D card is decorative only.
- Audited every `backendFetch()` path in the frontend against the actual Express route registrations on the feature branch. The expected member routes are present for Dashboard, Matrix, Leaderboard, Referrals, Profile, Notifications, Preferences, Push, Packages, Transactions and Withdrawals.
- Repository-wide frontend scan found no remaining hardcoded package-price strings, static 20/70/10 allocation text, Unsplash references, full wallet-address rendering template, or legacy blue hex accents in the main application HTML.
- The latest successful CI before the current Wallet visual cycle is #609. CI #610–#612 are validating the Wallet visual, styling and regression-test updates; they are not treated as complete until GitHub reports a final conclusion.


## Gold lifecycle / wallet continuation — 2026-09-28

- Added a premium gold 3D Wallet command-center surface using the official ZENIT PNG logo.
- Preserved clear separation between wallet connection state, account identity and masked wallet-address presentation.
- Confirmed the package-review modal reads current package prices/codes from the authenticated backend catalog and enforces Starter → Growth → Elite lifecycle messaging in the UI.
- Aligned real-time withdrawal and package-payment status docks with the gold-first brand system; green remains reserved for completed/positive states and red for failure/rejection.
- Performed a current-head source scan: all six inline frontend script blocks parse; the main application HTML contains no hardcoded package prices, no static 20/70/10 allocation copy, no Unsplash/stock imagery, no full wallet-address template, and no legacy blue accent hex values.
- CI #610, #611 and #612 passed for the Wallet implementation/styling/regression checks. The newest documentation and lifecycle-accent commits are still subject to their current-head CI result.

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


## 2026-09-28 15:30 UTC — Correct production app origin / email-domain correction
- Confirmed the live Render application URL is `https://zenith-protocol-qvfe.onrender.com`; this URL is the application origin and the appropriate base for verification-link redirects and wallet handoff navigation.
- Updated Render production environment values for `APP_ORIGIN`, `CORS_ORIGINS`, and `WALLETCONNECT_METADATA_URL` to the live Render URL. Render automatically triggered deploy `dep-dat8glu0tbcc73aaefr0` on the existing `main` commit; at checkpoint time it was still `build_in_progress`.
- Corrected an earlier engineering assumption: `zenitprotocol.com` was not provided by the operator as an owned domain. It must not be treated as the production email domain, and no DNS changes should be requested for it.
- Resend domain `zenitprotocol.com` remains an isolated/unverified configuration and has not been used as evidence of production domain ownership. No domain removal was performed because Resend removal is irreversible and requires explicit operator confirmation.
- The Render `onrender.com` application URL can be used for web links/origin, but it is not a domain controlled by the operator and therefore is not being treated as the sender domain for production email verification.
- Production email remains gated on a sender domain that the operator actually controls and can verify in Resend. Resend's current Free tier supports 3 verified domains at no monthly cost; no paid upgrade is required for verification itself.
- Official logo usage remains unchanged; no SVG or replacement logo has been introduced.
- All future environment/domain records must distinguish **application origin** from **email sending domain** before configuration is applied.


## 2026-09-28 15:40 UTC — Transactional email branding continuation
- Confirmed the live Render application origin is `https://zenith-protocol-qvfe.onrender.com`; it is used for verification redirects and for the official `/zenit-logo.png` asset URL.
- Corrected the transactional email implementation so both Verification and Welcome emails render the official repository PNG logo rather than relying on text-only branding.
- No SVG, generated logo, or replacement artwork was introduced.
- The Resend configuration for `zenitprotocol.com` remains isolated and unverified; it is not treated as an operator-owned sender domain.
- Current feature-head CI run #518 is in progress for this change. Previous origin/domain-correction run #517 passed successfully.
- Feature branch remains unmerged and not deployed to production.
- Remaining email release gate: an operator-owned sender domain must be verified in Resend before arbitrary member mailbox delivery can be certified.


## 2026-09-28 15:45 UTC — Wallet handoff URL hardening
- Hardened the email-confirmation browser flow so the short-lived wallet handoff token is copied into local storage and immediately removed from the browser query string.
- The `email_verified` marker is also removed with `history.replaceState`, reducing exposure through browser history, screenshots, copied URLs, and referrer propagation.
- Added a frontend regression assertion covering token storage and query-string scrubbing.
- CI run #518 passed for the official-logo email change; the new security/test commits are awaiting their current-head CI result.
- Feature branch remains unmerged and not deployed to production.


## 2026-09-28 16:55 UTC — Full audit continuation / security and configuration hardening
- Revalidated the active feature branch at `92f58496d2fdbf254a1423018a7075d9dd715afc`; the branch remains unmerged and is not deployed to production.
- GitHub Actions CI run #527 passed both backend and frontend jobs, including lint, migration application, unit tests, integration tests, frontend build, frontend login tests, and the new automatic-admin provisioning guard. Earlier runs #525/#526 failed before the final migration edit; the current head is green.
- Removed the automatic `admin_users` seed insert from `20260927110000_upgrade_package_lifecycle_and_admin.sql`. Administrator provisioning remains operator-controlled.
- Added a CI gate that rejects future migration files containing an `INSERT` into `admin_users`.
- Hardened production configuration defaults: `API_PUBLIC_URL` now falls back to `APP_ORIGIN`; production rejects partially configured Resend credentials; and `RESEND_FROM` no longer defaults to an unowned/fake sender domain.
- The feature environment example no longer names `zenitprotocol.com` as a sender domain.
- Production Render remains on main commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`. The live service is healthy and listening on port 10000; the configured Render health-check path is still blank while repository `render.yaml` declares `/health`. No production health-check mutation was performed.
- Production Supabase remains unchanged. Current migration history ends at `20260927130737`; the four feature-only migrations `20260927134000`, `20260927140500`, `20260927143000`, and `20260927150000` are still not applied. Read-only production state is 2 pending purchases, 0 confirmed purchases, 0 admin users, 0 push subscriptions, and 0 active pending registrations.
- Production schema confirms the pre-snapshot purchase/economics fields exist, while the new purchase-time snapshot fields and wallet-handoff fields are not yet present.
- Resend currently has two published templates, but both template sender metadata still references the pending/unverified `zenitprotocol.com` domain. The application runtime currently sends its own HTML and does not consume those published templates. No Resend emails are recorded, and no real delivery test was performed.
- The remaining email release gate is an operator-owned sender domain verified in Resend; a real mailbox address is also required for the final external delivery test.
- Supabase currently reports PostgreSQL 17.6.1. Supabase announced PostgreSQL 17.11 on 2026-09-25 with security fixes; upgrading production is an operator maintenance action and was not performed during this feature audit.


## 2026-09-28 16:57 UTC — Audit validation finalized
- Current feature branch head is `e7aeed9491266793390ed35691b6e681cdee2895`; it remains unmerged and undeployed.
- CI run #529 passed on the current documentation-inclusive head. The immediately preceding feature-code validation run #527 also passed all backend and frontend gates.
- No production mutation, feature deployment, merge, admin provisioning, or irreversible Resend deletion was performed during this continuation.


## 2026-09-28 — Canonical package pricing and economics checkpoint

### Operator-confirmed source of truth
The canonical package catalog is now documented in `docs/PACKAGE_ECONOMICS.md` and is the value future engineering work must preserve unless the operator explicitly approves a price change:

- 2x4 Starter: **10 USDT**
- 2x4 Growth: **25 USDT**
- 2x4 Elite: **50 USDT**
- 2x6 Starter: **30 USDT**
- 2x6 Growth: **60 USDT**
- 2x6 Elite: **120 USDT**

Every confirmed purchase uses **20% direct / 70% matrix / 10% platform administration**.

Matrix distribution:
- 2x4: **30% / 25% / 25% / 20%** across levels 1–4.
- 2x6: **30% / 20% / 15% / 10% / 10% / 15%** across levels 1–6.

### Production verification
Read-only production checks on 2026-09-28 confirmed that `program_packages.price` and `package_economics.entry_amount` currently match the canonical six-package catalog, with 20/70/10 economics configured for all six packages and the expected matrix-level rules present.

Two historical pending 2x6 Starter purchase intents remain at **10 USDT**. They were not modified. They are historical pending records and must not be used as evidence that the current 2x6 Starter price is 10 USDT.

### Code hardening
- New purchase intent creation now requires `package_economics.entry_amount = program_packages.price` in the atomic insert guard.
- A stale pending purchase whose recorded amount differs from the current package catalog price is no longer silently reused; the API returns HTTP 409 and leaves the historical pending purchase unchanged.
- Added regression coverage locking the six-package catalog, price/economics equality, 20/70/10 allocation, and both matrix distribution patterns.

### Validation / release impact
- Changes are confined to the feature branch.
- No production rows were modified.
- The production catalog itself was verified read-only; no price correction was required.
- Current feature head before this checkpoint: `630da77f375edce7134eb8136c13e2926804a907`.
- New CI must pass before this checkpoint is treated as validated.

### Historical migration note
An older migration named `20260917195000_configure_2x6_ten_usdt_economics.sql` contains the historical 2x6 Starter 10 USDT configuration. It is intentionally preserved as migration history. It is superseded by `20260926210000_enable_dual_starter_matrix_packages.sql` and the later package-lifecycle catalog reconciliation. Future work must use `docs/PACKAGE_ECONOMICS.md` plus the current catalog, not the historical migration value.


## 2026-09-28 — Pricing hardening validation completed
- Commit `46e67f1117e5d221b317a338088ea5dfb44932ec` completed GitHub Actions CI #532 successfully.
- Backend: lint, disposable PostgreSQL migration application, unit tests, integration tests, and automatic-admin provisioning guard all passed.
- Frontend: production build and login regression test passed.
- The canonical six-package pricing/economics regression passed, including price/economics equality, 20/70/10 allocation, and both matrix distribution patterns.
- Feature branch remains unmerged and was not deployed to production.

## Cross-device onboarding / wallet QA — 2026-09-29

- Audited the production frontend source after the onboarding/wallet repair deployment.
- Fixed the onboarding layout so phones use a single-column, viewport-sized composition with independently scrollable copy rather than retaining the desktop two-column layout.
- Added small-phone and short-viewport breakpoints for the onboarding art, badges, network-flow card, actions, and pager.
- Reduced the splash maximum wait from 8 seconds to 3.6 seconds and made it finish after the app signals readiness, with the maximum remaining as a failure-safe.
- Added an explicit zenit:app-ready readiness signal after the inline application boot path completes.
- Hardened wallet opening to use AppKit's standard open() connection entry point, added visible OPENING WALLET… button state, and kept the backend authentication path unchanged.
- Added regression assertions covering responsive onboarding, adaptive splash readiness, and wallet-open behavior.
- No financial/member records, package economics, authentication endpoints, or settlement logic were changed by this UI/wallet QA pass.

## Returning-member wallet gateway — 2026-09-29

- Traced the original onboarding repair commits and confirmed the intended returning-member flow: CONNECT WALLET / LOGIN → returning-member modal → phone biometrics or wallet + PIN.
- Found the remaining routing defect: the main [data-action] router called an openExistingWalletLogin function that lived only inside the separate onboarding bootstrap scope. That left the route dependent on an out-of-scope function instead of the already-published window.zenitOpenReturningLogin gateway.
- Removed the duplicate/dead onboarding gateway and routed existing-wallet-login directly to the single published returning-member gateway.
- Kept registration wallet authentication separate: verified-email onboarding continues directly to wallet authentication, while returning members get the biometric/wallet choice first.
- Added regression coverage preventing the duplicate gateway from returning and requiring both biometric and wallet+PIN choices in the returning-member modal.


---

# 2026-10-05 — Current engineering continuation checkpoint

- Repository main is at merge commit 07182fe12f7030617df2e1187ad491ba11b727a1, produced by merged PR #26 (test: harden push self-test authentication).
- GitHub Actions run #736 passed both backend and frontend jobs. Backend completed lint, automatic-admin provisioning guard, disposable database migration application, unit tests, and integration tests. Frontend completed build, login regression tests, and trust-UI tests.
- Render Royal's workspace (tea-dadvf02d0e5s73eha320) is confirmed to own the production service Zenith-protocol- (srv-dajmafdg1s2s73ba8k5g). The service tracks main, has commit auto-deploy enabled, and is connected to RoyalFinTech/Zenith-protocol-.
- Render deployment dep-db1bn2mq1p3s73f5iilg from commit 07182fe12f7030617df2e1187ad491ba11b727a1 is live and finished at 2026-10-04 20:50:02 UTC.
- PR #26 adds an integration regression assertion that unauthenticated POST /api/me/push/test is rejected with HTTP 401. It does not change production financial, membership, withdrawal, ledger, package, or admin records.
- Real-device Web Push acceptance remains open. Source implementation and the authenticated Test action are live, but actual native phone delivery has not been demonstrated. Do not mark this gate passed until a supported device subscribes and receives the test notification.
- Render health-check configuration drift remains open: the live service reports a blank health-check path while repository render.yaml declares /health and the backend exposes GET /health. No unsupported production mutation has been made because the available Render action surface does not expose a service health-path update operation.
- Production email acceptance remains gated on an operator-controlled, Resend-verified sender domain and a real mailbox delivery test. The Render application URL is not treated as an email sender domain.
- First-admin provisioning remains intentionally operator-controlled.
- No production financial, membership, package, withdrawal, ledger, or admin rows were modified during this continuation.


## 2026-10-05 — Onboarding visual + returning-member authentication hardening

- Feature branch: `fix/onboarding-real-images-returning-auth-20261005`.
- Reworked the full onboarding art surface so the onboarding hero no longer displays the official ZENIT logo as the main artwork. It now uses real office/financial photography with dark-gold overlays; the second onboarding step uses a real market-chart photograph.
- Removed the legacy onboarding image rule that forced the hero into a contained logo treatment and introduced a blue visual filter. The hero image now fills its frame with responsive `object-fit: cover` behavior on desktop and mobile.
- Onboarding action buttons are hard-locked to the ZENIT gold treatment with `!important` on border/background/text/shadow so an unrelated shared button rule cannot turn them blue.
- Returning sessions now validate the stored ZENIT session against `GET /api/me` immediately after the splash. A valid session bypasses onboarding and opens the dashboard directly; an invalid session is cleared and the normal onboarding/registration route resumes.
- Returning-member wallet login remains centralized through the existing returning-member modal. Wallet + 4-digit PIN continues to dispatch the authenticated route directly to the dashboard.
- Phone biometric registration no longer depends on `AuthenticatorAttestationResponse.getPublicKey()`; the backend already parses the attestation object, so the frontend now sends only the standard WebAuthn client-data and attestation payload. Registration is restricted to the backend-supported ES256 credential algorithm.
- Successful biometric login explicitly synchronizes the returned account wallet address into the frontend state before opening the authenticated dashboard.
- Added frontend regression assertions for real onboarding photography, removal of the onboarding logo image, gold action enforcement, stored-session resume, and the WebAuthn registration changes.
- No production financial, membership, package, withdrawal, ledger, or admin database rows were changed by this branch.
- CI remains the release gate before merge/deployment.


# 2026-10-05 — Onboarding gold + returning authentication checkpoint

- Verified that `main` had advanced beyond PR #28 and that the current production deploy was still the PR #28 commit; the repository contained PR #29/PR #30 work not yet represented in the live Render deployment.
- PR #30 was reviewed and merged after fixing its frontend regression-test assertion. Final CI run #778 passed both frontend and backend jobs.
- Onboarding now has explicit gold action styling for both primary and existing-member action groups, including hover states that previously could inherit blue/ghost styling.
- Onboarding hero visuals now use realistic financial/professional photography rather than the removed decorative coin/logo overlay stack. The official ZENIT logo remains available for branding and splash use.
- Returning-member phone login now validates the WebAuthn challenge response more defensively, uses required user verification with a bounded timeout, gives clearer cancellation/device-credential errors, restores the authenticated backend state, closes the login modal, and calls the existing dashboard startup path directly.
- No authentication architecture was replaced: wallet signature auth, backend JWT sessions, WebAuthn/passkeys, and PostgreSQL remain authoritative.
- Render deployment `dep-db1ml6h42hec73dddpkg` was triggered after CI because the service root is `backend` and production serves the frontend bundled by `backend/scripts/build.mjs`. Deployment verification is still pending while Render reports `build_in_progress`.
- Remaining acceptance: verify the live deployment serves the merged commit, inspect the actual onboarding HTML/CSS for gold actions and photography, and perform real-device WebAuthn acceptance. A successful CI run is not treated as proof of device biometric success.


# 2026-10-05 — Continued engineering checkpoint

- Confirmed PR #30's Render deployment is live before making the next repository cleanup.
- Audited the current onboarding source and removed an obsolete duplicate onboarding controller so only the active flow remains authoritative.
- Audited the returning WebAuthn architecture; it remains browser/platform WebAuthn with backend challenge verification and direct dashboard restoration. No private-key extraction or fake biometric layer exists.
- Audited Resend: configured `zenitprotocol.com` is present but verification is failed for DKIM and SPF records. No sender-domain changes were made without verified operator control.
- Triggered Render deployment `dep-db21aiss728c73an544g` for the cleanup commit. It remains `build_in_progress`; live verification is pending.

# 2026-10-05 — MailerSend free-domain email-provider checkpoint

- Added a provider-selectable transactional email path without changing ZENIT registration, email-verification token, wallet handoff, wallet authentication, or database architecture.
- backend/src/services/email.ts now supports both the existing Resend API and MailerSend's Email API, selected by EMAIL_PROVIDER.
- MailerSend sends to POST https://api.mailersend.com/v1/email and uses the provider's verified/trial-domain sender. The integration includes both HTML and plain-text bodies for verification and welcome messages.
- backend/src/routes/auth.ts now returns a controlled 503 configuration response when the selected email provider is not configured, instead of exposing provider-specific implementation errors.
- backend/.env.example documents EMAIL_PROVIDER, MAILERSEND_API_KEY, MAILERSEND_FROM, and MAILERSEND_FROM_NAME. No real API key or secret was committed.
- Added backend/tests/email.test.ts covering the MailerSend endpoint, authorization header, sender/recipient payload, verification subject/text, tags, and provider selection.
- MailerSend's current Sandbox mode provides a trial domain and supports testing without the operator owning a separate sending domain; account approval is needed to lift the Sandbox recipient restriction beyond the initial two recipients. The current free plan is 500 emails/month after approval.
- No MailerSend account was created or connected from the engineering environment, and no provider credential was added to Render. Production email therefore remains on the existing Resend configuration until the operator creates/approves the MailerSend account and supplies the API token and trial-domain sender.
- No production database rows or financial/member/admin records were changed.
- Next operator action for this branch: create/sign into MailerSend using the existing mailbox, copy the MailerSend trial-domain sender address, create an API token, then configure Render with EMAIL_PROVIDER=mailersend, MAILERSEND_API_KEY, MAILERSEND_FROM, and MAILERSEND_FROM_NAME=ZENIT Protocol. The existing Gmail address can remain the recipient for a real registration verification test.
- Release status: feature branch only; no merge or production deployment claimed at this checkpoint.

# 2026-10-05 — Email-provider regression checkpoint

- CI exposed a stale frontend trust assertion that still expected an onboarding image URL removed by the current approved onboarding imagery.
- Updated frontend/tests/trust-ui.test.mjs to assert the four current onboarding image sources used by the active zenitOnboardingBootstrap instead of the obsolete source.
- Preserved the trust-test purpose: the test still proves that onboarding contains the intended real imagery rather than removing the imagery assertion.
- Added email template regression coverage in backend/tests/email.test.ts confirming the verification payload contains the official ZENIT logo URL, official logo alt text, custom confirmation button markup, and MailerSend delivery endpoint when MailerSend is selected.
- Latest branch head is cfbd93b16b1709a05a70e715f7329c5ea8b4c2dc.
- CI run #798 is executing against that latest head; no green result is claimed until the run completes.
- No production deployment, production email-provider switch, production database mutation, or secret change occurred.

# 2026-10-05 — MailerSend SMTP relay integration checkpoint

- Added direct MailerSend SMTP relay support to the existing transactional email adapter.
- MailerSend transport now supports STARTTLS over port 587, TLS 1.2 minimum, bounded SMTP connection pooling, and connection/greeting/socket timeouts.
- The existing custom ZENIT HTML and plain-text templates are unchanged, including the official ZENIT logo URL, verification button, branding, and verification wording.
- MailerSend SMTP authentication uses dedicated Render environment variables:
  - MAILERSEND_SMTP_HOST
  - MAILERSEND_SMTP_PORT
  - MAILERSEND_SMTP_USER
  - MAILERSEND_SMTP_PASSWORD
  - MAILERSEND_FROM
  - MAILERSEND_FROM_NAME
- MAILERSEND_SMTP_PASSWORD is not committed to GitHub, logs, tests, or documentation.
- The SMTP username/password supplied during this engineering session was not written into the repository or Render environment. MailerSend's security guidance recommends resetting SMTP credentials when they have been shared in plain text; a fresh SMTP password should therefore be generated before production configuration.
- MailerSend requires the From address to match the verified/trial sending domain; the SMTP username itself is not the From address.
- Added Nodemailer 10.0.13 as the SMTP transport library. Nodemailer currently supports Node.js 20+, matching the backend runtime requirement.
- Added regression coverage for SMTP transport creation and the custom ZENIT template, including the official logo URL and Message-ID behavior.
- No production deployment, production email-provider switch, production database mutation, or secret update was performed.
- Latest implementation remains isolated in draft PR #31.


# 2026-10-05 — MailerSend SMTP CI correction checkpoint

- GitHub Actions run #815 exposed a TypeScript lint failure in `backend/src/services/email.ts`: `createHash` was used for the deterministic SMTP `Message-ID` but was not imported.
- Corrected the source by importing `createHash` from `node:crypto`; no authentication, database, provider-selection, or email-template behavior was otherwise changed.
- Frontend CI for the affected PR was already green in run #815; backend failed only at TypeScript lint before unit/integration stages could run.
- Fix commit: `d080938f7dc2fb7a5d6532ce2bfd36bc425d3599`.
- PR #31 remains open, draft, unmerged, and not deployed to Render production. No production environment variables, database rows, or email-provider settings were changed.
- The MailerSend API credential shared in chat is not present in repository files or Render configuration. It should be revoked/rotated before any use because it was exposed in chat.


# 2026-10-05 — MailerSend SMTP CI green checkpoint

- GitHub Actions **Zenit CI run #820** completed successfully on feature head `f0d0bdf95b706e6ff6db91d8700a89a8c0e95497`.
- Backend lint, admin-provisioning guard, migration application, unit tests, and the remaining backend gates completed successfully after the `createHash` import fix; frontend build, login regression, and trust-UI regression also passed.
- PR #31 remains draft, open, mergeable, and unmerged. It has not been deployed to Render production.
- No production database records, Render environment variables, email-provider settings, or production credentials were changed.
- The API token shared in chat remains intentionally unused; because it was exposed, it should be revoked/rotated before any future use.


# 2026-10-05 — CI/install parity checkpoint

- Changed the GitHub Actions backend dependency installation from `npm install` to `npm ci` so CI validates the backend lockfile using the same clean-install mode used by the Render production service. The frontend workflow remains on its existing `npm install` path because its lockfile currently has unrelated drift.
- Added regression coverage for all three email-provider paths now supported by the adapter: MailerSend SMTP, MailerSend API, and the existing Resend API.
- Removed an internal citation marker from repository documentation; source docs contain no chat-only citation syntax.
- No production deployment, Render environment change, database mutation, or secret update occurred.


# 2026-10-05 — CI lockfile drift checkpoint

- Backend `npm ci` passed on the MailerSend branch, confirming the backend lockfile is compatible with the new Nodemailer dependency.
- Frontend `npm ci` exposed pre-existing package-lock drift involving the existing Reown/WalletConnect dependency tree; this is unrelated to the MailerSend provider implementation.
- Restored the frontend CI install command to `npm install` to avoid expanding this feature into an unrelated frontend dependency refresh.
- Backend CI remains on `npm ci` to mirror Render's production install behavior.
- No production deployment, Render environment change, database mutation, or secret update occurred.


# 2026-10-05 — MailerSend release-gate validation checkpoint

- GitHub Actions **Zenit CI run #835** completed successfully on the latest feature head ac9d50e44c41296d15eb462671b1a8e01ddb7d8c.
- Backend validation passed with clean npm ci, TypeScript lint, automatic-admin provisioning guard, all migrations, unit tests, and integration tests.
- Frontend validation passed with its existing npm install, production build, login regression, and trust-UI regression.
- Email regression coverage now exercises MailerSend SMTP, MailerSend API, and the existing Resend API path.
- PR #31 remains draft/open/unmerged and has not been deployed to Render. Production remains on the existing live deployment in Royal's Workspace.
- No production environment variables, email-provider settings, secrets, database rows, or financial/member/admin records were changed.
