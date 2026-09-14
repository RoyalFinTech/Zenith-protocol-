# Supabase migration source of truth

`supabase/migrations/20260913000000_zenit_production.sql` is the sole production schema source for ZENIT. Apply it to a newly created, empty Supabase PostgreSQL project.

The Node API uses `DATABASE_URL` and its own signed-wallet authentication. It does not use Supabase Auth, the client-side Supabase SDK, a service-role key, or direct browser access to database tables. The final migration revokes `anon` and `authenticated` table access for the API-owned tables.

Do not apply the obsolete `20260912` migrations or `db/migrations/001_initial_schema.sql` to the Supabase project; they are legacy schema paths and would conflict with the canonical production migration. An existing project with data needs a reviewed, explicit migration plan.
