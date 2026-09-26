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

### Vercel
Frontend deploys independently from `frontend/` using Vite output in `dist/`.

### Supabase migrations
Production currently contains migration records through:
- `20260926145028 package_payment_settlement_hardening_constraints`
- `20260926145451 withdrawal_payout_idempotency`
- `20260926175500 webauthn_challenge_user_index`

Repository migrations now include the corresponding settlement/payout history and the new WebAuthn index migration.

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
- Security branch: `security/atomic-auth-withdrawal`
- Draft PR: #7
