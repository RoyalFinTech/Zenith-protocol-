## 2026-09-28 23:35 UTC — Onboarding wallet/biometric repair deployed

- Main is at `ecc983c2adf20161046fdc1e4aeb86a01bb618a2` after PR #16; pre-merge CI #660 and post-merge main CI #661 passed.
- Render deployment `dep-datfiorrjlhs73bku90g` is **live**, finished at 2026-09-28 23:35:31 UTC, on the same commit.
- The deployed change repairs the onboarding `CONNECT WALLET / LOGIN` path, fixes the undefined WebAuthn API-base reference, forces the returning-login modal animation frame, and opens the standard AppKit Connect view through the existing wallet bridge.
- Onboarding visual cleanup keeps the official logo asset, simplifies the existing gold coin stack, and preserves the established ZENIT dark/gold identity.
- The current backend authentication flow remains wallet nonce/signature verification followed by the existing PIN challenge; WebAuthn remains the separate phone-biometric/passkey path.
- Render service configuration still reports an empty `healthCheckPath` while repository `render.yaml` specifies `/health`; the endpoint exists in `backend/src/server.ts`, but the connected Render action surface still exposes no safe update operation for this setting.
- Resend testing is now explicitly supported through the development-only `npm run test:resend` utility using Resend's documented `resend.dev` test recipients. No production mailbox was contacted by the engineering tools.
- The current Resend domain record `zenitprotocol.com` remains failed/unverified; it is not used as evidence of domain ownership.
- Production financial state remains unchanged.

## Release gate audit — 2026-09-28 — post-PR #11 release gate audit

- `main` is now at merge commit `26eea6edf4a5a7a1ee489bd86a96cfb06b3409c0`; CI #629 passed.
- Supabase production security hardening is complete for the snapshot trigger search path. The production function reports `search_path=""`, and the corresponding Supabase security WARN is cleared.
- Render service ID `srv-dajmafdg1s2s73ba8k5g` still reports `healthCheckPath: ""`; repository `render.yaml` declares `healthCheckPath: /health`. Render's current app tool surface does not expose a health-path mutation, so this gate remains pending and no unrelated settings were changed.
- The latest Render deployment exposed through the service remains `dep-datcbiou01pc73f4jlgg` on commit `e0c4b687324b92793f5c38295b7b1ef1f063021d`; the post-merge `26eea6e...` commit is not yet reflected in the deployment list.
- Resend sender-domain status remains failed/unverified for the existing domain configuration; no delivery test was sent.
- Production push acceptance remains pending because there are currently zero registered device subscriptions; source service-worker handling is present, but physical phone delivery has not been proven.
- Production financial state remains unchanged by this audit.
# ZENIT Protocol — Deployment State

Last checked: 2026-09-28 16:55 UTC

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


## Deployment / engineering checkpoint — 2026-09-27 14:23 UTC

- Current validated feature head: `6cce8f5bbe2987447315ccc36f836397b9522319`.
- CI run #496 passed all backend and frontend gates, including database migration application and the snapshot immutability regression.
- Purchase settlement snapshots are now protected by a database trigger against post-creation mutation, and the trigger-only function is not executable by public/anonymous/authenticated Data API roles.
- Production Supabase remains unchanged and does not yet contain the five economics-snapshot columns from the feature migration.
- The two existing pending 2×6 Starter purchases remain 10.00000000 USDT; no production financial rows were changed.
- Feature branch remains un-deployed; Render `main` remains live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`.
- Live Render Health Check Path is blank while `render.yaml` declares `/health`; reconciliation remains pending.
- Real-device Web Push acceptance remains a release gate.
- Admin Security / first administrator provisioning remains intentionally **PENDING**.


## 2026-09-27 14:38 UTC — Purchase integrity + admin provisioning gate
- Feature branch purchase settlement integrity is validated through CI #499 and admin bootstrap cleanup through CI #501; both completed successfully.
- package_purchases now freezes settlement-critical identity and amount/asset fields together with the economics snapshot.
- Historical seeded administrator bootstrap is removed by a hash-specific cleanup migration; production currently has zero admin_users and zero historical seed email accounts.
- Production Supabase has not received the feature snapshot/immutability/cleanup migrations.
- Render production remains on main and was not deployed from this feature branch.
- Remaining release gates: real-device Web Push acceptance, Render health-check drift reconciliation, and intentional first-admin provisioning by an operator.


## 2026-09-27 15:35 UTC — Deployment/email state
- Render email configuration is live with production Resend sender settings.
- Resend has two published templates: `zenit-verify-email` and `zenit-welcome`.
- Resend domain verification is pending because DNS records are not yet present/verified outside the connected Resend account.
- Required DNS records are recorded in the engineering checkpoint and must be added at the authoritative DNS provider before the first real mailbox delivery test.
- The feature branch contains the one-time wallet handoff security hardening, branded verification error handling, and email delivery reliability changes; it has not been promoted to production.
- Remaining release gates: DNS verification + real mailbox delivery test, physical-device Web Push acceptance, health-check drift reconciliation, and operator-controlled first-admin provisioning.


## 2026-09-28 15:30 UTC — Correct production app origin / email-domain correction
- Confirmed the live Render application URL is `https://zenith-protocol-qvfe.onrender.com`; this URL is the application origin and the appropriate base for verification-link redirects and wallet handoff navigation.
- Updated Render production environment values for `APP_ORIGIN`, `CORS_ORIGINS`, and `WALLETCONNECT_METADATA_URL` to the live Render URL. Render automatically triggered deploy `dep-dat8glu0tbcc73aaefr0` on the existing `main` commit; at checkpoint time it was still `build_in_progress`.
- Corrected an earlier engineering assumption: `zenitprotocol.com` was not provided by the operator as an owned domain. It must not be treated as the production email domain, and no DNS changes should be requested for it.
- Resend domain `zenitprotocol.com` remains an isolated/unverified configuration and has not been used as evidence of production domain ownership. No domain removal was performed because Resend removal is irreversible and requires explicit operator confirmation.
- The Render `onrender.com` application URL can be used for web links/origin, but it is not a domain controlled by the operator and therefore is not being treated as the sender domain for production email verification.
- Production email remains gated on a sender domain that the operator actually controls and can verify in Resend. Resend's current Free tier supports 3 verified domains at no monthly cost; no paid upgrade is required for verification itself.
- Official logo usage remains unchanged; no SVG or replacement logo has been introduced.
- All future environment/domain records must distinguish **application origin** from **email sending domain** before configuration is applied.


## 2026-09-28 16:55 UTC — Current verified deployment/audit state
- Feature validation head: `92f58496d2fdbf254a1423018a7075d9dd715afc`; feature branch is unmerged and not deployed to production.
- CI #527 is green: backend lint, migration application, unit tests, integration tests, frontend build, frontend login tests, and automatic-admin provisioning guard all passed.
- Production Render remains configured to deploy `main` and is live on `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`. Live URL: `https://zenith-protocol-qvfe.onrender.com`.
- Render service configuration still reports a blank Health Check Path while `render.yaml` specifies `/health`; no production change was made because the available Render action surface does not expose a health-path update operation.
- Production Supabase migration history is unchanged through `20260927130737`. The four feature-only migrations remain pending and were not applied.
- Production read-only checks: 2 pending package purchases, 0 confirmed, 0 admin users, 0 push subscriptions, 0 active pending registrations.
- Production purchase rows remain untouched, including the existing historical amount mismatch described in earlier checkpoints.
- Resend has one pending/unverified domain configuration and two published templates; no outgoing email records exist. The templates are not wired to application runtime.
- No admin credentials were provisioned. No feature-branch deployment was triggered. No irreversible Resend domain/template deletion was performed.
- Operator actions remaining: provide/verify an actually controlled Resend sender domain, then perform one real mailbox delivery test; decide when to promote feature migrations; reconcile Render health-check drift; provision the first admin intentionally; review the PostgreSQL maintenance upgrade.


## 2026-09-28 16:57 UTC — Final validation checkpoint
- Current feature head: `e7aeed9491266793390ed35691b6e681cdee2895`.
- GitHub Actions CI #529 passed on the current head.
- Feature remains unmerged and not deployed to production.
- Production Render remains on main commit `1ad5c74a2f09cae92a8868bad4b13ad2e50f91ca`; production Supabase remains unchanged.


## 2026-09-28 — Package pricing verification and protection

- Read-only Supabase verification confirmed the current production package catalog is:
  - 2x4 Starter 10 USDT
  - 2x4 Growth 25 USDT
  - 2x4 Elite 50 USDT
  - 2x6 Starter 30 USDT
  - 2x6 Growth 60 USDT
  - 2x6 Elite 120 USDT
- Production `package_economics.entry_amount` matches those package prices and uses 20% direct / 70% matrix / 10% platform administration for each package.
- Production matrix distribution rules are 2x4 = 30/25/25/20 and 2x6 = 30/20/15/10/10/15.
- Two historical pending 2x6 Starter purchase intents remain at 10 USDT. No production records were changed. Those rows are not the current catalog price.
- The feature branch now rejects reuse of a pending purchase intent when its recorded amount differs from the current catalog price, preventing a stale historical intent from being silently presented as a current-price purchase.
- The feature branch purchase insert also fails closed when `package_economics.entry_amount` does not match `program_packages.price`.
- Canonical pricing and accounting rules are recorded in `docs/PACKAGE_ECONOMICS.md`.
- Release impact: feature branch only; no production deployment or migration was triggered by this pricing hardening checkpoint.


## 2026-09-28 — Pricing hardening CI validation
- Commit `46e67f1117e5d221b317a338088ea5dfb44932ec` passed GitHub Actions CI #532.
- CI validated database migrations, backend lint/unit/integration tests, frontend build, frontend login regression, and the automatic-admin provisioning guard.
- No production database rows or production deployment were changed by this checkpoint.


## Frontend visual redesign checkpoint — 2026-09-28
- Source-level frontend verification fixed and regression-covered two Admin-portal runtime-safety issues: the withdrawal action renderer and the delegated action listener's async declaration.

- Final brand pass also removes the remaining literal blue accents
- PWA browser/app chrome now uses the same dark-gold ZENIT theme and the official PNG icon remains the only manifest icon.
 from the staff/admin interface; the feature branch now uses the ZENIT gold family as the primary visual accent, with semantic green/red status colors preserved.

- The feature branch now contains the premium member-workspace redesign based on the approved reference direction.
- Official brand asset remains `frontend/public/zenit-logo.png`.
- Primary UI accent is the ZENIT gold family; green is reserved for genuine positive/connected status indicators.
- The redesign includes responsive 3D-style Dashboard, onboarding and Profile visuals, shared member-page styling, backend-driven package cards, Matrix economics sourced from the package catalog, masked wallet display/copy controls, backend-persistent profile photos, and corrected mobile navigation.
- These frontend changes are feature-branch only. Render production remains on `main` and has not been promoted to this design.
- No production database mutation was performed for the redesign.
- Current-head CI remains the release gate for this continuation; successful earlier runs do not certify commits made afterward.

- The current feature branch also contains the premium gold 3D Wallet command-center surface and gold-aligned package/withdrawal lifecycle status docks; these remain feature-only and are not in production.
