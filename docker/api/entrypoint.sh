#!/bin/sh
set -eu

if [ "${DB_RESET:-false}" = "true" ]; then
  echo "[entrypoint] DB_RESET=true -> resetting database (drop + migrations + seed)"
  npm run db:reset:runtime
else
  echo "[entrypoint] DB_RESET=false -> skipping database reset"
fi

exec "$@"
