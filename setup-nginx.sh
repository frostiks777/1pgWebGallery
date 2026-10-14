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

# -----------------------------------------------------------------------------
# Конфигурация: bootstrap для сертификата, затем настоящий nginx.conf
# -----------------------------------------------------------------------------
# nginx.conf содержит блок `listen 443 ssl` со ссылками на
# /etc/letsencrypt/live/<домен>/, поэтому `nginx -t` на нём падает, пока
# сертификата нет. Отсюда порядок: сначала минимальный HTTP-конфиг, чтобы
# certbot прошёл проверку домена, потом ставится настоящий конфиг.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "$REPO_DIR/nginx.conf" ]; then
    echo -e "${RED}Ошибка: не найден nginx.conf рядом со скриптом ($REPO_DIR)${NC}"
    exit 1
fi

install_site_conf() {
    cp "$REPO_DIR/nginx.conf" /etc/nginx/sites-available/photo-gallery
    sed -i "s/your-domain\.com/$DOMAIN/g" /etc/nginx/sites-available/photo-gallery
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN}Конфиг из nginx.conf установлен, домен: $DOMAIN${NC}"
    else
        echo -e "${RED}nginx -t не прошёл на конфиге из репозитория — смотрите вывод выше${NC}"
        exit 1
    fi
}

echo -e "${GREEN}Bootstrap-конфиг (только для получения сертификата)...${NC}"
cat > /etc/nginx/sites-available/photo-gallery << EOF
# Временный конфиг, только чтобы пройти проверку домена certbot'ом.
# Ниже он будет заменён полным nginx.conf из репозитория.
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF
nginx -t || { echo -e "${RED}Ошибка в конфигурации Nginx${NC}"; exit 1; }
systemctl reload nginx

# Каталог для кэша миниатюр — без него proxy_cache не стартует
install -d -m 755 -o www-data -g www-data /var/cache/nginx/images
echo -e "${GREEN}Каталог кэша создан: /var/cache/nginx/images (max_size=1g)${NC}"

# Ротация логов. Без пакета logrotate конфиг в /etc/logrotate.d/ не
# выполняется, и логи растут до конца диска (issue #9).
if ! command -v logrotate &> /dev/null; then
    echo -e "${YELLOW}logrotate не установлен. Устанавливаем...${NC}"
    apt update
    apt install -y logrotate
fi
if [ -f "$REPO_DIR/logrotate-photo-gallery.conf" ]; then
    cp "$REPO_DIR/logrotate-photo-gallery.conf" /etc/logrotate.d/photo-gallery
    chmod 644 /etc/logrotate.d/photo-gallery
    logrotate -d /etc/logrotate.d/photo-gallery >/dev/null 2>&1 \
        && echo -e "${GREEN}Ротация логов настроена${NC}" \
        || echo -e "${YELLOW}ВНИМАНИЕ: logrotate -d ругнулся, проверьте вручную${NC}"
else
    echo -e "${YELLOW}ВНИМАНИЕ: logrotate-photo-gallery.conf не найден, пропускаю${NC}"
fi

# Активация сайта
echo -e "${GREEN}Активация конфигурации...${NC}"
ln -sf /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/

# Удаление default сайта (опционально)
read -p "Удалить default сайт Nginx? (y/n): " REMOVE_DEFAULT
if [ "$REMOVE_DEFAULT" = "y" ]; then
    rm -f /etc/nginx/sites-enabled/default
    echo -e "${GREEN}Default сайт удален${NC}"
fi

systemctl enable nginx

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Bootstrap-конфиг установлен${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# SSL
read -p "Настроить SSL сертификат (Let's Encrypt)? (y/n): " SETUP_SSL
if [ "$SETUP_SSL" = "y" ]; then
    if ! command -v certbot &> /dev/null; then
        echo -e "${YELLOW}Установка Certbot...${NC}"
        apt install -y certbot python3-certbot-nginx
    fi

    echo -e "${GREEN}Получение SSL сертификата...${NC}"
    certbot --nginx -d $DOMAIN -d www.$DOMAIN
else
    echo -e "${YELLOW}SSL пропущен. Полный конфиг из nginx.conf ставится только"
    echo -e "  вместе с сертификатом: он ссылается на /etc/letsencrypt/live/$DOMAIN/,${NC}"
    echo -e "  и без сертификата nginx -t не пройдёт.${NC}"
    echo ""
    echo -e "  Получите сертификат (certbot certonly --webroot ...) и запустите"
    echo -e "  этот скрипт повторно — он поставит nginx.conf целиком.${NC}"
    exit 0
fi

# Сертификат есть — ставим настоящий конфиг вместо bootstrap
echo -e "${GREEN}Установка полного конфига из nginx.conf...${NC}"
install_site_conf

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Nginx настроен успешно!${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "Сайт доступен по адресу: ${YELLOW}https://$DOMAIN${NC}"
echo ""

echo -e "${YELLOW}Не забудьте:${NC}"
echo "1. Убедитесь, что DNS запись $DOMAIN указывает на этот сервер"
echo "2. Запустите Photo Gallery: systemctl start photo-gallery"
echo "3. Проверьте логи: tail -f /var/log/nginx/photo-gallery.access.log"
echo ""
