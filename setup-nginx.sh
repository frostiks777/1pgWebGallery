#!/bin/bash
# =============================================================================
# Скрипт настройки Nginx для Photo Gallery
# =============================================================================
# Запуск: sudo bash setup-nginx.sh
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Photo Gallery - Nginx Setup${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Пожалуйста, запустите скрипт с sudo:${NC}"
    echo "sudo bash setup-nginx.sh"
    exit 1
fi

# Запрос домена
read -p "Введите ваш домен (например, gallery.example.com): " DOMAIN
echo ""

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Ошибка: Домен не указан${NC}"
    exit 1
fi

# Проверка установки Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx не установлен. Устанавливаем...${NC}"
    apt update
    apt install -y nginx
fi

# Путь к проекту
PROJECT_PATH="/var/www/apps/photo-gallery"

if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${YELLOW}Директория проекта не найдена: $PROJECT_PATH${NC}"
    read -p "Введите путь к проекту: " PROJECT_PATH
    if [ ! -d "$PROJECT_PATH" ]; then
        echo -e "${RED}Ошибка: Директория не существует${NC}"
        exit 1
    fi
fi

# Создание конфигурации Nginx
echo -e "${GREEN}Создание конфигурации Nginx...${NC}"

cat > /etc/nginx/sites-available/photo-gallery << EOF
# Photo Gallery Nginx Configuration
# Generated for domain: $DOMAIN

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

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss image/svg+xml;

    # Root
    root $PROJECT_PATH/public;

    # Next.js static files
    location /_next/static/ {
        alias $PROJECT_PATH/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Demo photos
    location /demo-photos/ {
        alias $PROJECT_PATH/public/demo-photos/;
        expires 30d;
        access_log off;
    }

    # Static files
    location ~* \.(jpg|jpeg|png|gif|webp|ico|svg|woff|woff2)$ {
        expires 30d;
        access_log off;
    }

    # API routes
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

    # Main proxy
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

    # Security
    client_max_body_size 50M;
    server_tokens off;

    # Deny hidden files
    location ~ /\. {
        deny all;
    }
}
EOF

# Активация сайта
echo -e "${GREEN}Активация конфигурации...${NC}"
ln -sf /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/

# Удаление default сайта (опционально)
read -p "Удалить default сайт Nginx? (y/n): " REMOVE_DEFAULT
if [ "$REMOVE_DEFAULT" = "y" ]; then
    rm -f /etc/nginx/sites-enabled/default
    echo -e "${GREEN}Default сайт удален${NC}"
fi

# Проверка конфигурации
echo -e "${GREEN}Проверка конфигурации Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}Конфигурация корректна!${NC}"
else
    echo -e "${RED}Ошибка в конфигурации Nginx${NC}"
    exit 1
fi

# Перезапуск Nginx
echo -e "${GREEN}Перезапуск Nginx...${NC}"
systemctl reload nginx
systemctl enable nginx

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Nginx настроен успешно!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Сайт будет доступен по адресу: ${YELLOW}http://$DOMAIN${NC}"
echo ""

# Предложение настроить SSL
read -p "Настроить SSL сертификат (Let's Encrypt)? (y/n): " SETUP_SSL
if [ "$SETUP_SSL" = "y" ]; then
    if ! command -v certbot &> /dev/null; then
        echo -e "${YELLOW}Установка Certbot...${NC}"
        apt install -y certbot python3-certbot-nginx
    fi
    
    echo -e "${GREEN}Получение SSL сертификата...${NC}"
    certbot --nginx -d $DOMAIN -d www.$DOMAIN
    
    echo -e "${GREEN}SSL настроен!${NC}"
    echo -e "Сайт доступен по адресу: ${YELLOW}https://$DOMAIN${NC}"
fi

echo ""
echo -e "${YELLOW}Не забудьте:${NC}"
echo "1. Убедитесь, что DNS запись $DOMAIN указывает на этот сервер"
echo "2. Запустите Photo Gallery: systemctl start photo-gallery"
echo "3. Проверьте логи: tail -f /var/log/nginx/photo-gallery.access.log"
echo ""
