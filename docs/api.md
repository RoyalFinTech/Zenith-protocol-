# Zenit API contract

Base path: `/api`

### Public
- `GET /config/public` — chain and Reown AppKit configuration.
- `POST /auth/nonce` — request a short-lived wallet login challenge.
- `POST /auth/verify` — verify the wallet signature and create a server session.

### Authenticated
Use `Authorization: Bearer <session-token>`.

- `POST /auth/logout`
- `GET /me`
- `PATCH /me/profile` — display name and avatar URL.
- `PATCH /me/preferences` — `theme`, `compactDensity`, `activityNotifications`, `reducedMotion`.
- `GET /wallets`
- `POST /wallets/bind` — bind the already-authenticated EVM address.
- `DELETE /wallets/:id`
- `GET /dashboard/summary`
- `GET /dashboard/team`
- `GET /dashboard/matrix/:programCode`
- `GET /dashboard/referrals`
- `GET /transactions`
- `POST /transactions/withdrawals`

### Admin
Admin role only:
- `GET /admin/summary`
- `GET /admin/audit-logs`

- `POST /referral/regenerate` — rotate the signed-in member's unique referral code.
- `POST /programs/:programCode/place` — atomically claim the next available matrix node; optional `referralCode` records the referrer. It does not initiate, settle, or represent an on-chain payment.
