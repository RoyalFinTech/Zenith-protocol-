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
- `GET /me/notifications`
- `PATCH /me/notifications/:id/read`
- `PATCH /me/notifications/read-all`

### Admin portal
Admin session only:
- `POST /admin-portal/login`
- `GET /admin-portal/me`
- `POST /admin-portal/logout`
- `PATCH /admin-portal/credentials`
- `GET /admin-portal/overview`
- `GET /admin-portal/charts`
- `GET /admin-portal/users`
- `GET /admin-portal/purchases`
- `GET /admin-portal/revenue`
- `GET /admin-portal/withdrawals`
- `PATCH /admin-portal/withdrawals/:withdrawalId/status`
- `POST /admin-portal/withdrawals/:withdrawalId/complete`
- `GET /admin-portal/matrix`
- `GET /admin-portal/audit`

- `POST /referral/regenerate` — rotate the signed-in member's unique referral code.