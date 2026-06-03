#!/bin/sh
set -e

SCHEMA="./prisma/schema.prisma"
MIGRATIONS_DIR="./prisma/migrations"

if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  echo "[zupu] running prisma migrate deploy..."
  node_modules/.bin/prisma migrate deploy --schema "$SCHEMA"
else
  echo "[zupu] no migration files found, running prisma db push..."
  node_modules/.bin/prisma db push --schema "$SCHEMA" --skip-generate
fi

echo "[zupu] starting server..."
exec node server.js
