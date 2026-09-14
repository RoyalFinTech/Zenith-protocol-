# ZENIT deployment

## Supabase

Run `supabase/migrations/20260913000000_zenit_production.sql` in the Supabase SQL Editor. For the backend `DATABASE_URL`, use the PostgreSQL connection string from Supabase Dashboard → Connect. Supabase documents the Session pooler as the option for IPv4-only hosted environments.

## Render backend

Create a Render Web Service with root directory `backend`.

Build: `npm ci && npm run build`

Start: `npm start`

Health check: `/health`

Set these environment variables:

```text
NODE_ENV=production
DATABASE_URL=<Supabase PostgreSQL connection string>
JWT_SECRET=<long random server-only secret>
APP_ORIGIN=<Vercel frontend URL>
API_PUBLIC_URL=<Render backend URL>
CHAIN_ID=56
CHAIN_NAME=BNB Smart Chain
NATIVE_CURRENCY=BNB
PRIMARY_ASSET=USDT
WALLETCONNECT_PROJECT_ID=<Reown project ID>
WALLETCONNECT_METADATA_NAME=Zenit Protocol
WALLETCONNECT_METADATA_DESCRIPTION=Decentralized Wealth Network
WALLETCONNECT_METADATA_URL=<Vercel frontend URL>
WALLETCONNECT_METADATA_ICON=<public icon URL>
SESSION_TTL_MINUTES=10080
NONCE_TTL_MINUTES=10
CORS_ORIGINS=<Vercel frontend URL>
```

Never place `DATABASE_URL` or `JWT_SECRET` in the frontend.

## Vercel frontend

Create a Vercel project from this repository with root directory `frontend`.

Build: `npm install --no-audit --no-fund && npm run build`

Output: `dist`

Set:

```text
VITE_API_BASE_URL=<Render backend URL>
VITE_REOWN_PROJECT_ID=<Reown project ID>
```

## Admin

After the first wallet login creates an `app_users` row, promote the intended administrator from Supabase SQL Editor:

```sql
update public.app_users
set role='Admin', updated_at=now()
where wallet_address=lower('0xYOUR_WALLET_ADDRESS');
```

## Smoke test

1. Open the Vercel URL.
2. Connect an EVM wallet on BNB Smart Chain through Reown AppKit.
3. Sign the ZENIT login message.
4. Confirm backend-backed profile/dashboard data loads.
5. Confirm referral and matrix data come from PostgreSQL.
6. Attempt a withdrawal with zero available balance; it must be rejected.
7. Confirm Render `/health` reports database connectivity.

Real-value token settlement is intentionally not enabled by this package. Withdrawal requests remain pending until an independently defined and audited settlement process approves and executes them.
