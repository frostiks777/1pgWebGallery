# 📖 Инструкция по развертыванию Photo Gallery на Ubuntu Server

## Содержание
1. [Подготовка сервера](#1-подготовка-сервера)
2. [Установка Node.js и Bun](#2-установка-nodejs-и-bun)
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
sudo apt install -y curl git nginx certbot python3-certbot-nginx
```

### 1.3 Настройка firewall
```bash
# Разрешить HTTP, HTTPS и SSH
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 2. Установка Node.js и Bun

### 2.1 Установка Node.js (для совместимости)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.2 Установка Bun (рекомендуется)
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 2.3 Проверка установки
```bash
node --version   # должно показать v20.x.x
bun --version    # должно показать 1.x.x
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
bun install
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
server {
    listen 80;
    server_name your-domain.com;  # Замените на ваш домен
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Увеличение таймаутов для больших файлов
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }
}
```

### 5.3 Активация конфигурации
```bash
sudo ln -s /etc/nginx/sites-available/photo-gallery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Настройка SSL

### 6.1 Получение SSL сертификата (Let's Encrypt)
```bash
sudo certbot --nginx -d your-domain.com
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
Description=Photo Gallery Application
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/apps/photo-gallery
Environment="NODE_ENV=production"
EnvironmentFile=/var/www/apps/photo-gallery/.env.local
ExecStart=/home/YOUR_USER/.bun/bin/bun run start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=photo-gallery

[Install]
WantedBy=multi-user.target
```

> **Важно:** Замените `YOUR_USER` на имя пользователя, под которым установлен Bun.

### 7.3 Альтернативный вариант (с использованием Bun глобально)
```bash
# Узнать путь к Bun
which bun

# Или создать симлинк
sudo ln -s /home/YOUR_USER/.bun/bin/bun /usr/local/bin/bun
```

Обновите сервис:
```ini
ExecStart=/usr/local/bin/bun run start
```

### 7.4 Права доступа
```bash
sudo chown -R www-data:www-data /var/www/apps/photo-gallery
sudo chmod -R 755 /var/www/apps/photo-gallery
```

### 7.5 Активация сервиса
```bash
sudo systemctl daemon-reload
sudo systemctl enable photo-gallery
sudo systemctl start photo-gallery
```

---

## 8. Запуск и проверка

### 8.1 Сборка проекта
```bash
cd /var/www/apps/photo-gallery
bun run build
```

### 8.2 Запуск сервиса
```bash
sudo systemctl restart photo-gallery
sudo systemctl status photo-gallery
```

### 8.3 Проверка логов
```bash
# Логи сервиса
sudo journalctl -u photo-gallery -f

# Логи приложения
tail -f /var/www/apps/photo-gallery/server.log
```

### 8.4 Проверка работы
```bash
# Проверка локального ответа
curl http://localhost:3000

# Проверка через Nginx
curl http://your-domain.com
```

---

## 🔧 Полезные команды

### Управление сервисом
```bash
# Статус
sudo systemctl status photo-gallery

# Перезапуск
sudo systemctl restart photo-gallery

# Остановка
sudo systemctl stop photo-gallery

# Запуск
sudo systemctl start photo-gallery
```

### Обновление приложения
```bash
cd /var/www/apps/photo-gallery
git pull origin main
bun install
bun run build
sudo systemctl restart photo-gallery
```

### Просмотр логов
```bash
# Реальное время
sudo journalctl -u photo-gallery -f

# Последние 100 строк
sudo journalctl -u photo-gallery -n 100

# За последний час
sudo journalctl -u photo-gallery --since "1 hour ago"
```

---

## 🐛 Решение проблем

### Проблема: Не удается подключиться к WebDAV
**Решение:**
1. Проверьте правильность URL
2. Убедитесь, что пароль приложения создан (для Nextcloud)
3. Проверьте доступность WebDAV сервера:
```bash
curl -u username:password https://your-webdav-url/
```

### Проблема: 502 Bad Gateway
**Решение:**
1. Проверьте, запущен ли сервис:
```bash
sudo systemctl status photo-gallery
```
2. Проверьте порт 3000:
```bash
sudo netstat -tlnp | grep 3000
```

### Проблема: Нет демо-фото
**Решение:**
В демонстрационном режиме фото загружаются из `/public/demo-photos/`. Для работы с WebDAV настройте переменные окружения.

### Проблема: Ошибка прав доступа
**Решение:**
```bash
sudo chown -R www-data:www-data /var/www/apps/photo-gallery
sudo chmod -R 755 /var/www/apps/photo-gallery
```

---

## 📊 Мониторинг

### Установка PM2 (опционально)
```bash
sudo npm install -g pm2
pm2 start "bun run start" --name photo-gallery
pm2 save
pm2 startup
```

### Настройка логирования
Добавьте в `.env.local`:
```env
LOG_LEVEL=info
```

---

## 🔒 Безопасность

### 1. Ограничение доступа к .env.local
```bash
chmod 600 /var/www/apps/photo-gallery/.env.local
```

### 2. Настройка fail2ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Регулярные обновления
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление зависимостей проекта
cd /var/www/apps/photo-gallery
bun update
```

---

## 📝 Дополнительные ресурсы

- [Next.js Documentation](https://nextjs.org/docs)
- [Bun Documentation](https://bun.sh/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

Готово! 🎉 Ваша Photo Gallery должна быть доступна по адресу `https://your-domain.com`
