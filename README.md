# ZENIT Protocol — Production Backend Foundation

This package is the production backend foundation for the uploaded ZENIT Protocol HTML application. The existing visual structure is preserved; the backend adds persistent identity, wallet verification, profile preferences, matrix/program data, transactions, withdrawals, notifications, activity, audit logs, and admin summary endpoints.

## Architecture

- `backend/` — Node.js + TypeScript API, PostgreSQL access, wallet-signature authentication.
- `db/migrations/` — standalone PostgreSQL schema for local/staging deployment.
- `supabase/migrations/` — Supabase-specific identity/policy foundation using `auth.users` and RLS.
- `frontend/zenit-protocol.html` — original uploaded UI, ready to be wired to the API.
- `docs/` — production integration notes.

## Local start

1. Copy `backend/.env.example` to `backend/.env` and set a real `JWT_SECRET` and future Reown/WALLETCONNECT project ID.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Apply `db/migrations/001_initial_schema.sql` with your PostgreSQL client.
4. From `backend/`: `npm install`, then `npm run dev`.
5. Open `http://localhost:8787/`.

## Wallet authentication

The backend uses a SIWE-shaped challenge: `/api/auth/nonce` creates a short-lived one-time message; `/api/auth/verify` verifies the wallet signature with `viem`, creates the user/session, and issues a signed JWT. The frontend should obtain the wallet address through Reown AppKit/WalletConnect and then use the backend challenge before treating the wallet as authenticated.

Do not put private keys, seed phrases, JWT secrets, database passwords, or Supabase secret/service-role keys into frontend code. Supabase's current guidance says exposed tables should have RLS, and service-role/secret keys must remain backend-only. See the official Supabase security guidance cited in `docs/production-notes.md`.

## Supabase migration

Create a Supabase project, run the SQL in `supabase/migrations/20260912000000_zenit_production_core.sql`, then extend the same auth-user model to the remaining transactional tables once the product rules are finalized. The Supabase CLI workflow is migration-based and supports `supabase db push` for deployment.

## Important production rule

The uploaded HTML contains sample balances, timestamps, transaction hashes, member names, and matrix counts. Those are intentionally not copied into the production database as truth. The backend starts with empty/real records and seeded program definitions only.
