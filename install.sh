#!/bin/bash
# =============================================================================
# Photo Gallery - Автоматическая установка на Ubuntu 22
# =============================================================================
# Запуск: curl -fsSL https://raw.githubusercontent.com/frostiks777/1pgWebGallery/main/install.sh | sudo bash
# =============================================================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Photo Gallery - Установка на Ubuntu 22            ║"
echo "║                 WebDAV Cloud Photos Gallery                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Проверка root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Запустите с sudo: sudo bash install.sh${NC}"
    exit 1
fi

# Проверка Ubuntu
if [ ! -f /etc/lsb-release ]; then
    echo -e "${RED}Этот скрипт предназначен для Ubuntu${NC}"
    exit 1
fi

echo -e "${BLUE}[1/10] Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${BLUE}[2/10] Установка базовых пакетов...${NC}"
apt install -y curl git nginx certbot python3-certbot-nginx

echo -e "${BLUE}[3/10] Настройка firewall...${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw status

echo -e "${BLUE}[4/10] Добавление swap (2GB)...${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo -e "${GREEN}Swap добавлен${NC}"
else
    echo -e "${YELLOW}Swap уже существует${NC}"
fi

echo -e "${BLUE}[5/10] Установка Bun...${NC}"
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    ln -sf /root/.bun/bin/bun /usr/local/bin/bun
    ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx
fi

BUN_VERSION=$(bun --version 2>/dev/null || echo "unknown")
echo -e "${GREEN}Bun установлен: v${BUN_VERSION}${NC}"

echo -e "${BLUE}[6/10] Создание директории проекта...${NC}"
mkdir -p /var/www/apps
cd /var/www/apps

echo ""
read -p "Введите домен (например, gallery.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}Домен не указан. Используется localhost${NC}"
    DOMAIN="localhost"
fi

echo -e "${BLUE}[7/10] Клонирование проекта...${NC}"
if [ -d "photo-gallery" ]; then
    echo -e "${YELLOW}Директория существует. Обновление...${NC}"
    cd photo-gallery
    git pull
else
    git clone https://github.com/frostiks777/1pgWebGallery.git photo-gallery
    cd photo-gallery
fi

echo -e "${BLUE}[8/10] Установка зависимостей и сборка...${NC}"
bun install

if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo -e "${YELLOW}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ВАЖНО: Настройте WebDAV в файле .env.local"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  nano /var/www/apps/photo-gallery/.env.local"
    echo ""
    echo "Пример для Nextcloud:"
    echo "  WEBDAV_URL=https://cloud.example.com/remote.php/dav/files/username/"
    echo "  WEBDAV_USERNAME=your-username"
    echo "  WEBDAV_PASSWORD=your-app-password"
    echo -e "${NC}"
fi

echo -e "${YELLOW}Сборка проекта...${NC}"
NODE_OPTIONS="--max-old-space-size=4096" bunx next build

chown -R www-data:www-data /var/www/apps/photo-gallery
chmod -R 755 /var/www/apps/photo-gallery

echo -e "${BLUE}[9/10] Создание systemd сервиса...${NC}"
cat > /etc/systemd/system/photo-gallery.service << 'EOF'
[Unit]
Description=Photo Gallery - Next.js Application
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/apps/photo-gallery

Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="NODE_OPTIONS=--max-old-space-size=4096"
EnvironmentFile=/var/www/apps/photo-gallery/.env.local

ExecStart=/usr/local/bin/bunx next start -p 3000

Restart=on-failure
RestartSec=10
TimeoutStartSec=60
TimeoutStopSec=30

StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=photo-gallery

LimitNOFILE=65535
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${BLUE}[10/10] Настройка Nginx...${NC}"
cat > /etc/nginx/sites-available/photo-gallery << EOF
upstream photo_gallery {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    access_log /var/log/nginx/photo-gallery.access.log;
    error_log /var/log/nginx/photo-gallery.error.log;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss image/svg+xml;

    root /var/www/apps/photo-gallery/public;

    location /_next/static/ {
        alias /var/www/apps/photo-gallery/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /demo-photos/ {
        alias /var/www/apps/photo-gallery/public/demo-photos/;
        expires 30d;
        access_log off;
    }

    location ~* \.(jpg|jpeg|png|gif|webp|ico|svg|woff|woff2)$ {
        expires 30d;
        access_log off;
    }

    location /api/ {
        proxy_pass http://photo_gallery;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://photo_gallery;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    client_max_body_size 50M;
    server_tokens off;

    location ~ /\. {
        deny all;
    }
}
EOF

ln -sf /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

systemctl daemon-reload
systemctl enable photo-gallery
systemctl start photo-gallery
systemctl reload nginx

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║               УСТАНОВКА ЗАВЕРШЕНА!                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${YELLOW}Дальнейшие шаги:${NC}"
echo ""
echo "1. Настройте DNS: $DOMAIN → $(curl -s ifconfig.me)"
echo ""
echo "2. Настройте WebDAV:"
echo "   nano /var/www/apps/photo-gallery/.env.local"
echo ""
echo "3. Перезапустите:"
echo "   systemctl restart photo-gallery"
echo ""
echo "4. SSL сертификат:"
echo "   certbot --nginx -d $DOMAIN"
echo ""
echo -e "${GREEN}Сайт: http://$DOMAIN${NC}"
echo ""
echo "Команды:"
echo "  Статус:     systemctl status photo-gallery"
echo "  Логи:       journalctl -u photo-gallery -f"
echo "  Перезапуск: systemctl restart photo-gallery"
echo ""
