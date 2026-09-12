#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
for file in db/migrations/*.sql; do echo "Applying $file"; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"; done
