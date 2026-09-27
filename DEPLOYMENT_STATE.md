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

Latest live Render deployment observed before the current release:
- Deploy status: `live`
- Commit: `f8ee8d4d49ab862d8e12bbaea4e1bbe0afcd5299`
- Deploy ID: `dep-das36ajtqb8s739ea8u0`

### Current release deployment
- Commit: `be0ca3ab187d85e8e4f3130d460c9d1f15559061`
- Deploy ID: `dep-das379s56k3c73aks94g`
- Status at last check: `build_in_progress`
- GitHub CI run #342: `success`

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

The dual-program Starter change is committed directly to `main` and is awaiting the Render deployment to finish. GitHub CI run #342 passed.

Before promoting the security branch:
1. Obtain CI results for the actual current branch head.
2. Complete endpoint-level regression/integration coverage.
3. Reconcile Render health-check configuration.
4. Review deployment environment variables against the production configuration guards.
5. Review the final PR diff.
6. Deploy only the validated branch.


## Admin Control Center / lifecycle release — 2026-09-27

Feature branch: feature/admin-control-center-and-package-lifecycle
Current feature head: d5692d5fd1eb547e708a6aee650b1c3bc106b555 (merge of current main with the feature fixes).

The original package lifecycle/admin implementation was already merged into main in merge commit 229aa82785d20c87b395bd35af1096c784f03dfd. The feature branch was then refreshed by merging that current main back into the feature branch so a new PR can contain only the follow-up fixes.

### Production safety
- No production database mutation was performed for this engineering validation.
- Production Supabase migration history was inspected and remains at the previously observed versions; the new lifecycle/admin migration has not been applied to production.
- No treasury private key or automatic signer was introduced.
- Render remains configured to auto-deploy from main; this feature branch has not been declared live.
- Existing Render health-check drift (render.yaml /health versus live service configuration previously observed as blank) remains unresolved unless separately verified.

### Release gate
1. Current-head CI must pass.
2. Review PR diff and migration ordering.
3. Create PR to main.
4. Merge only after CI/review is satisfactory.
5. Verify Render deployment status and live commit after merge.
