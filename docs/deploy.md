# Deployment Guide

## Prerequisites

- Ubuntu EC2 instance (t3.small or t3.micro with 1 GB swap)
- Elastic IP attached
- Security group: ports 22, 80, 443 open
- Docker + Docker Compose installed on EC2
- Domain/subdomain A record pointing to the Elastic IP
- Neon PostgreSQL database created

## EC2 Setup (one-time)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Add swap (if t3.micro with 1 GB RAM)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# Clone repo
git clone https://github.com/YOUR_USERNAME/opshub.git
cd opshub

# Create .env.production (never committed)
cp .env.production.example .env.production
# Edit with real Neon URLs, Google Client ID, JWT secrets, Gemini key

# Get initial SSL certificate
chmod +x docker/init-ssl.sh
./docker/init-ssl.sh your-subdomain.yourdomain.com

# Deploy
chmod +x deploy.sh
./deploy.sh
```

## Updating

```bash
ssh your-ec2
cd opshub
./deploy.sh
```

## Monitoring

```bash
docker logs opshub-api --tail 50 -f
docker logs opshub-nginx --tail 50 -f
curl https://your-subdomain.yourdomain.com/api/health
```

## SSL Renewal

Certbot container auto-renews. To test:

```bash
docker compose -f docker/docker-compose.prod.yml run --rm certbot certbot renew --dry-run
```
