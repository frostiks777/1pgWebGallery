# 📖 Инструкция по развертыванию Photo Gallery на Ubuntu Server

## Содержание
1. [Подготовка сервера](#1-подготовка-сервера)
2. [Установка Node.js](#2-установка-nodejs)
3. [Клонирование и настройка проекта](#3-клонирование-и-настройка-проекта)
4. [Настройка WebDAV](#4-настройка-webdav)
5. [Настройка Nginx](#5-настройка-nginx)
6. [Настройка SSL](#6-настройка-ssl)
7. [Настройка systemd](#7-настройка-systemd)
8. [Запуск и проверка](#8-запуск-и-проверка)

---

## 1. Подготовка сервера

### 1.1 Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Установка необходимых пакетов
```bash
sudo apt install -y curl git nginx certbot python3-certbot-nginx nodejs npm
```

### 1.3 Настройка firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 2. Установка Node.js

### 2.1 Установка Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.2 Проверка установки
```bash
node --version   # должно показать v20.x.x
npm --version    # должно показать 10.x.x
```

---

## 3. Клонирование и настройка проекта

### 3.1 Создание директории для приложений
```bash
sudo mkdir -p /var/www/apps
sudo chown $USER:$USER /var/www/apps
```

### 3.2 Клонирование репозитория
```bash
cd /var/www/apps
git clone https://github.com/frostiks777/1pgWebGallery.git photo-gallery
cd photo-gallery
```

### 3.3 Установка зависимостей
```bash
npm install
```

### 3.4 Создание файла конфигурации
```bash
cp .env.example .env.local
nano .env.local
```

### 3.5 Редактирование .env.local
```env
# WebDAV Configuration
WEBDAV_URL=https://your-cloud.com/remote.php/dav/files/username/
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-password-or-app-token
PHOTOS_DIR=/Photos
```

### 3.6 Сборка проекта
```bash
npm run build
```

> ⚠️ Если сборка падает с ошибкой памяти, добавьте swap:
> ```bash
> sudo fallocate -l 2G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

---

## 4. Настройка WebDAV

### 4.1 Для Nextcloud
1. Войдите в Nextcloud
2. Перейдите в Settings → Security
3. Создайте App Password
4. Используйте App Password вместо основного пароля

**URL формат:**
```
https://your-nextcloud.com/remote.php/dav/files/USERNAME/
```

### 4.2 Для ownCloud
```
https://your-owncloud.com/remote.php/dav/files/USERNAME/
```

### 4.3 Для Yandex.Disk
```
WEBDAV_URL=https://webdav.yandex.com/
WEBDAV_USERNAME=your-email@yandex.com
WEBDAV_PASSWORD=your-password
```

### 4.4 Для Box.com
```
WEBDAV_URL=https://dav.box.com/dav/
```

---

## 5. Настройка Nginx

### 5.1 Создание конфигурации
```bash
sudo nano /etc/nginx/sites-available/photo-gallery
```

### 5.2 Содержимое конфигурации
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

    # Next.js static files
    location /_next/static/ {
        alias /var/www/apps/photo-gallery/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Demo photos
    location /demo-photos/ {
        alias /var/www/apps/photo-gallery/public/demo-photos/;
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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        proxy_buffering off;
    }

    # Main proxy
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

### 5.3 Активация конфигурации
```bash
sudo ln -s /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Настройка SSL

### 6.1 Получение SSL сертификата (Let's Encrypt)
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 6.2 Автоматическое обновление
```bash
sudo certbot renew --dry-run
```

---

## 7. Настройка systemd

### 7.1 Создание сервиса
```bash
sudo nano /etc/systemd/system/photo-gallery.service
```

### 7.2 Содержимое сервиса
```ini
[Unit]
Description=Photo Gallery - Next.js Application
Documentation=https://github.com/frostiks777/1pgWebGallery
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

ExecStart=/usr/bin/node .next/standalone/server.js

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

### 7.3 Права доступа
```bash
sudo chown -R www-data:www-data /var/www/apps/photo-gallery
sudo chmod -R 755 /var/www/apps/photo-gallery
```

### 7.4 Активация сервиса
```bash
sudo systemctl daemon-reload
sudo systemctl enable photo-gallery
sudo systemctl start photo-gallery
```

---

## 8. Запуск и проверка

### 8.1 Проверка статуса
```bash
sudo systemctl status photo-gallery
```

### 8.2 Проверка логов
```bash
# Логи сервиса
sudo journalctl -u photo-gallery -f

# Логи Nginx
tail -f /var/log/nginx/photo-gallery.access.log
```

### 8.3 Проверка работы
```bash
curl http://localhost:3000/api/photos
```

---

## 🔧 Полезные команды

### Управление сервисом
```bash
sudo systemctl status photo-gallery    # Статус
sudo systemctl restart photo-gallery   # Перезапуск
sudo systemctl stop photo-gallery      # Остановка
sudo systemctl start photo-gallery     # Запуск
```

### Обновление приложения
```bash
cd /var/www/apps/photo-gallery
git pull
npm install
npm run build
sudo systemctl restart photo-gallery
```

### Просмотр логов
```bash
sudo journalctl -u photo-gallery -f              # Реальное время
sudo journalctl -u photo-gallery -n 100          # Последние 100 строк
sudo journalctl -u photo-gallery --since "1h"    # За последний час
```

---

## 🐛 Решение проблем

### Ошибка: script "build" was terminated by SIGKILL
**Причина:** Недостаточно памяти для сборки

**Решение:** Добавьте swap файл:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Проблема: 502 Bad Gateway
**Решение:**
1. Проверьте запущен ли сервис: `sudo systemctl status photo-gallery`
2. Проверьте порт: `sudo netstat -tlnp | grep 3000`

### Проблема: Нет демо-фото
**Решение:** В демонстрационном режиме фото загружаются из `/public/demo-photos/`. Для работы с WebDAV настройте переменные окружения.

---

## 📊 Минимальные требования

| Параметр | Значение |
|----------|----------|
| RAM | 2 GB (рекомендуется 4 GB) |
| CPU | 1 ядро |
| Disk | 1 GB |
| OS | Ubuntu 20.04+ |

---

Готово! 🎉 Ваша Photo Gallery будет доступна по адресу `https://your-domain.com`
