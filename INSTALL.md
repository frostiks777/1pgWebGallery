# 📖 Пошаговая установка Photo Gallery на Ubuntu 22

## 📋 Требования

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 ядро | 2 ядра |
| Disk | 2 GB | 5 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 🚀 Вариант 1: Автоматическая установка

```bash
# Подключитесь к серверу по SSH
ssh root@your-server-ip

# Скачайте и запустите скрипт установки
curl -fsSL https://raw.githubusercontent.com/frostiks777/1pgWebGallery/main/install.sh | sudo bash
```

---

## 🔧 Вариант 2: Ручная установка (пошагово)

### Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
```

### Шаг 2: Обновление системы

```bash
apt update && apt upgrade -y
```

### Шаг 3: Установка базовых пакетов

```bash
apt install -y curl git nginx certbot python3-certbot-nginx build-essential
```

### Шаг 4: Настройка firewall

```bash
# Включить firewall
ufw --force enable

# Разрешить SSH
ufw allow OpenSSH

# Разрешить HTTP и HTTPS
ufw allow 'Nginx Full'

# Проверить статус
ufw status
```

### Шаг 5: Добавление swap (рекомендуется)

```bash
# Создать swap файл 2GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Добавить в fstab для автоподключения
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Оптимизировать swap
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

### Шаг 6: Установка Bun

```bash
# Установка Bun
curl -fsSL https://bun.sh/install | bash

# Добавить в PATH для текущей сессии
source ~/.bashrc

# Создать симлинки для глобального доступа
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx

# Проверить установку
bun --version
```

### Шаг 7: Создание директории проекта

```bash
mkdir -p /var/www/apps
cd /var/www/apps
```

### Шаг 8: Клонирование проекта

```bash
git clone https://github.com/frostiks777/1pgWebGallery.git photo-gallery
cd photo-gallery
```

### Шаг 9: Установка зависимостей

```bash
bun install
```

### Шаг 10: Настройка переменных окружения

```bash
# Копировать шаблон
cp .env.example .env.local

# Редактировать конфигурацию
nano .env.local
```

**Содержимое .env.local:**

```env
# WebDAV Configuration
WEBDAV_URL=https://your-cloud.com/remote.php/dav/files/username/
WEBDAV_USERNAME=your-username
WEBDAV_PASSWORD=your-password-or-app-token
PHOTOS_DIR=/Photos
```

> 💡 **Для Nextcloud:** Создайте App Password в Settings → Security

### Шаг 11: Сборка проекта

```bash
# Сборка с увеличенным лимитом памяти
NODE_OPTIONS="--max-old-space-size=4096" bun next build
```

### Шаг 12: Настройка прав доступа

```bash
chown -R www-data:www-data /var/www/apps/photo-gallery
chmod -R 755 /var/www/apps/photo-gallery
```

### Шаг 13: Создание systemd сервиса

```bash
nano /etc/systemd/system/photo-gallery.service
```

**Содержимое:**

```ini
[Unit]
Description=Photo Gallery - WebDAV Cloud Photos
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/apps/photo-gallery
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="NODE_OPTIONS=--max-old-space-size=4096"
EnvironmentFile=/var/www/apps/photo-gallery/.env.local
ExecStart=/usr/local/bin/bun .next/standalone/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=photo-gallery

[Install]
WantedBy=multi-user.target
```

### Шаг 14: Настройка Nginx

```bash
nano /etc/nginx/sites-available/photo-gallery
```

**Содержимое (замените `your-domain.com`):**

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

### Шаг 15: Активация Nginx конфигурации

```bash
# Создать симлинк
ln -s /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/

# Удалить default (опционально)
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезапустить Nginx
systemctl reload nginx
```

### Шаг 16: Запуск сервиса

```bash
# Перезагрузить systemd
systemctl daemon-reload

# Включить автозапуск
systemctl enable photo-gallery

# Запустить сервис
systemctl start photo-gallery

# Проверить статус
systemctl status photo-gallery
```

### Шаг 17: Настройка SSL (HTTPS)

```bash
# Получить SSL сертификат
certbot --nginx -d your-domain.com -d www.your-domain.com

# Проверить автоматическое обновление
certbot renew --dry-run
```

---

## ✅ Проверка установки

### Проверка статуса сервисов

```bash
# Статус Photo Gallery
systemctl status photo-gallery

# Статус Nginx
systemctl status nginx

# Проверка порта
ss -tlnp | grep 3000
```

### Проверка логов

```bash
# Логи приложения
journalctl -u photo-gallery -f

# Логи Nginx
tail -f /var/log/nginx/photo-gallery.access.log

# Логи ошибок
tail -f /var/log/nginx/photo-gallery.error.log
```

### Проверка ответа сервера

```bash
# Локально
curl http://localhost:3000/api/photos

# Через Nginx
curl http://your-domain.com/api/photos
```

---

## 🔧 Полезные команды

### Управление сервисом

```bash
# Статус
systemctl status photo-gallery

# Запуск
systemctl start photo-gallery

# Остановка
systemctl stop photo-gallery

# Перезапуск
systemctl restart photo-gallery

# Логи в реальном времени
journalctl -u photo-gallery -f
```

### Обновление приложения

```bash
cd /var/www/apps/photo-gallery
git pull
bun install
NODE_OPTIONS="--max-old-space-size=4096" bun next build
systemctl restart photo-gallery
```

### Перезапуск Nginx

```bash
nginx -t                    # Проверка конфигурации
systemctl reload nginx      # Перезагрузка без перерыва
systemctl restart nginx     # Полный перезапуск
```

---

## 🐛 Решение проблем

### Проблема: `bun: command not found`

```bash
# Добавить симлинки
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx

# Или перезайти в сессию
exit
ssh root@your-server-ip
```

### Проблема: `SIGKILL` при сборке

```bash
# Добавить swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Собрать с ограничением памяти
NODE_OPTIONS="--max-old-space-size=4096" bun next build
```

### Проблема: 502 Bad Gateway

```bash
# Проверить запущен ли сервис
systemctl status photo-gallery

# Проверить порт
ss -tlnp | grep 3000

# Перезапустить сервис
systemctl restart photo-gallery
```

### Проблема: Нет соединения с WebDAV

```bash
# Проверить конфигурацию
cat /var/www/apps/photo-gallery/.env.local

# Проверить соединение
curl -u username:password https://your-webdav-url/

# Перезапустить после изменения
systemctl restart photo-gallery
```

### Проблема: Порт 3000 занят

```bash
# Найти процесс
lsof -i :3000

# Убить процесс
kill -9 <PID>

# Перезапустить сервис
systemctl restart photo-gallery
```

---

## 📊 Структура проекта на сервере

```
/var/www/apps/photo-gallery/
├── .env.local              # Конфигурация WebDAV
├── .next/
│   ├── static/             # Статические файлы
│   └── standalone/         # Production сервер
├── public/
│   └── demo-photos/        # Демо фотографии
├── src/                    # Исходный код
├── package.json
└── ...
```

---

## 🔒 Безопасность

### Настройка прав

```bash
# Установить владельца
chown -R www-data:www-data /var/www/apps/photo-gallery

# Ограничить доступ к .env.local
chmod 600 /var/www/apps/photo-gallery/.env.local
```

### Настройка fail2ban

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📝 Чек-лист установки

- [ ] Сервер обновлён (`apt update && apt upgrade`)
- [ ] Установлен Nginx
- [ ] Установлен Bun
- [ ] Настроен firewall (ufw)
- [ ] Добавлен swap
- [ ] Склонирован проект
- [ ] Установлены зависимости (`bun install`)
- [ ] Настроен .env.local
- [ ] Проект собран (`bun next build`)
- [ ] Создан systemd сервис
- [ ] Настроен Nginx
- [ ] Получен SSL сертификат
- [ ] Сервис запущен и работает

---

Готово! 🎉 Ваша Photo Gallery доступна по адресу `https://your-domain.com`
