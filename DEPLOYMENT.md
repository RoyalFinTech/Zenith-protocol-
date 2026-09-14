# ZENIT deployment

## 1. Supabase

The existing Supabase project can be used for PostgreSQL. The project URL is a public client identifier; the backend does not need it for database access because it connects directly to Postgres.

In the Supabase Dashboard, open **Connect** and copy the PostgreSQL connection string. For an IPv4-only deployment such as a hosted container, Supabase documents the **Session pooler** as the compatible alternative to a direct IPv6 connection. Replace the password placeholder with the database password and URL-encode reserved password characters. See: https://supabase.com/docs/guides/database/connecting-to-postgres

Run the canonical migration:

`supabase/migrations/20260913000000_zenit_production.sql`

Run it in the Supabase SQL Editor, or through your normal Supabase migration workflow. Do not run the old 20260912 ZENIT migrations from previous revisions of this repository.

## 2. Render backend

Create a Render **Web Service** with root directory `backend`.

Build command:

`npm ci && npm run build`

Start command:

`npm start`

Health check path:

`/health`

Render supports a monorepo root directory and runs the configured build/start commands from that directory. See https://render.com/docs/your-first-deploy

Add these environment variables in Render:

- `NODE_ENV=production`
- `DATABASE_URL=<Supabase PostgreSQL connection string>`
- `JWT_SECRET=<long random server-only secret>`
- `APP_ORIGIN=<Vercel frontend URL>`
- `API_PUBLIC_URL=<Render backend URL>`
- `CHAIN_ID=56`
- `CHAIN_NAME=BNB Smart Chain`
- `NATIVE_CURRENCY=BNB`
- `PRIMARY_ASSET=USDT`
- `WALLETCONNECT_PROJECT_ID=<Reown project ID>`
- `WALLETCONNECT_METADATA_NAME=Zenit Protocol`
- `WALLETCONNECT_METADATA_DESCRIPTION=Decentralized Wealth Network`
- `WALLETCONNECT_METADATA_URL=<Vercel frontend URL>`
- `WALLETCONNECT_METADATA_ICON=<public icon URL>`
- `SESSION_TTL_MINUTES=10080`
- `NONCE_TTL_MINUTES=10`
- `CORS_ORIGINS=<Vercel frontend URL>`

Never put `DATABASE_URL` or `JWT_SECRET` into Vercel.

## 3. Vercel frontend

Create a Vercel project from the same repository and set its root directory to `frontend`.

Build command:

`npm install --no-audit --no-fund && npm run build`

Output directory:

`dist`

Add:

- `VITE_API_BASE_URL=<Render backend URL>`
- `VITE_REOWN_PROJECT_ID=<Reown project ID>`

These are client-side values. Do not add a database password, JWT secret, seed phrase, or private key.

## 4. First admin account

Connect a wallet once so the backend creates the member row. Then, from the Supabase SQL Editor, promote that exact wallet address:

`update public.app_users set role='Admin', updated_at=now() where wallet_address=lower('0xYOUR_WALLET_ADDRESS');`

Use the exact address you intend to administer from. Do not create an admin through an unauthenticated API route.

## 5. First test

1. Open the Vercel URL.
2. Connect an EVM wallet on BNB Smart Chain through Reown AppKit.
3. Sign the ZENIT login message.
4. Confirm the dashboard loads from the backend instead of demo values.
5. Confirm profile changes persist.
6. Confirm referral code comes from the database.
7. Confirm matrix nodes come from the database.
8. Attempt a withdrawal with a zero balance; it must be rejected for insufficient balance.
9. Confirm `/health` reports database connectivity.

Real-value token settlement is intentionally not enabled by this package. A withdrawal request is a pending database record until an independently defined and audited settlement process approves and executes it.
