## 2026-11-04 release — PIN-only returning login and registration without email verification (MERGED)

- User-authorized PR #46 was squash-merged into `main`. Merge commit: `283bc07517a75a08b9e7cb915e3177a43f061730`.
- Production Render service `srv-dajmafdg1s2s73ba8k5g` (Royal Workspace) is now live on commit `a3a302b78433bbd3c40e5fbb3ca7abb51b4cf5a0`, deploy `dep-dbll4hflk1mc73ce0fe0`. The process started and logged `Zenit API listening on 0.0.0.0:10000`. A first deployment attempt failed because `backend/scripts/build.mjs` still required removed pre-PIN UI phrases; those checks were updated to match the new PIN-only/restored-wallet contract. The corrected build then succeeded and Render marked the new deploy live.
- CI run #1239 passed on the PIN-only/email-free code commit; CI run #1241 passed on the production build-contract fix. Run #1241 now executes the complete production `npm run build` in backend CI (not only `node --check`), then runs migrations, unit tests and PostgreSQL integration tests. Frontend build/login/trust UI tests also passed.
- Returning wallet behavior: after validating any saved session, splash resumes only a current, explicitly timestamped first-registration handoff. Stale/legacy handoff tokens are cleared. With a restored wallet and no active PIN challenge, the app routes to the branded returning-member page and PIN flow instead of presenting new-user onboarding. A new member with a valid recent handoff resumes the registration wallet-connection step.
- PIN is the only active member sign-in factor. Biometric/passkey UI and post-login prompts were removed; backend `/api/auth/webauthn/*` endpoints return HTTP 410 while this feature is paused. Returning-member session creation is still gated by backend PIN verification. A wallet-only challenge cannot replace an existing PIN.
- Registration no longer requires email confirmation. The email field remains part of the member profile, subject to syntax and duplicate checks, but it is not a verification gate. Removed the unused email-verification sender implementation/tests and stale resend middleware. Registration completes on the signed wallet handoff; an integration test verifies `/api/me` works while `pending_registrations.verified_at` remains NULL. A best-effort welcome email remains asynchronous and cannot block registration.
- WhatsApp forgotten-PIN recovery remains implemented through MailerSend's WhatsApp API: E.164 phone normalization, one-time six-digit code, ten-minute expiry, attempt limits, PIN hash replacement after a valid code, old-session revocation and new-session creation. The public config exposes only `whatsappPinRecoveryEnabled` (boolean). It is enabled only when all three runtime settings are present: `MAILERSEND_API_KEY`, `MAILERSEND_WHATSAPP_FROM`, and `MAILERSEND_WHATSAPP_PIN_RESET_TEMPLATE_ID`. Unit tests cover the provider payload and unconfigured-provider behavior. **Live WhatsApp OTP delivery has not yet been demonstrated**; the deployed `/config/public` endpoint could not be reached from this session because external DNS resolution for the Render hostname failed. Do not assume delivery until the user tests “Forgot your PIN?” on the registered phone or runtime config is independently checked.
- Supabase project `fukvhfrqafudqwnnuimq` was ACTIVE_HEALTHY when checked. The member `royalfintech` is a `Member` with a verified BNB Smart Chain wallet binding, stored PIN hash in the expected scrypt format, zero failed PIN attempts and no active PIN lock. There was no active session or unexpired PIN challenge. No PIN/account/member/wallet/session/financial records were changed.
- Render health-check path remains blank (repository health endpoint is `/health`). An external HTTP probe of `/health` and `/config/public` could not be completed from this session due DNS resolution failure; the deploy record and Render startup logs were verified instead. Do not describe HTTP health probing as successful.
- Render's dependency-install log reported 9 npm audit findings (3 moderate, 3 high, 3 critical). No forced dependency upgrade was applied in this authentication release; track this as a separate dependency-security review.
- The user confirmed they do not control `zenitprotocol.com`; no DNS or Resend domain changes were made. No production financial, member, PIN, wallet or administrator records were edited.

---

## 2026-11-04 PIN validator defect corrected — CI green

- During development of this branch, the new branded PIN form's four-digit regex was initially double-escaped, which would have rejected normal PINs before calling `POST /api/auth/pin/verify`. This branch-only regression was caught and corrected before deployment; comparison confirms production `main` at SHA `d290b18be0523b48056184e764bc66a1f2367bcb` has the correctly escaped validator. An exact-source regression assertion now guards the new branch.
- Updated stale legacy assertions in `frontend/tests/trust-ui.test.mjs` that still required the old PIN recovery wording and passkey enrollment configuration. The current test suite now asserts the branded PIN-only UI instead.
- Source/test checkpoint `69dab1bcfde41d1a8d94d132394314dc83c4bfba` passed GitHub Actions run #1221: frontend build, login wiring, and trust/UI tests passed; backend lint, migrations, unit tests, and integration tests passed. Run: https://github.com/RoyalFinTech/Zenith-protocol-/actions/runs/41845445798.
- The branch PIN form now validates a normal four-digit PIN client-side before calling the existing backend verifier. This corrects a branch-only regression, not a proven explanation for the earlier production symptom. The actual user's PIN cannot be tested without the secret, which must not be disclosed. Database stored-hash format and account lock state were checked read-only; the missing recent PIN challenge means the earlier production failure still needs device-level tracing.
- PR #46 remains draft/open/unmerged and is not deployed. Production still runs SHA `d290b18be0523b48056184e764bc66a1f2367bcb`. User must authorize merging to `main` before the fix reaches the live app.

---

## 2026-11-04 read-only account and live-path findings

- Supabase project `fukvhfrqafudqwnnuimq` now reports `ACTIVE_HEALTHY` (eu-west-1, PostgreSQL 17.6). Read-only table and account queries succeeded.
- The only row in `public.app_users` is username `royalfintech`, role `Member`, wallet label `0xeDFe…aAe5`. It has a verified primary `wallet_accounts` row on chain ID 56 (BNB Smart Chain), a non-null PIN hash in the expected application scrypt format, zero PIN failures, and no current PIN lock. We did not read the hash itself or attempt to infer the PIN.
- There are two historical session rows but no currently active session. This is consistent with needing a new wallet-signature + PIN login, not with an already-authenticated dashboard session.
- There are zero unexpired/unused PIN challenges for this account. Its latest challenge was created 2026-10-14 21:34 UTC; none was created in the last 24 hours and failed-attempt count remains zero. The recent login attempt therefore has not been observed reaching challenge creation in this database. Possible causes include the production frontend/build/API path or wallet signature step not reaching this backend; a device-level trace is still required to isolate which.
- The matching `pending_registrations` record is consumed and expired, including its 10-minute wallet handoff. It is old registration history and does not block returning-user authentication.
- The member is eligible for the standard authenticated member dashboard after a fresh valid wallet signature and successful PIN verification. The database row has no separate suspended/disabled status field. However, the account has zero `matrix_memberships` and zero `package_purchases`, so matrix/program/package sections will remain empty until the member separately activates a package. Dashboard account existence is distinct from program participation.
- Supabase security advisor currently reports 27 public tables with RLS enabled but no policies (INFO-level `rls_enabled_no_policy` findings). No RLS or schema changes were made; the application currently uses the backend service/database path. Review this against the intended server-only access model before altering policies.
- Render service `srv-dajmafdg1s2s73ba8k5g` is still on branch `main`, deployment SHA `d290b18be0523b48056184e764bc66a1f2367bcb`. Its health-check path remains blank (expected repository endpoint: `/health`). Latest accessible app logs show startup on 2026-11-03; the queried request-log page returned no request rows, so logs did not provide a trace of the user's PIN attempts. No Render settings or production records were changed.
- PIN-only frontend/backend changes remain on draft PR #46 and are not live. Latest source/test commit before this documentation update was `3cbe6bd2203a4b9c70e5e1413c12d9e921948619`; CI runs #41844604276 and #41844617548 were still in progress when the account findings were recorded. Previous CI failures were caused by stale frontend assertions in `trust-ui.test.mjs`; they were updated to the new branded PIN-only UI. Do not mark CI green until the next run completes.
- Operator confirmed they do not own/control `zenitprotocol.com`; no DNS, Resend domain, or sender settings were touched. No PIN reset, wallet rebinding, session creation, account changes, or financial-data changes were performed.

---

## 2026-11-04 continuation — PIN-only returning login and onboarding QA (NOT DEPLOYED)

- Work continues on PR #46: https://github.com/RoyalFinTech/Zenith-protocol-/pull/46, branch `fix/pin-setup-bypass-guard-2026-10-30`. The branch remains draft/open/unmerged. The latest source/test commit at this update is `f6326422da940f9a86454466cb3363940c0f944f`; frontend/backend CI reruns #41843038668 and #41843047105 were still running/queued when recorded. Earlier test attempts failed in the frontend test step due to a malformed regex in the new test file; the latest test file was simplified and rerun. Do not record the new CI as green until these current runs complete.
- Returning-member UI now has a dedicated full-screen branded access page using the existing official asset `/zenit-logo.png`, with “ZENIT PROTOCOL · POWERED BY ROYAL FINTECH” branding. It probes the already-connected wallet first and avoids opening a second wallet selector when a connection is restored. The successful wallet signature opens the required PIN screen; it does not issue a returning-member session.
- PIN is now the only active sign-in verification method. The front end no longer contains biometric/passkey UI, WebAuthn calls, enrollment code, or post-login biometric prompts. The backend intercepts every `/api/auth/webauthn/*` request and returns HTTP 410 Gone. WebAuthn handlers, schema, and stored credentials are retained but unreachable so they can be deliberately restored later.
- A misleading Profile PIN panel was corrected: it previously described PIN as optional and said dashboard access did not depend on it, contradicting the backend. The panel, PIN-save confirmation, and return-user page now state that wallet ownership plus the four-digit PIN is required. Profile PIN change still uses an authenticated session and `POST /api/auth/pin/change`.
- Authentication contract reviewed in source: `/api/auth/verify` validates the wallet signature; a returning member receives a `pin_challenges` row and no token; `POST /api/auth/pin/verify` (or `/pin/setup` only when the account has no PIN) creates the session. New registration saves a PIN hash with a short-lived wallet handoff; a valid registration handoff creates the member account and initial session. Unrecognized wallets without a valid registration handoff remain rejected.
- Existing PIN setup hardening remains in place: `/api/auth/pin/setup` locks the challenge and user rows and returns 409 if a PIN already exists, preventing a wallet-only challenge from replacing an existing PIN.
- Supabase project `fukvhfrqafudqwnnuimq` remains `INACTIVE`. Database/table access has not been restored, so the specific account's wallet binding, PIN hash presence, role/status, package/membership prerequisites, and dashboard eligibility cannot yet be verified. No account reset, PIN reset, or data modification was attempted. Operator confirmed they do not own/control `zenitprotocol.com`; no DNS/Resend changes were made.
- Production remains on Render deployment SHA `d290b18be0523b48056184e764bc66a1f2367bcb`. PR #46 changes are not live. No database rows, sessions, wallet bindings, financial records, provider secrets, or Render settings were modified.
- Remaining acceptance gates: latest CI green; real-device returning-wallet → signature → PIN → dashboard test; new registration → wallet handoff → account/dashboard test; verify the user's specific Supabase account after DB reactivation; inspect any PIN hash mismatch or account state read-only before changing anything; responsive visual QA. Keep passkeys frozen until deliberately reopened.

---

## 2026-10-30 continuation — PIN setup hardening PR #46 and remaining acceptance gates

- PR #46: https://github.com/RoyalFinTech/Zenith-protocol-/pull/46. Branch `fix/pin-setup-bypass-guard-2026-10-30`, based on current `main`. CI #1167 and #1168 passed; latest #1168 is green. Draft/open, mergeable, not merged/deployed.
- Security review found `/api/auth/pin/setup` could be called with a wallet-only challenge even when a member already had a PIN. The endpoint now locks both challenge and app user rows and returns 409 if a PIN hash exists. Integration coverage confirms the old hash remains unchanged. No existing PIN can be overwritten through this wallet-only route.
- Returning-member contract: wallet signature creates challenge only; PIN verify creates session. First-time no-PIN setup is allowed only for a valid, unused, unexpired challenge. Passkeys/biometrics remain optional.
- Do not merge/deploy until explicitly authorized because Render auto-deploys `main`.
- Remaining manual/infrastructure gates: operator phone test of wallet → PIN → dashboard; browser permission and real push receipt; iOS Home Screen acceptance; mobile/tablet/desktop visual QA; Render `/health` setting (currently blank, repo expects `/health`); dependency vulnerability remediation; financial/membership integrity audit.
- Push source exists for package purchase/activation and withdrawal lifecycle notifications. Web Push VAPID configuration/actual delivery not verified. Browser/OS permission cannot be silently granted by application code.
- Resend domain `zenitprotocol.com` currently reports `failed` with DKIM, SPF MX/TXT and return-path CNAME records failing. Confirm domain ownership before modifying DNS; do not assume `ZinetProtocol.com` or any domain is controlled by the operator.
- Supabase project ref `fukvhfrqafudqwnnuimq` appears `INACTIVE`; read-only tables/advisors could not be retrieved (`Database is possibly not accessible at the moment`). Do not make integrity claims until authorized DB access is restored and queries succeed.
- Direct HTTP smoke tests failed at environment DNS resolution; no production HTTP success claim. Render connector confirms service live on `d290b18`, no setting changes made. No production records/secrets/settings were modified.

---

## 2026-10-29 continuation update — PIN gate merged and deployed

PR #43 (`https://github.com/RoyalFinTech/Zenith-protocol-/pull/43`) was squash-merged as `d290b18be0523b48056184e764bc66a1f2367bcb`. Render deployment `dep-dbhrkj7avr4c73and4vg` is **LIVE**. Build succeeded at 21:28:57 UTC; Render reported the service live at 21:29:49 UTC and logged `Zenit API listening on 0.0.0.0:10000`.

CI run #1143 passed frontend build, login-wiring and trust-UI tests; backend lint, admin-provision guard, bundle syntax guard, migrations, unit tests and integration tests passed on source/test checkpoint `1b9c4c8c58bfd69862a3d34bec3245b4790e8119`. The merge contains documentation-only changes after that tested source checkpoint.

The returning-member path now requires wallet signature plus backend PIN verification/setup before issuing an application session. No token or private profile payload is returned from the wallet-signature challenge endpoint. Unknown wallets without a valid registration handoff are rejected rather than silently inserted. The PIN modal cannot be skipped; passkeys/biometrics remain optional. Splash readiness is persisted and idempotent. The local SVG financial-workspace artwork and repository logo replacement are deployed, but visual acceptance on real phones/tablets is still pending.

**Important unverified items:** the available web-fetch tool cannot open the public homepage or `/health`, so direct HTTP smoke checks are not confirmed. The Render service health-check path is still blank while `render.yaml` says `/health`; the available Render connector does not provide a service-setting update action. Use the authorized Render dashboard/operator path for that targeted correction. Real-device acceptance of the actual registered wallet → PIN → dashboard flow remains required; do not claim the user journey is fully verified yet.

Render build logs reported 9 dependency vulnerabilities (3 moderate, 3 high, 3 critical); no forced dependency upgrades were applied. No production account, wallet, session, financial, membership, ledger, admin or Supabase records were intentionally changed.

**Next actions:** (1) ask the operator to test the deployed returning-wallet/PIN flow on their phone and report the exact screen/result; (2) correct the health-check path via Render dashboard; (3) perform responsive visual QA; (4) improve shared branded success/error status cards; (5) complete real-phone push notification delivery acceptance; (6) continue read-only financial/membership integrity audit. Never reset the existing account or alter production financial history for testing.


---

# ZENIT Protocol — Engineering Handover for Next Chat

## Registration failure incident — fixed and deployed — 2026-10-09 00:48 UTC

- **User-visible symptom:** the registration UI displayed `Registration failed` after the user confirmed the country picker and WhatsApp logo were fixed.
- **Production evidence:** Render application logs recorded `ZENIT registration request failed could not determine data type of parameter $3` twice at `2026-10-09T00:40:28.296926395Z` and `2026-10-09T00:40:44.664724086Z`. The failure occurred in `POST /api/auth/register/request` before a pending registration was inserted.
- **Source root cause:** `backend/src/routes/auth.ts` used optional parameter `$3` in `($3 is not null and whatsapp_number=$3)` in both the existing-account duplicate check and the pending-registration cleanup query. PostgreSQL could not infer the parameter's type for the statement.
- **Fix merged in PR #35:** https://github.com/RoyalFinTech/Zenith-protocol-/pull/35. Both predicates now explicitly cast the optional parameter to text: `($3::text is not null and whatsapp_number=$3::text)`. Optional WhatsApp stays optional; this does not alter email policy, PIN hashing, wallet-signature authentication, handoff/JWT handling, or session authorization.
- **Regression test:** added a PostgreSQL-backed integration test that submits `/api/auth/register/request` with `whatsappNumber: null`; asserts HTTP 202, email and wallet handoff fields, a persisted pending-registration row, scrypt PIN hash, hashed wallet-handoff token, and test-row cleanup in `finally`.
- **CI:** PR run #980 and post-merge main run **#982** passed (https://github.com/RoyalFinTech/Zenith-protocol-/actions/runs/37866445086). Frontend build/login/trust tests passed; backend lint, admin-provision safety guard, migration validation, unit tests, and PostgreSQL integration suite passed.
- **Render live verification:** Royal's Workspace (`tea-dadvf02d0e5s73eha320`), existing service `srv-dajmafdg1s2s73ba8k5g`, deployment `dep-db43ikf40ujc73e32vqg`, status `live`, runtime SHA `efce47fe85114c4b07b9e5e9ab5429f829b3c32c`, finished `2026-10-09T00:48:01.226686Z`. Build succeeded and logs report `Zenit API listening on 0.0.0.0:10000`; URL remains https://zenith-protocol-qvfe.onrender.com.
- **Current read-only production counts after deployment:** `app_users=0`, `pending_registrations=0`, `user_sessions=0`, `auth_nonces=0`, `wallet_accounts=0`. This confirms the failing attempts left no partial application-registration rows. No production account or financial/membership data was created, deleted, or rewritten.
- **Remaining acceptance gate:** ask the user to retry Create Account once against the live URL. Do not submit a test account or delete production rows. If it fails again, capture the exact visible error, corresponding UTC time, browser Network response from `POST /api/auth/register/request`, and fresh Render error logs before any additional change.
- **Other known infrastructure drift remains untouched:** Render root directory is still `backend` and service health-check path is blank; `render.yaml` expects `/health`. The registration fix does not change these settings. A direct external `/health` response body was not independently read through the connected web fetch, so do not claim that specific HTTP probe succeeded based only on startup logs.

---


## Verified WhatsApp picker + glyph release — 2026-10-09 00:21 UTC

- **PR #34 merged:** https://github.com/RoyalFinTech/Zenith-protocol-/pull/34. Production `main` release commit `78455dd0fb942bb12e4744e7a45ad9f7a45e1ca2` (`fix(frontend): harden WhatsApp country picker and glyph`).
- **CI passed:** PR run **#976** passed frontend and backend jobs for PR head `e8a538e35d1e5e8fc6ab49b8ba772c11b6ec41a2`; post-merge main run **#977** also passed both jobs for release commit `78455dd0fb942bb12e4744e7a45ad9f7a45e1ca2`. Frontend production build, login regression and trust-UI regression passed. Backend lint, automatic-admin provisioning guard, migrations, unit tests, and integration tests passed.
- **Render verified live:** Royal's Workspace (`tea-dadvf02d0e5s73eha320`), existing service `srv-dajmafdg1s2s73ba8k5g`, deployment `dep-db435srbc2fs73bbmuhg`, status `live`, runtime SHA `78455dd0fb942bb12e4744e7a45ad9f7a45e1ca2`; finished `2026-10-09T00:20:50.301804Z`. Render logs confirm successful build and `Zenit API listening on 0.0.0.0:10000`; production URL remains https://zenith-protocol-qvfe.onrender.com.
- **Root cause found from screenshot + source:** JavaScript contained 211 country records, but the registration HTML initially had only the static Pakistan option and relied on later inline JavaScript to populate the list. That leaves a Pakistan-only dropdown when the main initializer doesn't complete. The WhatsApp brand marks also depended on fetching `/whatsapp.svg`, consistent with the reported green-square-only rendering.
- **Focused fix now deployed:** all **211 country options** are delivered directly in the registration select, with per-option dial-code metadata; Pakistan remains selected by default (+92). A separate small fallback updates the displayed dial code and flag on change. The WhatsApp glyph is inlined as SVG in the five brand placements so the glyph no longer relies on the separate SVG request.
- **Regression protection:** `frontend/tests/trust-ui.test.mjs` asserts the static country-option count, Pakistan default, fallback handler and inline WhatsApp glyph. `backend/scripts/build.mjs` now fails a production build if the static HTML has fewer than 200 country options or the inline fallback/glyph contract is missing. This matters because the live Render service still uses `rootDir=backend`.
- **Browser acceptance is still pending:** the tool integration could verify the live deployment SHA/build/runtime logs but could not independently inspect the rendered page in the user's browser. Ask the operator to hard-refresh and verify the open picker contains all countries, the Pakistan flag appears, selecting Gambia or another country updates flag + dial code, and the WhatsApp glyph renders clearly. If either symptom persists, capture browser console/network/served markup before further changes.
- Render settings remain otherwise unchanged: root directory `backend`, build `npm ci && npm run build`, start `npm start`, health-check path blank. `render.yaml` still declares `rootDir: backend` and `healthCheckPath: /health`; permanent root-directory cleanup + health-path correction remain pending as an operator/dashboard gate.
- No production user/account, database, wallet/session, admin, financial, package, withdrawal, ledger or membership data was changed. Do not perform a test registration or data reset without operator intent.

---


## Current continuation verification — 2026-10-09 00:05 UTC

- Re-resolved GitHub `main` as `6d7ebbe6816d162bf67f05818795121eaf54d580`. GitHub Actions CI run **#970** (run ID `37862430654`) completed successfully at 2026-10-09 00:00:22 UTC for that exact commit; both `backend` and `frontend` jobs succeeded. This is verified CI for the parent commit, not automatically for this later documentation commit.
- Re-queried Render in **Royal's Workspace** (`tea-dadvf02d0e5s73eha320`). Existing service `Zenith-protocol-` (`srv-dajmafdg1s2s73ba8k5g`) remains on `main`, auto-deploy enabled, URL `https://zenith-protocol-qvfe.onrender.com`.
- Latest listed deployment remains `dep-db42kho473hc7382h9j0`, status `live`, runtime SHA `924a18099ce402c87ac276362f5140d4626b0a85`, finished `2026-10-08T23:43:50.537827Z`. It is the PR #33 WhatsApp country-picker release; newer main commits are documentation-only.
- Live Render service settings remain: root directory `backend`; build `npm ci && npm run build`; start `npm start`; health-check path blank. The current repository `render.yaml` also declares `rootDir: backend` and `healthCheckPath: /health`. For permanent root-directory cleanup, reconcile the service settings **and** `render.yaml` together: repository-root service directory with `cd backend && npm ci && npm run build` and `cd backend && npm start`, while setting health check to `/health`. The available Render connector exposes read operations but no service root-directory/health-path update operation; no settings were changed.
- **Earliest unresolved acceptance gate remains real-browser confirmation** of the country dropdown after hard refresh: full list, Pakistan default/flag, flag + dial-code changes for another country, clear WhatsApp glyph, and registration UI behavior. PR #32/#33 must not be repeated without new browser/served-bundle evidence. Source tests and a live deployment do not substitute for this acceptance.
- Real-device push delivery, operator-controlled MailerSend WhatsApp sender/templates/token scope, broader mobile/splash/returning-wallet acceptance, and the read-only financial/data-integrity audit remain open.
- This verification did not mutate application source, Render settings or environment variables, provider credentials, production database rows, wallet/session state, admin provisioning, or financial/membership records. Last-known clean-slate table counts were not re-queried and must not be treated as current. Do read-only counts before any test cleanup.
- Interactive browser/device acceptance and a live HTTP response-body probe could not be independently performed from this tool surface. Report those gates as pending until evidence is obtained.

---

**Handover timestamp:** 2026-10-09 00:48 UTC (registration failure fixed and deployed)
**Repository:** `RoyalFinTech/Zenith-protocol-`  
**Production branch:** `main`  
**Production Render workspace:** Royal's Workspace (`tea-dadvf02d0e5s73eha320`)

> Continue from this exact state. Read this file, then review the top sections of `ENGINEERING_PROGRESS.md` and `DEPLOYMENT_STATE.md` before making changes. Use repository source as the truth; do not rely only on prior chat summaries. Do not claim a fix is live unless Render shows the expected commit as `live`.

## 1. Current state at handover

## 1A. Fresh repository + Render verification — 2026-10-08 23:57 UTC

This section records a new read-only verification pass made for the requested next-chat handoff. It does not replace the detailed historical engineering record below.

- **Repository:** `RoyalFinTech/Zenith-protocol-`, default/production branch `main`. The pre-refresh main tip was `a4db4bf41380667263de1d68ff73fffe46c6bccf`; subsequent commits from this pass are Markdown-only changes to the three handoff/status files. Re-resolve HEAD at the start of the next chat.
- **Render workspace:** Royal's Workspace, ID `tea-dadvf02d0e5s73eha320`.
- **Render service:** `Zenith-protocol-`, ID `srv-dajmafdg1s2s73ba8k5g`, URL `https://zenith-protocol-qvfe.onrender.com`, dashboard `https://dashboard.render.com/web/srv-dajmafdg1s2s73ba8k5g`.
- **Latest deployment confirmed by the live service's deploy list:** `dep-db42kho473hc7382h9j0`; status `live`; runtime commit `924a18099ce402c87ac276362f5140d4626b0a85`; finished `2026-10-08T23:43:50.537827Z`. No newer deployment appeared in the list during this verification. Do not mistake newer Markdown commits on `main` for a new application runtime.
- **Current Render settings read from the service:** branch `main`; auto-deploy enabled on commits; root directory `backend`; build command `npm ci && npm run build`; start command `npm start`; health-check path is blank. Repository `render.yaml` specifies `/health`, and backend source implements `GET /health`. Root-directory and health-path drift are still unresolved.
- **CI evidence:** the prior handover records PR #33 run `#961`, main run `#962`, and latest main run `#964` as passed before that documentation checkpoint. This pass did not run a new build or test suite; all commits made here are documentation-only. Do not claim this refresh itself has fresh runtime test evidence.
- **Database safety boundary:** the last recorded 2026-10-08 production-slate checkpoint reported zero rows in the named user/auth/wallet/push/financial tables listed below, but this pass did not re-query Supabase and cannot guarantee the counts are unchanged. No database query, insert, delete, migration, wallet action, or admin provisioning was performed in this pass. Re-check with read-only counts before any data cleanup; never repeat a destructive reset merely to reproduce a prior test state.
- **No production runtime state was changed by this handoff refresh.** The three files being maintained are `ENGINEERING_PROGRESS.md`, `DEPLOYMENT_STATE.md`, and this handoff. The root-directory misconfiguration means documentation-only root changes do not trigger Render auto-deploy.


### GitHub and CI
- **Main tip observed before this refresh:** `a4db4bf41380667263de1d68ff73fffe46c6bccf` (`docs: link current engineering handoff and release gates`, 2026-10-08 23:54:16 UTC). It superseded `b24844e...` through documentation-only commits: `1fdac8d...` added this handoff, `d30d98b...` updated `ENGINEERING_PROGRESS.md`, and `a4db4bf...` updated `DEPLOYMENT_STATE.md`. This refresh also changes only Markdown. Resolve the live `main` HEAD again on the next chat rather than treating any prior docs SHA as the current tip.
- Runtime fix merged through **PR #33**: `924a18099ce402c87ac276362f5140d4626b0a85`.
- CI: PR run **#961** passed all frontend and backend gates; main-branch run **#962** passed for the PR #33 runtime merge; latest main run **#964** passed for commit `b24844e...`.
- The country-picker code change has been merged. Do not recreate the PR or revert it.

### Render production
- Service: `Zenith-protocol-`
- Service ID: `srv-dajmafdg1s2s73ba8k5g`
- Workspace ID: `tea-dadvf02d0e5s73eha320`
- URL: `https://zenith-protocol-qvfe.onrender.com`
- Render dashboard: `https://dashboard.render.com/web/srv-dajmafdg1s2s73ba8k5g`
- Branch: `main`; auto-deploy set to `yes`; root directory currently `backend`; build command `npm ci && npm run build`; start command `npm start`.
- Latest verified live deployment: **`dep-db42kho473hc7382h9j0`**, status `live`, runtime commit **`924a18099ce402c87ac276362f5140d4626b0a85`**, finished `2026-10-08T23:43:50.537827Z`.
- Render build script confirmed it builds and bundles the sibling frontend into `backend/frontend-dist` before serving. This deploy was triggered because PR #33 included a meaningful change under `backend/`.
- Do not confuse the latest documentation-only `main` SHA (`b24844e...`) with the latest deployed runtime SHA (`924a180...`). That distinction is expected; later commits only updated Markdown files.

### Production database / data safety
- Supabase project ref: `fukvhfrqafudqwnnuimq`.
- Backend auth is custom wallet-signature nonce/challenge + server JWT/session + hashed 4-digit PIN + WebAuthn/passkeys; do not replace it with Supabase Auth or invent alternate auth.
- The 2026-10-08 production-slate checkpoint recorded zero rows in the key tables: `app_users`, `admin_users`, `wallet_accounts`, `active_sessions`, `active_wallet_handoffs`, `webauthn_credentials`, `push_subscriptions`, `notifications`, `package_purchases`, `matrix_memberships`, `withdrawal_requests`, `ledger_transactions`, `pending_registrations`, and `pin_reset_challenges`. The WhatsApp/auth schema migration was applied without intentionally creating member or financial records. These are the last recorded counts, not a promise that nobody has registered since; re-check read-only counts before any future destructive operation.
- The picker/logo release made no database, wallet, authentication, package, withdrawal, ledger, membership or admin-state changes.
- First-admin provisioning remains intentionally operator-controlled. Never seed or create an admin automatically.

## 2. Recent country-picker / logo incident — what happened and what is fixed

The user repeatedly reported that the WhatsApp country-code dropdown displayed only Pakistan, the flag was missing, and the WhatsApp logo looked wrong. Three separate issues were found across the attempts:

1. **Initialization-order bug (PR #32):** the registration picker was called before `WHATSAPP_COUNTRIES` (`const`) and its helper functions were initialized. This threw a temporal-dead-zone `ReferenceError`, leaving only the static Pakistan fallback and potentially interrupting later frontend event wiring.
2. **Option markup bug (corrected in PR #33):** the first patch's string-builder for dynamic `<option>` markup was not reliably valid. PR #33 changed it to a template string producing valid HTML and added tests/build checks so a malformed generator or one-country list fails CI/build rather than shipping silently.
3. **Deployment/build-root bug:** Render's configured `rootDir=backend` means frontend-only commits can be ignored for auto-deploy purposes. PR #32 changed frontend files and was not deployed; Render continued to serve the old bundle. PR #33 included a meaningful backend build-script change, which triggered the deployment and brought the corrected frontend bundle live.

### Current picker implementation
- `frontend/index.html` owns the main UI and WhatsApp picker logic.
- Pakistan (`PK`, dial code `+92`) remains the first/default country.
- The list currently contains **211 country/territory entries**.
- The selected country flag uses image assets like `https://flagcdn.com/w40/pk.png`, with an emoji fallback if the image cannot load.
- The country code display updates on country selection; profile and PIN-recovery picker paths share the same helper set.
- `frontend/public/whatsapp.svg` now contains the WhatsApp brand glyph rendered as a white glyph on the green WhatsApp background styling. The UI enlarges and strengthens its green brand container so it is visible.
- `backend/scripts/build.mjs` includes a fail-closed contract validating a country list of at least 200 entries, that the registration picker binding follows helper initialization, that the flag helper is present, and that the WhatsApp SVG has the expected title/path. It validates the frontend artifact before copying it to `backend/frontend-dist`.
- Frontend regression tests check country list breadth, valid country option markup, initialization order and WhatsApp SVG; CI also checks the build script syntax.

### Relevant commits and release history
- PR #32 merge (picker helper/order and flag/logo updates): `9840698902798c7566634ef69bbed0b2dcd640f4`. CI passed but this was not the deployed bundle because only frontend/test paths changed.
- PR #33 merge (fix generated option markup; add bundle contract in `backend/scripts/build.mjs`): `924a18099ce402c87ac276362f5140d4626b0a85`.
- Render deployment `dep-db42kho473hc7382h9j0` confirmed `live` on PR #33 merge at 23:43:50 UTC.
- Documentation is now updated at the top of `ENGINEERING_PROGRESS.md` and `DEPLOYMENT_STATE.md`; keep those Markdown checkpoints current.

### Acceptance still needed
The live Render build is verified, but the next Chat should still ask the user to hard-refresh/close and reopen the app, then inspect the live registration form in a real browser/device. Confirm that selecting countries other than Pakistan changes the displayed flag and dial code, and that account creation still proceeds with WhatsApp both blank and filled (do not create production test accounts without operator intent). If the user still sees Pakistan-only options after a fresh reload, inspect the actual live response/cache and browser console rather than making another blind source patch.

## 3. Authentication and registration behavior — preserve this

- Email address remains mandatory for registration; **email verification was intentionally removed** as a registration gate because the user does not currently have a controlled, verified sender domain. Do not re-add email verification or block registration on Resend/MailerSend configuration.
- WhatsApp number is optional at registration. The user wants a friendly reminder if omitted, describing the usefulness for PIN recovery, with an option to continue without it.
- PIN recovery is only allowed when the requested WhatsApp number matches the number stored on an existing account. Unknown numbers must not receive usable recovery codes. Unknown identities result in non-verifiable challenges; the server is authoritative.
- Recovery uses a six-digit one-time code, then a new four-digit PIN and confirmation. A successful reset revokes old sessions and creates a fresh session. Rate-limits and audit events are implemented.
- User requested Pakistan first/default in country selection. Gambia (+220) may be in the country list, but must not be the default or placeholder.
- User wants the official WhatsApp logo/glyph, not a generic phone-like mark; the SVG and brand container updates have shipped in PR #33.
- The `Create Account` button previously had a separate failure: code called `internationalWhatsAppValid()` before that helper existed, causing a ReferenceError when a number was entered; availability checking could also block submission while waiting. A helper, delegated action wiring, and server-authoritative availability behavior were added and tested in commits around `9992d3c` and `6dd208e`. Do not regress this wiring.
- Registration uses a short-lived server-side pending registration and one-time wallet handoff token; the wallet signature remains the authentication boundary. Returning users must not be forced through new registration.
- Existing-wallet flow: splash → auth determination/onboarding → connect wallet/login or phone biometrics → authenticated dashboard. Successful WebAuthn/biometrics routes directly to dashboard.
- Wallet connector integration lives in `frontend/src/wallet-bridge.ts` and uses Reown AppKit/WagmiAdapter on BNB Smart Chain (chain 56); `/api/wallets/bind` remains backend controlled.
- Do not save PINs in browser registration drafts or localStorage.

## 4. Email and WhatsApp delivery configuration

- Email provider code remains in the backend (Resend/MailerSend API/SMTP) for future transactional messages, but email config must not block server boot or user registration. No sender domain is confirmed operator-owned and verified. Do not treat `zenitprotocol.com` as owned or `onrender.com` as a mail sender domain.
- MailerSend WhatsApp sending is implemented, but sending requires an enabled WhatsApp add-on, a connected WhatsApp Business sender, approved templates, and a token with `whatsapp_full` scope. Expected configuration includes `MAILERSEND_WHATSAPP_FROM`, `MAILERSEND_WHATSAPP_PIN_RESET_TEMPLATE_ID`, and `MAILERSEND_WHATSAPP_UPDATE_TEMPLATE_ID`.
- The user has not supplied/confirmed a sender identifier or the required approved templates yet. Do not invent sender IDs, templates, or API credentials; continue with safe placeholders/config documentation until the operator provides them.
- The user previously pasted email-provider credentials into chat. Do not repeat them, store them in Git/docs, or ask them to paste secrets again. Recommend revoking/rotating any credential that remains active and have the operator enter secrets directly in Render/MailerSend.

## 5. Project and design requirements

- Product: **ZENIT Protocol**, digital wealth/network app. Repository: `https://github.com/RoyalFinTech/Zenith-protocol-`.
- Primary style: premium dark + gold financial interface. Gold for primary actions; green only for semantic WhatsApp/connected/success states. Avoid changing unrelated styling while fixing bugs.
- Official logo path: `frontend/public/zenit-logo.png`.
- User asked for thorough quality checks across desktop, tablet, iPhone/Android, and modern browsers; mobile content must not overflow or overlap.
- They prefer exact root-cause analysis and end-to-end source testing over superficial patches. Report verified facts only and distinguish CI/source proof from real-device acceptance.
- No unnecessary redesign while debugging, and do not alter accounting/settlement/withdrawal logic when addressing frontend-only bugs.

## 6. Outstanding engineering queue — do next in this order

### P0 — Confirm user-visible country picker after live deployment
1. Re-read the top current entries of `ENGINEERING_PROGRESS.md` and `DEPLOYMENT_STATE.md`.
2. Verify GitHub `main`, Render service configuration and latest live deploy again. Expected runtime SHA is PR #33 merge `924a18099ce402c87ac276362f5140d4626b0a85`; later documentation-only commits can advance main without changing runtime.
3. Ask the user to hard-refresh or reopen `https://zenith-protocol-qvfe.onrender.com` and confirm the dropdown. They should see many countries in the open dropdown, a visible Pakistan flag, changed flag/code when selecting another country, and the WhatsApp glyph shown clearly.
4. If still wrong, gather browser console errors and verify the actual served frontend bundle/cache. Avoid repeating prior patches without new evidence.

### P1 — Permanent Render root-directory cleanup
- Current drift: Render service setting has `rootDir=backend`; this is why frontend-only commits didn't deploy.
- Desired service config: repository root as service root, build command `cd backend && npm ci && npm run build`, start command `cd backend && npm start` (or the equivalent accepted by Render with root directory at repo root).
- This requires changing the existing service configuration in the Render dashboard/operator interface; the available connected Render tool surface can read service details but does not expose a root-directory update operation.
- Before changing, inspect current config and plan a safe cutover. Do not create a duplicate service. Afterward, trigger/observe deploy and verify the same URL and health.

### P1 — Reconcile Render health-check drift
- Repository `render.yaml` says `healthCheckPath: /health`, while the actual service setting currently reads blank. Backend implements `GET /health`.
- Set/check the Render health path during the root-directory cleanup if possible; verify successful health checks without changing other unrelated production settings.

### P1 — Real-device push acceptance
- Push implementation and member self-test are in source. Actual production `push_subscriptions` was last recorded as 0 at the slate checkpoint, so no real phone delivery has yet been demonstrated.
- Test on a real supported device/browser with explicit permission, create the subscription, confirm backend persistence, use the authenticated self-test, and record that a notification actually arrives. Check iOS/iPadOS installed-web-app requirements as relevant. Do not claim accepted before device evidence.

### P1 — MailerSend WhatsApp sender setup
- Continue only after the operator supplies a legitimate sender identifier and configures approved templates/token scope in MailerSend. Then use a controlled account to test PIN recovery delivery and security-update template behavior.
- Confirm that unknown/non-matching numbers cannot receive an actionable reset and that registered number matching is exact after normalization.

### P2 — Financial/data integrity and release hygiene
- Continue the previously established read-only audit of package settlement, ledger, matrix, withdrawal idempotency, and historical-record integrity. Never rewrite old production financial or membership rows to make the current UI look consistent.
- Keep admin provisioning operator-authorized. No auto-admin creation.
- Review remaining accessibility/mobile/browser regressions and update docs after each meaningful gate.

## 7. Commands/checks the next Chat should use

From repository root, if a working checkout is available:
```bash
cd frontend
npm install --no-audit --no-fund
npm run build
npm run test:login
npm run test:trust-ui

cd ../backend
npm ci --no-audit --no-fund
npm run build
npm run lint
npm test
npm run test:integration
```
The backend build script already runs/bundles frontend into `backend/frontend-dist` and asserts the country picker contract. CI #961 (PR #33) and main CI #962 / latest main CI #964 are recorded successful at handover.

## 8. Change-management rules

- Preserve production branch `main`; use a focused branch + PR for code changes, review the diff, wait for CI and merge only once green.
- Never claim Render is live based only on a GitHub merge. Verify deployment status + deployed SHA in **Royal's Workspace**.
- Render currently ignores frontend-only commits due `rootDir=backend`; include a meaningful backend build/contract change only when it is genuinely required, and still pursue the permanent configuration cleanup.
- After each completed gate, update `ENGINEERING_PROGRESS.md` and `DEPLOYMENT_STATE.md`. Keep the newest status at the top and avoid leaving contradictory old checkpoints unqualified.
- Do not store secrets in the repository or this handover.
- Production user/database records are sensitive. Inspect read-only first and get explicit approval before destructive data actions.
- Current known open items are deployment/config/device acceptance and provider setup—not the just-merged country-picker code itself.

## 9. First message to the next ChatGPT

Continue the ZENIT Protocol engineering work from this handover. First verify current `main`, read the top of `ENGINEERING_PROGRESS.md` and `DEPLOYMENT_STATE.md`, and confirm Render's live deployment in Royal's Workspace. PR #33's WhatsApp country-picker fix is already deployed live on commit `924a18099ce402c87ac276362f5140d4626b0a85`; do not repeat its code changes. Help the user validate the visible picker after hard refresh, then prioritize permanent Render root-directory/health-check cleanup, real-device push acceptance, and WhatsApp sender setup while preserving wallet authentication and financial data integrity. Update both engineering Markdown files after each gate.


## 10. Additional frontend acceptance items from the user's continuing brief

Alongside the current country-picker acceptance gate, preserve the user's broader frontend requirements when validating the live site:

- The user previously reported mobile onboarding content that was oversized/overlapping, a splash screen that appeared absent, and uncertainty about the returning-member Connect Wallet/login route and its biometrics option. Verify the present source and real rendered behavior before deciding these are still broken or already fixed; do not implement mock wallet/auth flows.
- Returning users with an existing wallet should retain the intended login/biometrics path into the dashboard, while new users use the real backend registration/wallet-handoff flow. Do not regress the wallet signature/session boundary.
- The desired visual system is premium dark + gold, with gold primary actions and semantic green reserved for WhatsApp/success/connected states. Validate actual rendered button colors and spacing rather than relying on source descriptions. Check phone-sized layouts and desktop/tablet breakpoints without unnecessary redesign.
- Keep the current P0 country-picker test first: user must hard-refresh/reopen the live site, then confirm the open dropdown shows the full list, the visible image flag updates with selected country, the dial code changes, and the WhatsApp glyph is clear. If any symptom remains, collect browser console and served-bundle evidence before patching.
