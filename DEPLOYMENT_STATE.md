# ZENIT Protocol — Deployment State

Last checked: 2026-09-27 14:19 UTC

## Render API

Service: `zenith-api`
Service ID: `srv-dajmafdg1s2s73ba8k5g`
URL: `https://zenith-protocol-qvfe.onrender.com`
Configured branch: `main`
Auto deploy: enabled
Root directory: `backend`
Build: `npm ci && npm run build`
Start: `npm start`
Region: Ohio
Plan: Free

### Live deployment observed

Latest live Render deployment observed before the current release:
- Deploy status: `live`
- Commit: `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`
- Deploy ID: `dep-dashbk3bc2fs73f91pig`
- This deployment finished live at 2026-09-27 13:12 UTC after the Render environment update.

### Current release deployment
- Feature branch is **not deployed**.
- Render `main` remains live on commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Live deployment observed: `dep-dashbk3bc2fs73f91pig`, status `live`, completed 2026-09-27 13:12 UTC after the Render environment update.
- Render VAPID environment configuration is present, but the live `main` code predates the feature-branch Web Push implementation; no live phone-push delivery claim is made.
- Current feature branch must pass its current-head CI and complete real-device acceptance before promotion.

### Drift / verification notes

- Repository `render.yaml` declares `healthCheckPath: /health`.
- Render service configuration currently reports an empty health-check path.
- This is configuration drift and remains pending reconciliation.
- The Render service is deployed from `main`; PR #7 security hardening has been merged to `main`.
- The security branch `security/atomic-auth-withdrawal` is no longer a release blocker.
- A direct browser-style health check could not be verified through the current web retrieval channel, so no claim is made about the live `/health` response.

## Supabase

Project: `fukvhfrqafudqwnnuimq`

Production migration history currently includes:
- `20260926145028_package_payment_settlement_hardening_constraints`
- `20260926145451_withdrawal_payout_idempotency`
- `20260926174932_webauthn_challenge_user_index`
- `20260926210429_enable_dual_starter_matrix_packages`
- `20260927114925_upgrade_package_lifecycle_and_admin`
- `20260927130432_push_notifications`
- `20260927130737_add_matrix_memberships_package_index`

Production financial integrity checks during this cycle reported no violations in the tracked package, matrix, ledger, or withdrawal invariants.

## Source-control state

Security branch:
`security/atomic-auth-withdrawal`

Draft PR:
`#7`

The branch contains the engineering hardening documented in `ENGINEERING_PROGRESS.md` and `BUILD_CONCEPT.md`.

## Release gate

The dual-program Starter change is committed directly to `main` and is awaiting the Render deployment to finish. GitHub CI run #342 passed.

Before promoting the security branch:
1. Obtain CI results for the actual current branch head.
2. Complete endpoint-level regression/integration coverage.
3. Reconcile Render health-check configuration.
4. Review deployment environment variables against the production configuration guards.
5. Review the final PR diff.
6. Deploy only the validated branch.


## Admin Control Center / lifecycle release — 2026-09-27

Feature branch: feature/admin-control-center-and-package-lifecycle
Current feature head: d5692d5fd1eb547e708a6aee650b1c3bc106b555 (merge of current main with the feature fixes).

The original package lifecycle/admin implementation was already merged into main in merge commit 229aa82785d20c87b395bd35af1096c784f03dfd. The feature branch was then refreshed by merging that current main back into the feature branch so a new PR can contain only the follow-up fixes.

### Production safety
- No production database mutation was performed for this engineering validation.
- Production Supabase migration history was inspected and remains at the previously observed versions; the new lifecycle/admin migration has not been applied to production.
- No treasury private key or automatic signer was introduced.
- Render remains configured to auto-deploy from main; this feature branch has not been declared live.
- Existing Render health-check drift (render.yaml /health versus live service configuration previously observed as blank) remains unresolved unless separately verified.

### Release gate
1. Current-head CI must pass.
2. Review PR diff and migration ordering.
3. Create PR to main.
4. Merge only after CI/review is satisfactory.
5. Verify Render deployment status and live commit after merge.


## Engineering continuation checkpoint — 2026-09-27 12:12 UTC

- Feature branch is being used as the working validation branch; production deployment is not being claimed for the continuation changes.
- Admin Security / first administrator provisioning is intentionally **PENDING**. Production `admin_users` currently has zero rows, and no privileged admin credential has been created by this continuation.
- Production inspection was read-only during this continuation.
- Current continuation changes include backend notification read APIs, backend-backed notification UI, reservation-aware member balance display, and removal of the obsolete duplicate matrix placement endpoint.
- CI for continuation head `0aaf4fd9ddc18d15758a58469f3325679369f982` was in progress at the checkpoint; deployment remains gated on CI and final review.
- Existing Render health-check configuration drift remains a separate pending infrastructure item.


## Current engineering checkpoint — 2026-09-27 12:41 UTC

- Latest continuation CI completed successfully for backend and frontend.
- Feature branch includes the notification-state, reservation-aware balance, duplicate placement removal, and matrix-capacity preflight fixes.
- Production deployment is NOT claimed for these continuation changes; Render deploys from main.
- Admin Security / first administrator provisioning remains PENDING.
- Production inspection during this cycle was read-only; no admin or financial production rows were created.
- Next release gates: review upgrade/settlement retry idempotency, reconcile stale deployment documentation, then decide whether the validated branch is ready for PR/release.


## Release checkpoint — 2026-09-27 12:43 UTC

- New admin withdrawal transition/completion APIs and frontend controls are on the feature branch and awaiting CI.
- Completion is verification-first: the staff UI cannot mark a withdrawal completed without an exact verified on-chain USDT payout.
- No production financial/admin rows were created by this continuation.
- Admin provisioning remains **PENDING**.
- Do not promote this continuation to production until CI and final accounting/state review pass.


## Engineering checkpoint — 2026-09-27 12:48 UTC

- Latest changes include payment-amount-based settlement accounting, shared admin withdrawal services, and expanded regression tests.
- Latest CI run #415 is queued/in progress; no production deployment is claimed for these changes.
- Production database remains untouched by this continuation.
- Admin Security / first administrator provisioning remains **PENDING**.


## Engineering checkpoint — 2026-09-27 12:50 UTC

- Latest accounting correction: pending earnings exclude withdrawal reservation ledger entries.
- Newest CI validation is still in progress.
- No production deployment is claimed for the feature branch.
- Admin Security / first administrator provisioning remains **PENDING**.


## Engineering checkpoint — 2026-09-27 12:52 UTC

- Lifecycle notifications are now generated by package and withdrawal events and consumed by the authenticated frontend notification center.
- Latest CI for the notification event changes is still in progress.
- Production remains untouched by this continuation.
- Admin Security / first administrator provisioning remains **PENDING**.


## Push notification release gate — 2026-09-27 13:10 UTC

- Feature branch: `feature/admin-control-center-and-package-lifecycle`.
- Production Supabase migration `20260927130000_push_notifications.sql` has been applied successfully.
- The new `push_subscriptions` table is RLS-protected and backend-owned; no public/anonymous grants were added.
- Production device delivery is **not yet enabled** because the VAPID subject/public/private key values must be provisioned as Render environment secrets. These values are intentionally not stored in GitHub or chat.
- The frontend now registers `/sw.js`, requests notification permission only from an explicit Enable action, supports installed iOS/iPadOS web apps, stores subscription material server-side, shows push status in the notification/profile UI, and removes the device registration on wallet logout.
- Real-device acceptance is still required before calling phone push delivery production-validated.
- Render continues to deploy from `main`; this feature branch is not being claimed live.
- Admin Security / first administrator provisioning remains **PENDING**.


## Engineering checkpoint — 2026-09-27 13:14 UTC

- Latest feature head: `b92654e11f2e6f9906bf2565d7ba9b46cdc8082e`.
- Current-head CI run #454 is in progress after correcting approved/processing withdrawal reservation accounting.
- Render `main` deployment `dep-dashbk3bc2fs73f91pig` is confirmed `live` on commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- The Render VAPID environment configuration is present, but the live `main` code does not yet include the feature-branch push implementation; no live push-delivery claim is made.
- Admin Security / first administrator provisioning remains **PENDING**.


## Engineering checkpoint — 2026-09-27 13:16 UTC

- Withdrawal reservation accounting was hardened so approved/processing payouts remain reserved.
- Package tier progression was hardened against repeat purchases and downgrades.
- New API and unit regressions are committed on the feature branch.
- Latest feature CI is still running; no feature-branch production release is claimed.
- Render main remains live on commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Admin Security / first administrator provisioning remains **PENDING**.


## Engineering checkpoint — 2026-09-27 13:17 UTC

- Member Earnings charts now use live authenticated ledger data rather than fixed illustrative values.
- Current feature branch is 72 commits ahead of `main`, with no branch divergence behind main.
- CI run #464 is still in progress for the latest frontend change.
- No feature-branch production release is claimed.
- Admin Security / first administrator provisioning remains **PENDING**.


## Current engineering checkpoint — 2026-09-27 13:25 UTC

- Current feature head: `383a8cce1e3cdc035caf84a001658ee3610ea5b5`.
- Feature branch is 78 commits ahead of `main` with no commits behind.
- CI runs #467 through #469 exposed the same backend regression introduced by the withdrawal-reservation assertion; the test was corrected to compare the dashboard reservation delta from a pre-test baseline.
- The pending-package response now returns the purchase's locked `amount` instead of the current catalog price, preventing payment instructions from changing when a catalog price changes while a purchase remains pending.
- Latest CI run #470 is in progress for the corrected test baseline.
- Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`; no feature-branch deployment is claimed.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Current engineering checkpoint — 2026-09-27 13:28 UTC

- Current feature head: `7c9ba098b183b574ad4e61c789a74a63c2eed959`.
- CI run #473 completed successfully for the current code head: backend lint/unit/integration and frontend build/login tests all passed.
- The CI regression was isolated to a malformed test authorization header in the approved-withdrawal double-spend regression; the test now spreads the authenticated header object correctly.
- Pending package purchases now return their locked purchase amount in the purchase response.
- Feature branch remains un-deployed; Render `main` is still live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Real-device Web Push acceptance remains a release gate, and Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Current engineering checkpoint — 2026-09-27 13:41 UTC

- Runtime feature head validated: `d6e618ca360559a166ff85f750c7be250005ad30`.
- CI run #481 passed backend lint, all backend unit tests, migration application, integration tests, frontend build, and frontend login tests.
- Package settlement economics are now snapshotted on each new purchase: package tier, direct/matrix/admin percentages, and matrix distribution rules.
- Existing package purchases are backfilled from their package economics where available; purchase amount remains the authoritative locked payment amount.
- Production currently has 2 pending package purchases and 0 confirmed package purchases; production data was inspected read-only and not modified by this continuation.
- The feature branch is not deployed. Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Real-device Web Push acceptance remains a release gate. Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Deployment / engineering checkpoint — 2026-09-27 14:04 UTC

- Current validated feature head: `c344de45d2fea27f85fb35eb26f890254c765cad`.
- CI run #488 passed backend lint, database migration application, backend unit tests, integration tests, frontend build, and frontend login tests.
- The package purchase route now captures the payment amount, package tier, allocation percentages, and matrix distribution rules in one atomic insert statement and rejects a preflight/insert catalog mismatch.
- The snapshot migration now verifies all existing purchases were backfilled before enforcing NOT NULL snapshot columns; migration validation is fail-closed.
- Production Supabase remains unchanged by this continuation. The two existing pending 2×6 Starter purchases remain 10.00000000 USDT despite the current 30.00000000 economics entry amount.
- Feature branch remains un-deployed. Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Live Render Health Check Path is still blank while repository `render.yaml` specifies `/health`; infrastructure reconciliation remains pending.
- Real-device Web Push acceptance remains a release gate.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## Deployment / engineering checkpoint — 2026-09-27 14:19 UTC

- Current validated feature head: `19f6a13089a488d41ddd60680cd0e1fd41c60375`.
- CI run #491 passed all backend and frontend gates, including the new package confirmation idempotency regression.
- Package confirmation retries now require the submitted transaction hash to match the transaction already recorded on a confirmed purchase; a different hash is rejected with HTTP 409.
- Production Supabase remains unchanged and does not yet contain the five economics-snapshot columns from the feature migration.
- The two existing pending 2×6 Starter purchases remain 10.00000000 USDT; no production financial rows were changed.
- Feature branch remains un-deployed; Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Live Render Health Check Path is blank while `render.yaml` declares `/health`; reconciliation remains pending.
- Real-device Web Push acceptance remains a release gate.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.
