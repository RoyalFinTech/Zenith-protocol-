# ZENIT Protocol — Deployment State

Last checked: 2026-09-27 12:41 UTC

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
- Commit: `be0ca3ab187d85e8e4f3130d460c9d1f15559061`
- Deploy ID: `dep-das379s56k3c73aks94g`
- Status at last check: `build_in_progress`
- GitHub CI run #342: `success`

### Drift / verification notes

- Repository `render.yaml` declares `healthCheckPath: /health`.
- Render service configuration currently reports an empty health-check path.
- This is configuration drift and remains pending reconciliation.
- The Render service is deployed from `main`; PR #7 security hardening has been merged to `main`.
- The security branch `security/atomic-auth-withdrawal` is no longer a release blocker.
- A direct browser-style health check could not be verified through the current web retrieval channel, so no claim is made about the live `/health` response.

## Supabase

Project: `fukvhfrqafudqwnnuimq`

Production migrations currently observed through:
- `20260926145028_package_payment_settlement_hardening_constraints`
- `20260926145451_withdrawal_payout_idempotency`
- `20260926174932_webauthn_challenge_user_index`

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
