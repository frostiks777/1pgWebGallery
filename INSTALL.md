# 📖 Пошаговая установка Photo Gallery на Ubuntu 22

## 📋 Требования

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 ядро | 2 ядра |
| Disk | 2 GB | 5 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 🚀 Быстрая установка (одной командой)

```bash
ssh root@your-server-ip

curl -fsSL https://raw.githubusercontent.com/frostiks777/1pgWebGallery/main/install.sh | sudo bash
```

---

## 🔧 Пошаговая установка

### 1. Подключение к серверу

```bash
ssh root@your-server-ip
```

### 2. Обновление системы

```bash
apt update && apt upgrade -y
```

### 3. Установка базовых пакетов

```bash
apt install -y curl git nginx certbot python3-certbot-nginx
```

### 4. Настройка firewall

```bash
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw status
```

### 5. Добавление swap (рекомендуется!)

```bash
# Создать swap файл 2GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Добавить в fstab
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Оптимизировать
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

### 6. Установка Bun

```bash
# Установка
curl -fsSL https://bun.sh/install | bash

# Добавить симлинки для глобального доступа
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx

# Проверить
bun --version
bunx --version
```

### 7. Создание директории и клонирование

```bash
mkdir -p /var/www/apps
cd /var/www/apps
git clone https://github.com/frostiks777/1pgWebGallery.git photo-gallery
cd photo-gallery
```

### 8. Установка зависимостей

```bash
bun install
```

### 9. Настройка WebDAV

```bash
cp .env.example .env.local
nano .env.local
```

Заполните:
```env
WEBDAV_URL=https://your-nextcloud.com/remote.php/dav/files/username/
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-app-password
PHOTOS_DIR=/Photos

# Пароль для доступа к галерее (необязательно, без него галерея открыта)
WEBDAV_LOGON_PASSWORD=your-gallery-access-password
```

> 💡 Для Nextcloud создайте App Password в Settings → Security

### 10. Сборка проекта

```bash
NODE_OPTIONS="--max-old-space-size=4096" bunx next build
```

### 11. Права доступа

```bash
chown -R www-data:www-data /var/www/apps/photo-gallery
chmod -R 755 /var/www/apps/photo-gallery
```

### 12. Создание systemd сервиса

```bash
nano /etc/systemd/system/photo-gallery.service
```

Вставьте:
```ini
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
```

### 13. Настройка Nginx

```bash
nano /etc/nginx/sites-available/photo-gallery
```

Вставьте (замените `your-domain.com`):
```nginx
upstream photo_gallery {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://photo_gallery;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
    server_tokens off;

    location ~ /\. {
        deny all;
    }
}
```

### 14. Активация Nginx

```bash
ln -s /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 15. Запуск сервиса

```bash
systemctl daemon-reload
systemctl enable photo-gallery
systemctl start photo-gallery
systemctl status photo-gallery
```

### 16. SSL сертификат

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## ✅ Проверка

```bash
# Статус
systemctl status photo-gallery

# Логи
journalctl -u photo-gallery -f

# Проверка порта
ss -tlnp | grep 3000

# Тест API
curl http://localhost:3000/api/photos
```

---

## 🔧 Полезные команды

```bash
# Статус
systemctl status photo-gallery

# Перезапуск
systemctl restart photo-gallery

# Логи в реальном времени
journalctl -u photo-gallery -f

# Обновление
cd /var/www/apps/photo-gallery
git pull
bun install
NODE_OPTIONS="--max-old-space-size=4096" bunx next build
systemctl restart photo-gallery
```

---

## 🐛 Решение проблем

### `bun: command not found`
```bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx
```

### `SIGKILL` при сборке
```bash
# Проверить swap
free -h
swapon --show

# Если нет swap - добавить
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### 502 Bad Gateway
```bash
systemctl status photo-gallery
systemctl restart photo-gallery
```

### Порт 3000 занят
```bash
lsof -i :3000
kill -9 <PID>
systemctl restart photo-gallery
```

### WebDAV: Invalid response: 404 Not Found

Это означает, что папка с фотографиями не найдена на сервере WebDAV.

**Шаги для решения:**

1. **Проверьте правильность WebDAV URL:**
```bash
# Для Nextcloud URL должен быть:
WEBDAV_URL=https://your-nextcloud.com/remote.php/dav/files/USERNAME/

# Для Яндекс.Диск:
WEBDAV_URL=https://webdav.yandex.ru/

# Для pCloud:
WEBDAV_URL=https://webdav.pcloud.com/
```

2. **Проверьте правильность пути к папке с фото:**
```bash
# Посмотреть доступные папки:
curl -u USERNAME:PASSWORD https://your-nextcloud.com/remote.php/dav/files/USERNAME/

# Обычно папка с фото:
PHOTOS_DIR=/Photos
# или
PHOTOS_DIR=/photos
# или
PHOTOS_DIR=/Изображения
```

3. **Тест подключения WebDAV:**
```bash
# На сервере выполните:
curl -I -u USERNAME:PASSWORD https://your-nextcloud.com/remote.php/dav/files/USERNAME/

# Должен вернуть 200 OK или 207 Multi-Status
```

4. **Создайте App Password для Nextcloud:**
   - Войдите в Nextcloud
   - Settings → Security → Devices & sessions
   - Нажмите "Create new app password"
   - Используйте этот пароль в `WEBDAV_PASSWORD`

5. **Проверьте логи:**
```bash
journalctl -u photo-gallery -f
```

### WebDAV: 401 Unauthorized

Неверные учетные данные:
- Проверьте `WEBDAV_USERNAME` и `WEBDAV_PASSWORD`
- Для Nextcloud используйте App Password, а не основной пароль

### WebDAV: Connection refused

Сервер недоступен:
- Проверьте правильность URL
- Проверьте доступность сервера: `ping your-nextcloud.com`
- Проверьте firewall

---

## 🧪 Тестирование WebDAV подключения

После настройки `.env.local` выполните:

```bash
# На сервере
cd /var/www/apps/photo-gallery

# Перезапустите сервис
systemctl restart photo-gallery

# Проверьте логи
journalctl -u photo-gallery -f

# В другом терминале - тест API
curl http://localhost:3000/api/webdav/test
```

Ответ должен содержать:
```json
{
  "success": true,
  "message": "Successfully connected to WebDAV. Found X items in \"/Photos\".",
  "details": {
    "url": "https://...",
    "photosDir": "/Photos",
    "directoryExists": true,
    "fileCount": 123
  }
}
```

---

Готово! 🎉 Сайт: `https://your-domain.com`
