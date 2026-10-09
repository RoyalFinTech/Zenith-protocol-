# ZENIT Protocol — Engineering Handover for Next Chat

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

**Handover timestamp:** 2026-10-09 00:05 UTC (latest verification)
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
