# ZENIT Protocol — Deployment State

Last checked: 2026-09-26

## Render API

Service: `zenith-api`
Service ID: `srv-dajmafdg1s2s73ba8k5g`
URL: `https://zenith-protocol-qvfe.onrender.com`
Configured branch: `main`
Auto deploy: enabled
Root directory: `backend`
Build: `npm ci && npm run build`
Start: `npm start`
Region: Ohio
Plan: Free

### Live deployment observed

Latest live Render deployment observed during this engineering cycle:

- Deploy status: `live`
- Commit: `dbd1e7745b9a36d124cafc8999c18753928e25d8`
- Deploy ID: `dep-das2garncjis73e5cfog`

### Drift / verification notes

- Repository `render.yaml` declares `healthCheckPath: /health`.
- Render service configuration currently reports an empty health-check path.
- This is configuration drift and remains pending reconciliation.
- The Render service is deployed from `main`; PR #7 security hardening has been merged to `main`.
- The security branch `security/atomic-auth-withdrawal` is no longer a release blocker.
- A direct browser-style health check could not be verified through the current web retrieval channel, so no claim is made about the live `/health` response.

## Supabase

Project: `fukvhfrqafudqwnnuimq`

Production migrations currently observed through:
- `20260926145028_package_payment_settlement_hardening_constraints`
- `20260926145451_withdrawal_payout_idempotency`
- `20260926174932_webauthn_challenge_user_index`

Production financial integrity checks during this cycle reported no violations in the tracked package, matrix, ledger, or withdrawal invariants.

## Source-control state

Security branch:
`security/atomic-auth-withdrawal`

Draft PR:
`#7`

The branch contains the engineering hardening documented in `ENGINEERING_PROGRESS.md` and `BUILD_CONCEPT.md`.

## Release gate

Before promoting the security branch:
1. Obtain CI results for the actual current branch head.
2. Complete endpoint-level regression/integration coverage.
3. Reconcile Render health-check configuration.
4. Review deployment environment variables against the production configuration guards.
5. Review the final PR diff.
6. Deploy only the validated branch.
