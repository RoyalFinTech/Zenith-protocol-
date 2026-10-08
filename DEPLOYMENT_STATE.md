# 2026-10-08 23:52 UTC — Handover / current release guard

- Handover instructions: `HANDOFF_NEXT_CHAT_2026-10-08.md` (repository root). It contains the end-to-end engineering context and ordered continuation plan.
- **Verified runtime live:** deployment `dep-db42kho473hc7382h9j0`, commit `924a18099ce402c87ac276362f5140d4626b0a85`, status `live` in Royal's Workspace. The current `main` may advance with docs-only commits; do not mistake those for a new runtime deployment.
- PR #33 CI run #961 and main run #962 passed; latest main CI run #964 passed before this documentation update. The picker/build-contract source has passed CI and the backend build included the corrected frontend bundle.
- Open release/config gates remain: real-browser visual acceptance after hard refresh; permanent Render root-directory correction (current root is `backend`, so frontend-only changes can be ignored by auto-deploy); Render health check currently blank while repository config declares `/health`; real-device push delivery; operator configuration of MailerSend WhatsApp sender/templates. First-admin provisioning remains operator controlled.

---

# 2026-10-08 23:44 UTC — WhatsApp country-picker fix confirmed live

- **Repository main:** `924a18099ce402c87ac276362f5140d4626b0a85` (PR #33)
- **Render workspace:** Royal's Workspace (`tea-dadvf02d0e5s73eha320`)
- **Render service:** `Zenith-protocol-` (`srv-dajmafdg1s2s73ba8k5g`)
- **Deployment:** `dep-db42kho473hc7382h9j0`, status `live`, finished at `2026-10-08T23:43:50Z`
- **CI:** PR run #961 passed; main run #962 passed.
- **Release correction:** fixed malformed country-option markup; Pakistan stays first/default; 211 country entries are retained; selected flags use image assets; the official WhatsApp glyph is bundled. The backend frontend-bundle step now asserts this contract to prevent silently shipping the one-option fallback.
- **Why the prior fix was not visible:** the live service's configured root directory is `backend`; Render skipped the frontend-only merge because paths outside that directory do not trigger an auto-deploy. The new release included a backend build-script contract change, which triggered a deployment.
- **Pending permanent infrastructure cleanup:** switch Render root directory to the repository root and update build/start commands to `cd backend && npm ci && npm run build` / `cd backend && npm start`. This setting cannot be updated through the currently available Render action interface, so it remains a dashboard/operator task. No unrelated Render setting was changed.

---

# 2026-10-08 — WhatsApp country picker / flag rendering release checkpoint

- **Repository:** `RoyalFinTech/Zenith-protocol-`
- **Main commit:** `9840698902798c7566634ef69bbed0b2dcd640f4` (PR #32 squash merge)
- **Render workspace:** Royal's Workspace (`tea-dadvf02d0e5s73eha320`)
- **Render service:** `Zenith-protocol-` (`srv-dajmafdg1s2s73ba8k5g`)
- **Branch / auto-deploy:** `main` / enabled
- **CI:** PR #32 workflow #951 completed successfully: frontend build + login/trust-UI tests and backend lint, migration validation, unit tests, and integration tests all passed.
- **Production source correction:** WhatsApp picker initialization order is fixed; Pakistan remains first/default; the broad country list is restored at runtime; selected flags render from image assets; WhatsApp logo uses the real brand glyph asset.
- **Render status at checkpoint:** no deployment for `9840698902798c7566634ef69bbed0b2dcd640f4` had appeared yet. Last confirmed live deployment: `dep-db3t05p42hec73ev2c70`, commit `8904345f6cde5e5211a23832d4c1d2f0e56de4d6`, status `live`.
- No manual deployment was triggered. Existing Render health-check drift (live setting blank vs repository `/health`) remains separate and unchanged.

---

# 2026-10-03 — Engineering hygiene + production-gate checkpoint

- Re-verified the production Render service in **Royal's workspace** (`tea-dadvf02d0e5s73eha320`): `Zenith-protocol-` tracks `main`, auto-deploy is enabled for commits, and the current live deployment is `dep-db06mk5ckfvc73chhkj0` from commit `d243938a4e196556f1822244df80e5237504056d`.
- Current GitHub `main` has advanced to `90e341197d72469226c6d80c4a0431288df866f7`; CI run #727 completed successfully.
- No open pull requests remain. Historical PRs #15, #17, and #18 were closed as superseded/stale with comments; no code from those PRs was promoted by this cleanup.
- Render configuration drift remains unresolved: the live service still reports a blank health-check path while repository `render.yaml` declares `/health`, and the backend exposes `GET /health`. The available Render action surface still does not expose a service health-path update operation, so no unrelated production setting was changed.
- Push infrastructure remains source-complete: `frontend/public/sw.js`, authenticated subscription registration, and the member **Test** action are present. Production read-only counts remain 3 application users, 0 admins, 0 push subscriptions, 0 active pending wallet handoffs, and 0 notifications at this checkpoint.
- Real-device push acceptance is still open. No request traffic was observed on the Render service during 2026-10-03 02:40–02:55 UTC, so no device test has been demonstrated through the service logs.
- No production financial, membership, package, withdrawal, ledger, or admin records were modified during this engineering phase.

---

# 2026-10-03 — Live push self-test release

- **Render workspace:** Royal's workspace (`tea-dadvf02d0e5s73eha320`)
- **Service:** `Zenith-protocol-` (`srv-dajmafdg1s2s73ba8k5g`)
- **Live deployment:** `dep-db06mk5ckfvc73chhkj0`
- **Live commit:** `d243938a4e196556f1822244df80e5237504056d` (PR #23 merge)
- **Status:** `live`, finished `2026-10-03 02:43:24 UTC`
- Build logs confirm `npm ci && npm run build` completed successfully, the frontend was bundled into `backend/frontend-dist`, and `npm start` launched `dist/server.js`.
- GitHub Actions CI run #719 passed backend and frontend gates before merge.
- Push self-test endpoint is now live at authenticated route `POST /api/me/push/test` and the member UI exposes the **Test** action when a push subscription exists.
- Production `push_subscriptions` count is currently 0, so actual phone-notification delivery remains unaccepted until a real device subscribes and receives the test.
- Existing Render health-check drift remains unchanged: service setting blank while repository `render.yaml` specifies `/health`.

---

# Current verified deployment checkpoint — 2026-10-03 02:35 UTC

- **Render workspace:** Royal's workspace (`tea-dadvf02d0e5s73eha320`)
- **Service:** `Zenith-protocol-` (`srv-dajmafdg1s2s73ba8k5g`)
- **Repository:** `https://github.com/RoyalFinTech/Zenith-protocol-`
- **Tracked branch:** `main`
- **Auto-deploy:** enabled, trigger `commit`
- **Current GitHub main:** `96a53c2865c44c5b0f27045e436cc7e148ecac39`
- **Live deployment:** `dep-datu5r2d0e5s73dho0s0`
- **Deployment status:** `live` (completed 2026-09-29 16:12:20 UTC)
- **Previous live deployment:** `ecc983c2adf20161046fdc1e4aeb86a01bb618a2` (PR #16), now deactivated.
- **Build/start:** `npm ci && npm run build` / `npm start`
- **Health-check drift:** Render's live service setting is blank while `render.yaml` specifies `/health`. The backend defines `GET /health`. This remains an operator/configuration reconciliation item, not a code-release failure.
- GitHub Actions CI run #707 passed for commit `96a53c2865c44c5b0f27045e436cc7e148ecac39`.
- Production push acceptance is not complete: Supabase currently has 0 `push_subscriptions`, so no real-device push delivery has been recorded.
- Production email acceptance is not complete because no operator-controlled verified sender domain/mailbox test has been completed.
- First-admin provisioning remains intentionally operator-controlled; current `admin_users` count is 0.

---

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


---

# 2026-10-05 — Current verified deployment state

- Render workspace: Royal's workspace (tea-dadvf02d0e5s73eha320)
- Service: Zenith-protocol- (srv-dajmafdg1s2s73ba8k5g)
- Repository: RoyalFinTech/Zenith-protocol-
- Tracked branch: main
- Auto-deploy: enabled, trigger commit
- Current main: 07182fe12f7030617df2e1187ad491ba11b727a1
- Live deployment: dep-db1bn2mq1p3s73f5iilg
- Deployment status: live, finished 2026-10-04 20:50:02 UTC
- Build/start: npm ci && npm run build / npm start
- CI: GitHub Actions run #736 passed backend and frontend jobs.
- PR #26: merged security regression test for unauthenticated push self-test access; no production data mutation.
- Health-check drift: live Render setting remains blank while repository render.yaml specifies /health; backend exposes GET /health.
- Push gate: implementation is live, but real-device subscription and native notification delivery remain unverified.
- Email gate: controlled sender-domain verification and real mailbox delivery remain pending.
- Admin gate: first-admin provisioning remains intentionally operator-controlled.


## 2026-10-05 — Onboarding/returning-auth feature checkpoint

- Current production baseline before this feature: main commit `36811318990c42bdf39b55c00242c8728958cfdf`.
- Render Royal's workspace remains the confirmed production workspace: `tea-dadvf02d0e5s73eha320`.
- Service remains `Zenith-protocol-` (`srv-dajmafdg1s2s73ba8k5g`) and the live deployment for commit `368113189...` is `dep-db1lta942hec73da7ni0`, status **live**, finished 2026-10-05 08:25:49 UTC.
- Feature branch `fix/onboarding-real-images-returning-auth-20261005` is not yet promoted to production at this checkpoint.
- The feature replaces the onboarding logo-as-art treatment with real office/financial photography, forces onboarding actions to the ZENIT gold system, resumes valid stored sessions directly into the dashboard after splash, and hardens phone WebAuthn registration so it does not require a browser-specific public-key accessor.
- Render builds the frontend from the repository's `frontend` directory during `backend/scripts/build.mjs`, so the next merged frontend change will be included in the production build when main deploys.
- No production database rows were modified by this feature branch.


# 2026-10-05 — PR #30 onboarding/returning-auth release checkpoint

- Re-verified GitHub `main`: merge commit `fc8ada9ffb33f67a57fab86573deab5513b0d29e` from PR #30.
- PR #30 hardened onboarding gold selectors, replaced onboarding visual overlays with realistic photography sources, added returning-member WebAuthn challenge validation/timeout/error handling, and routed successful biometric authentication directly to the dashboard.
- Initial CI runs for PR #30 exposed a regression-test assertion problem, not an application build/type failure. The regression assertion was corrected on the PR branch; final push CI run #778 completed successfully for the merged commit, with frontend and backend jobs successful.
- Render Royal's workspace service `Zenith-protocol-` is configured for `main`, auto-deploy enabled, rootDir `backend`. After CI verification, deployment `dep-db1ml6h42hec73dddpkg` was manually triggered to ensure the frontend bundled by the backend build is refreshed; at this checkpoint it remains `build_in_progress` and has not yet been called live.
- No production database/member/financial/admin records were changed by PR #30 or this deployment trigger.
- Live Render health-check drift remains unchanged: service configuration reports an empty health-check path while repository `render.yaml` declares `/health`; no unrelated configuration mutation was made.


# 2026-10-05 — Continued release verification checkpoint

- Verified the PR #30 runtime deployment is live in Royal's Workspace before continuing.
- Confirmed production Supabase remains a fresh slate: no app members, admins, wallet accounts, active sessions, WebAuthn credentials, push subscriptions, package purchases, matrix memberships, withdrawals, or ledger transactions were present at the verification point.
- Removed a dead duplicate onboarding controller from `frontend/index.html`; this does not alter the active onboarding flow. Commit: `4a9138b7a042ad1593549d6a087099a6b8a330fd`.
- Triggered Render deployment `dep-db21aiss728c73an544g` for that commit in the correct Royal Workspace. Current state: `build_in_progress`; therefore the cleanup is not yet declared live.
- Resend sender-domain audit: `zenitprotocol.com` exists in Resend but all reported DKIM/SPF records are currently failed. No DNS, domain, sender, or credential changes were made because ownership/control was not verified.

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


# 2026-10-05 — Registration confirmation + WhatsApp PIN recovery checkpoint

- Registration now captures a normalized international WhatsApp number and an explicit preference for important ZENIT account/security updates. The number is persisted through pending registration and wallet handoff into the member profile.
- Registration submission now shows a dedicated confirmation modal with the destination email and a 30-second resend countdown. Resend uses a dedicated server endpoint and does not require the PIN to be retained in browser storage.
- Returning-member login now exposes **FORGOT PIN / ACCESS HELP**. Recovery requires the registered WhatsApp number, a one-time 6-digit code, and creation of a new 4-digit PIN. Recovery challenges are short-lived, attempt-limited, one-time, and recovery revokes existing active sessions before issuing a fresh session.
- PIN recovery attempts are audited as account-security events. Recovery requests and verification are independently rate-limited.
- MailerSend WhatsApp delivery is implemented against its WhatsApp API. Production sending requires an enabled WhatsApp add-on, connected WhatsApp sender, approved template(s), and an API token with the `whatsapp_full` scope. The sender/template identifiers remain environment-configured and are not invented in source.
- A real WhatsApp brand SVG is included at `frontend/public/whatsapp.svg` and used in registration/profile/recovery UI.
- Important provider boundary: MailerSend cannot create the WhatsApp sender or approved templates through the current API. Those are operator-managed in the MailerSend dashboard.
- Current Render production has not been switched to MailerSend/WhatsApp because no fresh rotated credential, connected sender identifier, or approved template IDs have been configured. No production database records were changed.
- A test-file mistake briefly caused two automatic main-branch Render deploys; the file was immediately removed and the reverted main commit is the intended pre-feature source state. The feature itself remains on draft PR #31 only.


# 2026-10-05 — Final UX/auth hardening checkpoint

- Registration no longer persists a draft copy of the PIN in browser storage; resend uses the server-side pending registration and email address only.
- Legacy members without a registered WhatsApp number are prompted to complete recovery/update setup from the profile flow.
- Successful PIN recovery now refreshes the wallet bridge's in-memory auth token from local storage so subsequent wallet operations use the new session.
- MailerSend WhatsApp sender configuration documentation now accepts either the connected phone-number identifier or MailerSend sender ID, matching the provider API.
- No production database, Render environment, or provider credential changes were made.


# 2026-10-06 — Optional WhatsApp registration / PIN recovery checkpoint

- Feature branch feat/mailersend-email-provider-20261005 now treats registration WhatsApp as optional.
- The registration UI provides a professional security reminder when the user attempts to continue without WhatsApp; the user can add it immediately or continue without it.
- The reminder explicitly states that only the WhatsApp number stored on the account can be used for PIN recovery.
- Backend registration accepts null WhatsApp values and does not apply a uniqueness conflict check when no number is supplied.
- PIN recovery remains bound to app_users.whatsapp_number; an unrecognized number does not identify an account and cannot complete PIN recovery.
- This checkpoint is feature-branch only. Production main and Render Royal Workspace have not been changed by this work.


# 2026-10-08 — Production-first authentication checkpoint

- Removed the email-verification gate from the registration and wallet onboarding path.
- Email remains a required registration field, but registration no longer waits for a verification message or email callback.
- New registration receives a short-lived server-issued wallet handoff token directly and proceeds to wallet signature authentication.
- WhatsApp remains optional at registration, with the existing reminder and strict account-bound PIN recovery implementation retained.
- Resend/email-verification routes and their frontend callers were retired.
- Email provider configuration remains available for future transactional messages but no longer blocks backend startup or member registration.
- The additive WhatsApp/PIN recovery migration is still pending on production at this checkpoint; no production rows were changed by these code edits.
- Target production context remains Royal Workspace / Zenith-protocol- Render service on main.


# 2026-10-08 — Registration action and WhatsApp UX correction

- Production Create Account issue traced to an undefined WhatsApp validation helper referenced by the registration flow.
- Registration submit is now delegated through the main action handler and explicitly rendered as type="button".
- Added shared WhatsApp country selection with flags; Pakistan (+92) is first/default, Gambia remains available in the list.
- Replaced the Gambian phone placeholder with the Pakistan-local format and standardized E.164 composition across registration/profile/recovery.
- Replaced the low-contrast WhatsApp SVG with a visible green/white logo treatment.
- Added frontend regression coverage for the corrected registration action and WhatsApp selector.
- No production financial/member/admin rows were changed.


# 2026-10-08 — Create Account reliability hardening

- Removed the client-side availability check as a submission gate.
- Backend uniqueness validation remains authoritative; the UI now submits valid registration data directly and surfaces the backend response.
- Create Account remains explicitly type=button and delegated through the main action handler.
- No production data rows were changed.
