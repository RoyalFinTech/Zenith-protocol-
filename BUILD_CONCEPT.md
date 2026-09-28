# ZENIT Protocol — Build Concept

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
