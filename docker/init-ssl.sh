#!/usr/bin/env bash
# Run this ONCE on a fresh EC2 to get the initial Let's Encrypt certificate.
# After that, the certbot container auto-renews.
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./init-ssl.sh your-subdomain.yourdomain.com"
  exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@$DOMAIN}"

echo "==> Getting initial SSL certificate for $DOMAIN..."

# Start nginx (HTTP only) for the ACME challenge
docker compose -f docker/docker-compose.prod.yml up -d nginx

# Request the certificate
docker compose -f docker/docker-compose.prod.yml run --rm certbot \
  certbot certonly --webroot -w /var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"

# Restart nginx to pick up the cert
docker compose -f docker/docker-compose.prod.yml restart nginx

echo "✅ SSL certificate obtained for $DOMAIN"
