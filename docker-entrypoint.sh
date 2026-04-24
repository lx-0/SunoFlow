#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
echo "Migrations complete."

if [ -n "$AUDIO_CACHE_DIR" ]; then
  mkdir -p "$AUDIO_CACHE_DIR" 2>/dev/null || true
  echo "Audio cache dir: $AUDIO_CACHE_DIR"
fi

echo "Starting server..."
exec node server.js
