# Production notes

The uploaded UI currently declares itself frontend-only and shows wallet providers as visual options only. It also states that balances, hashes, participants and timestamps are frontend records. The new backend does not preserve those simulated values.

Reown AppKit is the current WalletConnect-compatible integration path for the frontend. The project ID belongs in an environment variable and the client can use EVM connectors for BNB Smart Chain.

Supabase production hardening requires RLS on exposed tables and keeping secret/service-role keys out of frontend code. The included Supabase migration demonstrates that pattern for profile/preferences/wallet tables.

Before real-value production operations are enabled, separately define and test: the actual ZENIT smart-contract addresses/ABIs, program placement rules, payout economics, withdrawal approval/AML rules where applicable, chain confirmations, transaction indexer/webhook source, admin authorization model, rate limits, monitoring, backups, and an independent security review.

The current placement endpoint records membership and an audit event only. It intentionally does not create a completed ledger entry or claim that any asset transfer has occurred.
