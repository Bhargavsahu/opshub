#!/usr/bin/env bash
# Run this ONCE on a fresh EC2 to get the initial Let's Encrypt certificate.
# After that, the certbot container auto-renews.
set -euo pipefail

DOMAIN="${1:-opshub.boardify.space}"
EMAIL="${2:-admin@$DOMAIN}"

echo "==> Getting initial SSL certificate for $DOMAIN..."

# Use HTTP-only config for the ACME challenge
cp docker/nginx-http.conf docker/nginx-bootstrap.conf
docker compose -f docker/docker-compose.prod.yml up -d nginx --no-deps 2>/dev/null || true

# If nginx fails (no cert yet), start with HTTP-only config
docker run -d --name opshub-certbot-nginx \
  -p 80:80 \
  -v "$(pwd)/docker/nginx-http.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$(pwd)/docker/certbot/www:/var/www/certbot:ro" \
  nginx:1.27-alpine 2>/dev/null || true

sleep 2

# Request the certificate
docker run --rm \
  -v "$(pwd)/docker/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/docker/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"

# Clean up bootstrap nginx
docker stop opshub-certbot-nginx 2>/dev/null || true
docker rm opshub-certbot-nginx 2>/dev/null || true

echo "✅ SSL certificate obtained for $DOMAIN"
echo "Now run: ./deploy.sh"
