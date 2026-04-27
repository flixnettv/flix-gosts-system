#!/bin/bash

# Configuration
DOMAIN="iptv1.qzz.io"
EMAIL="flixnettv@gmail.com"

echo "👻 Initializing Ghost System with Local Database on VPS..."

# 1. DNS Fix (Crucial for resolving get.coolify.io)
echo "🌐 Fixing DNS resolution..."
chattr -i /etc/resolv.conf 2>/dev/null
cat <<EOF > /etc/resolv.conf
nameserver 1.1.1.1
nameserver 8.8.8.8
EOF
chattr +i /etc/resolv.conf

# 2. Update and Prerequisites
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git jq software-properties-common ca-certificates gnupg lsb-release

# 3. Install Docker (Reliable way if Coolify one-liner has issues)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# 4. Install Coolify (Official One-liner)
echo "🚀 Attempting Coolify Installation..."
if curl -fsSL https://get.coolify.io | bash; then
    echo "✅ Coolify installed successfully."
else
    echo "⚠️ Coolify script failed. Proceeding with manual Docker Compose setup for the stack."
fi

# 5. Setup Certificates for Proxy
echo "🔐 Configuring SSL Certificates..."
mkdir -p /data/coolify/proxy/certs
cp ./tls.crt /data/coolify/proxy/certs/tls.crt 2>/dev/null
cp ./tls.key /data/coolify/proxy/certs/tls.key 2>/dev/null

# 6. Configure Traefik for Domain (Dynamic Configuration)
mkdir -p /data/coolify/proxy/dynamic
cat <<EOF > /data/coolify/proxy/dynamic/ghost.yaml
http:
  routers:
    ghost-secure:
      rule: "Host(\`${DOMAIN}\`)"
      tls: {}
      entryPoints:
        - websecure
      service: ghost-service

  services:
    ghost-service:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3000"

tls:
  stores:
    default:
      defaultCertificate:
        certFile: "/data/coolify/proxy/certs/tls.crt"
        keyFile: "/data/coolify/proxy/certs/tls.key"
EOF

# 7. Local Project Setup (Self-Hosted Database)
echo "🏗️ Preparing Self-Hosted Stack..."
mkdir -p /opt/ghost-system
cat <<EOF > /opt/ghost-system/.env
DATABASE_URL=postgresql://ghost:ghost_pass@db:5432/ghost_db
POSTGRES_USER=ghost
POSTGRES_PASSWORD=ghost_pass
POSTGRES_DB=ghost_db
TELEGRAM_BOT_TOKEN=
APP_URL=https://${DOMAIN}
NODE_ENV=production
EOF

# 8. Final Start Instruction
echo "✅ VPS Configuration Complete!"
echo "-------------------------------------------------------"
echo "Instructions to deploy:"
echo "1. Run the git-sync.sh script from your local machine/Termux."
echo "2. In Coolify, create a New Resource -> Docker Compose."
echo "3. Paste the content of /docker-compose.yml and add the .env variables."
echo "4. Connect the repository to Coolify for automatic deployments."
echo "-------------------------------------------------------"
echo "🔗 Domain check: https://${DOMAIN}"
