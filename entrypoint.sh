#!/bin/sh
set -e

SCHEMA="./prisma/schema.prisma"
MIGRATIONS_DIR="./prisma/migrations"

if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  echo "[zupu] running prisma migrate deploy..."

  set +e
  OUTPUT=$(node_modules/.bin/prisma migrate deploy --schema "$SCHEMA" 2>&1)
  EXIT_CODE=$?
  set -e

  echo "$OUTPUT"

  if [ $EXIT_CODE -ne 0 ]; then
    if echo "$OUTPUT" | grep -q "P3005"; then
      echo "[zupu] existing schema detected (P3005), baselining all migrations..."
      for dir in "$MIGRATIONS_DIR"/*/; do
        name=$(basename "$dir")
        echo "[zupu] marking as applied: $name"
        node_modules/.bin/prisma migrate resolve --applied "$name" --schema "$SCHEMA"
      done
      echo "[zupu] retrying prisma migrate deploy..."
      node_modules/.bin/prisma migrate deploy --schema "$SCHEMA"
    else
      exit $EXIT_CODE
    fi
  fi
else
  echo "[zupu] no migration files found, running prisma db push..."
  node_modules/.bin/prisma db push --schema "$SCHEMA" --skip-generate
fi

echo "[zupu] starting server..."
exec node server.js
