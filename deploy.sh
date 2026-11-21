#!/usr/bin/env bash
set -euo pipefail

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building and starting containers..."
docker compose -f docker/docker-compose.prod.yml up -d --build

echo "==> Running database migrations..."
docker exec opshub-api npx prisma migrate deploy --schema=backend/prisma/schema.prisma

echo "==> Health check..."
sleep 3
if curl -sf http://localhost:3001/api/health > /dev/null; then
  echo "✅ API is healthy"
else
  echo "❌ API health check failed"
  docker logs opshub-api --tail 30
  exit 1
fi

echo "==> Deploy complete!"
