# ZENIT QA report

## Fixed

- Frontend entry is now a Vite `index.html`; the old standalone HTML filename is removed.
- Backend now serves the Vite production `frontend/dist` build rather than raw source files.
- Frontend API base URL is environment-driven so Vercel can call the Render backend.
- Reown AppKit wallet connection is wired to the existing UI instead of pretending to connect locally.
- Wallet signature authentication remains server-verified with short-lived nonce challenges.
- Existing JWT sessions are checked against the server-side session table and can be revoked on logout.
- Supabase schema and backend identity model are aligned around `app_users`.
- Missing nonce/session tables are included in the canonical Supabase migration.
- Public Supabase Data API access is revoked for backend-owned tables and RLS is enabled.
- Demo balances, fake transaction hashes, fake participants and fake team records are removed from initial frontend state.
- Dashboard, referrals, transactions, team, matrix and profile data are hydrated from backend APIs after authentication.
- Referral regeneration now uses the backend.
- Withdrawal requests are server-side, balance-checked and recorded as `pending` with an audit event.
- CSV export is generated from the current backend-loaded transaction state.
- Render and Vercel deployment configuration is included.

## Verification limits

The container could not complete `npm ci` because the npm registry dependency download exceeded the execution window, and the offline cache was missing a required package tarball. Therefore a full dependency-resolved `npm run build`/`npm test` pass could not be honestly claimed here.

The inline browser JavaScript passed `node --check`. The backend TypeScript compile was re-run after fixes; remaining diagnostics were dependency/type-resolution failures because the required npm packages were not installed in the runtime, not the earlier syntax failure.

Before live testing, Render and Vercel will perform the real dependency installation and build. Treat a green deploy/build as the first environment-level QA gate.

## Known product boundary

The package does not implement or claim completed on-chain money settlement. The smart-contract address/ABI, transaction processor/indexer, custody model, withdrawal approval workflow and independent security review still have to be defined before real funds are enabled.
