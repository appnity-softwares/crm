#!/bin/bash
set -e

echo "========================================="
echo "   ERP-CRM VPS Initial Setup Script      "
echo "========================================="

# Ensure we're running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo ./vps-setup.sh)"
  exit 1
fi

# Define Domains
FRONTEND_DOMAIN="crm.appnity.cloud"
BACKEND_DOMAIN="crmapi.appnity.cloud"
PROJECT_DIR=$(pwd)

echo "Starting setup in $PROJECT_DIR"
echo "Frontend Domain: $FRONTEND_DOMAIN"
echo "Backend Domain: $BACKEND_DOMAIN"
sleep 2

# 0. Git Setup (ensure we are in a git repo tracking the right origin)
if [ ! -d ".git" ]; then
    echo "Initializing Git..."
    git init
    git remote add origin https://github.com/appnity-softwares/crm.git
fi

# 1. System Dependencies Setup
echo "Checking and installing dependencies..."
export PATH=$PATH:/snap/bin:/usr/local/go/bin
apt-get update -y

if ! command -v go &> /dev/null; then
    echo "Installing Go..."
    snap install go --classic
fi

if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
fi

# 2. Database Setup
echo "Setting up PostgreSQL Database..."
DB_NAME="erp_crm"
DB_USER="erpcrm_user"
DB_PASSWORD=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)

# Ensure postgres is running
systemctl start postgresql

# Check if role exists, create if not
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# Check if db exists, create if not
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Update password just in case user existed but we need new password for the env file
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# 3. Environment Setup
echo "Generating Backend Environment Configuration..."
JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
JWT_REFRESH=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

cat <<EOF > "$PROJECT_DIR/.env"
# Server
PORT=8084

# Database
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH
EOF

# 4. Backend Build & Service Setup
echo "Building Go Backend..."
go mod tidy
go build -o erpcrm_backend ./cmd/server

echo "Setting up Systemd Service..."
cat <<EOF > /etc/systemd/system/erpcrm.service
[Unit]
Description=ERP CRM Go Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/erpcrm_backend
Restart=always
RestartSec=5
EnvironmentFile=$PROJECT_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable erpcrm
systemctl restart erpcrm
echo "Backend service started & enabled on boot."

# 5. Frontend Build
echo "Cleaning old frontend build..."
rm -rf "$PROJECT_DIR/frontend/dist"

echo "Building Frontend..."
cd "$PROJECT_DIR/frontend"
npm install
export VITE_API_URL="https://$BACKEND_DOMAIN/api"
npm run build
cd "$PROJECT_DIR"

# 6. Nginx Configuration
echo "Setting up Nginx Configuration..."
NGINX_CONF="/etc/nginx/sites-available/erpcrm.conf"

cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name $FRONTEND_DOMAIN;
    
    location / {
        root $PROJECT_DIR/frontend/dist;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 80;
    server_name $BACKEND_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8084;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Allow CORS preflight requests (if not handled natively in Go)
        proxy_set_header Access-Control-Allow-Origin *;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
# Remove default nginx site if it exists to avoid conflicts
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

# 7. SSL / Certbot Setup
echo "Configuring SSL Certificates..."
# We use --register-unsafely-without-email for silent setup if email is blocked, 
# but providing a generic email is safer.
certbot --nginx -d "$FRONTEND_DOMAIN" -d "$BACKEND_DOMAIN" --non-interactive --agree-tos -m admin@appnity.cloud --redirect || echo "Certbot SSL issuance failed. Please check your DNS records."

echo "========================================="
echo "   Setup Complete!                       "
echo "========================================="
echo "Frontend: https://$FRONTEND_DOMAIN"
echo "Backend:  https://$BACKEND_DOMAIN"
echo "Your backend is running on local port 8084."
echo "Database credentials have been saved to $PROJECT_DIR/.env."
