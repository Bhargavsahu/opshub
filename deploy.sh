#!/usr/bin/env bash
set -euo pipefail

DOMAIN="opshub.boardify.space"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Loading environment..."
set -a; source .env.production; set +a

echo "==> Running database migrations..."
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..

echo "==> Seeding database (if empty)..."
cd backend
node --loader tsx/esm prisma/seed.ts 2>/dev/null || npx tsx prisma/seed.ts || echo "(seed skipped)"
cd ..

echo "==> Building and starting containers..."
export VITE_GOOGLE_CLIENT_ID="710620516333-8tb5sjd5h0ebujbmeoadnptq6ei7db1u.apps.googleusercontent.com"
docker compose -f docker/docker-compose.prod.yml up -d --build

echo "==> Health check..."
sleep 15
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✅ API is healthy"
elif curl -sf https://opshub.boardify.space/api/health > /dev/null 2>&1; then
  echo "✅ API is healthy (via nginx)"
else
  echo "❌ API health check failed"
  docker logs opshub-api --tail 30
  exit 1
fi

echo "==> Deploy complete! Site: https://$DOMAIN"
