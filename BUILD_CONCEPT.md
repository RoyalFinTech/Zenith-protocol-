## 2026-11-04 PIN validator defect corrected — CI green

- Root cause found in the new branded PIN challenge page: the client-side four-digit PIN regex had been double-escaped during the UI insertion. The browser therefore rejected a normal four-digit PIN before sending `POST /api/auth/pin/verify`. Corrected `frontend/index.html` to use `/^\\d{4}$/` and added an exact-source regression assertion in `frontend/tests/login-wiring.test.mjs`.
- Updated stale legacy assertions in `frontend/tests/trust-ui.test.mjs` that still required the old PIN recovery wording and passkey enrollment configuration. The current test suite now asserts the branded PIN-only UI instead.
- Source/test checkpoint `69dab1bcfde41d1a8d94d132394314dc83c4bfba` passed GitHub Actions run #1221: frontend build, login wiring, and trust/UI tests passed; backend lint, migrations, unit tests, and integration tests passed. Run: https://github.com/RoyalFinTech/Zenith-protocol-/actions/runs/41845445798.
- The corrected flow now validates a normal four-digit PIN client-side before calling the existing backend verifier. This fixes a confirmed frontend blocker; actual user's PIN correctness remains untested because the PIN itself is secret and must not be disclosed. Database stored-hash format and account lock state have been checked read-only.
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

# ZENIT Protocol — Build Concept

## Current authentication operating mode — 2026-11-04

- Returning-member access is wallet ownership signature followed by a mandatory four-digit PIN. The API must not create an authenticated session for a returning user until `/api/auth/pin/verify` succeeds.
- A user without a PIN may set one only through a fresh, unexpired wallet challenge. An existing PIN cannot be replaced using the ordinary wallet-only PIN setup route; use an authenticated PIN change or the supported recovery route.
- New registration stores a one-way PIN hash in a pending registration record and requires a short-lived handoff token to bind that registration to the wallet. Unknown wallets without a valid handoff must not be auto-provisioned.
- Biometric/passkey sign-in is temporarily frozen: the frontend login/profile/enrollment/prompt paths are removed, and backend `/api/auth/webauthn/*` requests return HTTP 410. Related storage/handlers are retained for possible future reactivation, not available for current authentication.
- These changes are being reviewed on PR #46 and are not in production yet. Supabase project access is currently inactive; individual account eligibility must be verified read-only after access is restored.

---


## System shape

ZENIT is a production-oriented web application split into four responsibilities:

1. **Frontend**
   - Location: `frontend/`
   - Build: Vite
   - Deployment target: Vercel
   - Handles wallet connection/UI, member dashboards, package purchase UX, withdrawal UX, and authenticated API calls.
   - Does not contain database credentials or server secrets.

2. **Backend API**
   - Location: `backend/`
   - Runtime: Node.js + TypeScript + Express
   - Deployment target: Render web service `zenit-api`
   - Owns authentication, authorization, business rules, financial state transitions, ledger writes, audit logs, and blockchain verification.
   - Connects directly to Supabase PostgreSQL using `DATABASE_URL`.

3. **Database**
   - Supabase PostgreSQL project: `fukvhfrqafudqwnnuimq`
   - Backend-only access model.
   - Core tables have RLS enabled while public-facing database roles have no table grants; application access is enforced through the API layer.
   - Database constraints are treated as final financial integrity guards.

4. **Blockchain**
   - BNB Smart Chain, chain ID 56.
   - Primary settlement asset: USDT.
   - Package purchases are verified against on-chain `Transfer` events.
   - Withdrawal completion verifies an already-broadcast treasury payout transaction.
   - The backend does not hold or use a treasury private key.

## Authentication model

Wallet login:
`/api/auth/nonce` → wallet signature → `/api/auth/verify` → server session + JWT.

Session validation:
- JWT is verified with HS256.
- Middleware checks the backing `user_sessions` row, revocation, ownership, and expiry.
- Infrastructure/database failures are separated from invalid credentials.

PIN:
- Four-digit PIN.
- scrypt-derived hash with random salt.
- Failed attempts are tracked with temporary lockout.
- PIN challenge consumption is atomic.
- Successful PIN challenge consumption, lockout reset, and session creation are transactional.

WebAuthn:
- Challenge and credential tables in PostgreSQL.
- Registration validates origin, RP hash, user verification, and supported ES256 credential material.
- Credential IDs are insert-only.
- Registration challenge + credential creation are transactional.
- Login challenge, credential counter update, and session creation are transactional with row locking.
- Credential counter monotonicity protects against replay.

## Package purchase model

Package creation:
1. Authenticate the member.
2. Validate package and settlement asset.
3. Reject a second position in the same program.
4. Preflight matrix capacity only when creating a new purchase intent.
5. Reuse the member's existing pending purchase when appropriate.
6. Database uniqueness prevents concurrent duplicate pending intents.

Payment confirmation:
1. Verify purchase ownership and pending state.
2. Verify configured receiver and token metadata.
3. Reject reused transaction hashes.
4. Verify chain, sender wallet, USDT contract, receipt success, confirmation count, and exact Transfer event.
5. Start a database transaction.
6. Lock the purchase row.
7. Lock one available matrix node with `FOR UPDATE SKIP LOCKED`.
8. Create membership and activate the node.
9. Confirm the purchase and record settlement metadata.
10. Create idempotent deposit/direct/matrix ledger records.
11. Write an audit log.
12. Commit.

Settlement errors:
- Retryable validation failures remain `pending`.
- The human-readable reason is stored in `settlement_error`.
- Successful confirmation clears the error.
- Repeating the same confirmed transaction is idempotent.
- A different transaction for an already-confirmed purchase is rejected.

## Withdrawal model

Request:
1. Validate amount and EVM destination.
2. Lock the user row.
3. Calculate available balance using completed earnings minus reserved pending/completed withdrawals.
4. Create the withdrawal request and its pending ledger reservation in the same transaction.

Admin state machine:
`pending → approved/rejected`
`approved → processing/rejected`
`processing → failed`
`processing → completed` only through on-chain payout verification.

Completion verification:
- Requires `PAYOUT_SENDER_ADDRESS`.
- Verifies chain, treasury sender, USDT contract, receipt success, confirmations, exact destination, and exact token-unit amount.
- Requires the matching pending withdrawal ledger reservation.
- Finalizes the reservation and withdrawal atomically.
- Unique payout transaction hashes prevent duplicate payout recording.

No automatic treasury signing is implemented.

## Program/package activation model

Members choose one of two Starter entry paths:
- **2x4 Starter:** 10 USDT, 30 matrix positions, 4 levels.
- **2x6 Starter:** 30 USDT, 126 matrix positions, 6 levels.

The canonical package catalog is:
- 2x4 Starter: 10 USDT; Growth: 25 USDT; Elite: 50 USDT.
- 2x6 Starter: 30 USDT; Growth: 60 USDT; Elite: 120 USDT.
- Every confirmed purchase allocates 20% direct, 70% matrix, and 10% platform administration.
- Starter creates one matrix position; Growth upgrades the same position; Elite upgrades the same position.

The authenticated purchase flow sends the selected package code to the backend. Settlement verifies the exact on-chain USDT transfer, then atomically activates the first available node in the selected program and creates the matching active membership.

Both Starter packages use the established 20/70/10 allocation model. The configured matrix distributions are 2x4 = 30/25/25/20% across levels 1–4 and 2x6 = 30/20/15/10/10/15% across levels 1–6. Growth and Elite upgrades retain the existing matrix position and sponsor/referrer.

## Database integrity strategy

The application uses both:
- **Transactional row locking** for race-sensitive operations.
- **Database constraints/indexes** as final backstops.

Important invariants currently represented in production/source:
- One pending package purchase per user/package.
- Unique non-null package payment transaction hash.
- Unique non-null withdrawal payout transaction hash.
- One active membership per user/program.
- Unique matrix position per program.
- One matrix earning per purchase/recipient/level.
- Unique ledger reference.

Production integrity checks performed during this engineering cycle found zero violations for:
- active nodes without memberships
- active memberships without active nodes
- confirmed packages without deposit ledgers
- matrix earnings without ledger entries
- confirmed purchases without timestamps
- confirmed purchases without tx hashes
- completed withdrawals without completed ledger records
- active withdrawals without reservation records

## Email delivery model

- The backend generates the transactional Verification and Welcome email HTML and calls the Resend API server-side.
- Production sending uses `RESEND_API_KEY` + `RESEND_FROM`; a production sender must be an address on an operator-controlled, Resend-verified domain.
- The Render `onrender.com` hostname is the web application origin and can be used for links/assets such as verification redirects and `/zenit-logo.png`; it is not the operator's email-sender domain.
- During development, Resend provides provider-owned test mode. The repository includes `npm run test:resend` in `backend/`, which is guarded against `NODE_ENV=production` and can simulate delivered, bounced, and spam/complaint events using Resend's documented test recipients.
- The Resend test recipient `complained@resend.dev` simulates a message being marked as spam/complained; it does not prove that a message will physically land in a Gmail/Outlook Spam folder.
- The existing `zenitprotocol.com` Resend configuration is currently failed/unverified and is not treated as an owned production domain.

## Deployment model

### Render
The repository Blueprint defines:
- service: `zenit-api`
- root: `backend`
- build: `npm ci && npm run build`
- start: `npm start`
- health endpoint: `/health`
- auto deploy: enabled

The live Render service should still be treated as a separate deployment state from this security branch until an explicit merge/deploy.

### Frontend delivery
The current Render web service builds the frontend with the backend and serves the resulting production frontend from the Node service. Vite remains the frontend build tool, with output bundled into the backend's `frontend-dist` during the Render build.

### Supabase migrations
Production migration records were last verified through:
- `20260927114925 upgrade_package_lifecycle_and_admin`
- `20260927130432 push_notifications`
- `20260927130737 add_matrix_memberships_package_index`

The feature branch additionally contains the purchase-snapshot, snapshot-immutability, admin-bootstrap cleanup, and wallet-handoff hardening migrations that remain unpromoted to production.

## Engineering workflow

1. Inspect current production/schema state before changing financial behavior.
2. Patch the security branch first.
3. Add regression coverage for each new invariant.
4. Verify CI.
5. Update `ENGINEERING_PROGRESS.md`.
6. Keep production deployment separate until explicitly approved.
7. Never introduce treasury signing without a separately secured signer architecture.

## Current source of truth

- Engineering progress: `ENGINEERING_PROGRESS.md`
- This architecture/build map: `BUILD_CONCEPT.md`
- Active engineering branch: `feature/admin-control-center-and-package-lifecycle`
- Current feature PR: #9


## Package lifecycle and staff operations — 2026-09-27

The package model now supports one matrix position per user per program:
- Starter creates the position.
- Growth requires confirmed Starter in the same program and upgrades that position.
- Elite requires confirmed Growth in the same program and upgrades that position.
- Starter cannot be repurchased once a position exists.
- Referral codes are accepted only on Starter; later purchases retain the original sponsor.

Every confirmed purchase records 20% direct, 70% matrix, and 10% platform administration. Direct and matrix amounts are member liabilities; admin revenue, unallocated direct, and unallocated matrix are tracked separately in the platform revenue ledger.

Matrix placement uses the sponsor's active position as the search root, traverses binary descendants breadth-first by level/position, requires an active binary parent, and falls back to the first available position with a valid active parent (or the root). parent_node_id is the actual matrix relationship and is not derived from sponsor ancestry.

Staff administration is isolated from member wallet sessions through admin_users / admin_sessions, email/password authentication, lockout, server-side session validation, credential-change revocation, and protected /api/admin-portal/* analytics endpoints.

### Approved package catalog
- 2x4 Starter 10 USDT; Growth 25 USDT; Elite 50 USDT.
- 2x6 Starter 30 USDT; Growth 60 USDT; Elite 120 USDT.
- 2x4 distribution: 30/25/25/20% of the matrix pool by levels 1–4.
- 2x6 distribution: 30/20/15/10/10/15% of the matrix pool by levels 1–6.
