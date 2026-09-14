# Production notes

The frontend is served as a Vite production build from `frontend/dist` and the backend is a separate Node/Express service.

Wallet authentication uses a short-lived backend nonce and EVM wallet signature verification. Reown AppKit supplies the client wallet connection. The backend issues a JWT-backed server session and persists the session in PostgreSQL.

Do not put private keys, seed phrases, JWT secrets, database passwords or Supabase secret/service-role keys in the frontend. Only public client configuration belongs in Vercel.

The backend-backed application does not fabricate balances or blockchain transaction hashes. In particular, a withdrawal request is recorded as `pending` for review; the API does not represent that request as a completed on-chain transfer.

Before enabling real-value settlement, define and independently review smart-contract addresses/ABIs, placement and payout economics, withdrawal approval/AML requirements where applicable, transaction signing/custody boundaries, chain confirmation/indexing, admin authorization, monitoring, backups and incident procedures.
