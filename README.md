# ZENIT Protocol

Production-oriented Vite frontend + Node/TypeScript API for the ZENIT Protocol application.

## Deployment

- Frontend: Vercel from `frontend/`, build `npm run build`, output `dist/`.
- Backend: Render Web Service from `backend/`, build `npm ci && npm run build`, start `npm start`.
- Database: Supabase PostgreSQL using the database connection string from Supabase.
- Wallet authentication: Reown AppKit / WalletConnect with BNB Smart Chain.

The frontend only stores the public API base URL and Reown project ID. JWT, database credentials and any server secrets remain backend-only.

## Database

Use the canonical migration `supabase/migrations/20260913000000_zenit_production.sql` for the current backend schema. Do not run superseded 20260912 ZENIT migrations from older revisions of this repository.

## Important production boundary

The application supports wallet-signature authentication, backend-backed profiles, referrals, matrix data, transactions and withdrawal-request creation. It does **not** claim that a withdrawal is paid on-chain. Real-value settlement still requires a separately deployed/audited smart contract, transaction processor, confirmation/indexing process and explicit withdrawal approval rules.
