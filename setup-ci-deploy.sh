#!/bin/bash
# =============================================================================
# Photo Gallery - разовая настройка сервера под CI/CD (GitHub Actions)
# =============================================================================
# Запуск (один раз, после git pull, из каталога проекта):
#   sudo bash setup-ci-deploy.sh
#
# Что делает:
#   1. Создаёт системного пользователя deploy (без shell-логина) для CI
#   2. Даёт ему право без пароля рестартовать ТОЛЬКО сервис photo-gallery
#   3. Создаёт release/ — каталог, которым будет полностью владеть деплой
#   4. Генерирует SSH-ключ для GitHub Actions и добавляет публичную часть
#      в authorized_keys пользователя deploy
#   5. Устанавливает rsync, если его нет (workflow деплоит через rsync)
#   6. Обновляет /etc/systemd/system/photo-gallery.service из репозитория
#      и делает systemctl daemon-reload (сам сервис НЕ перезапускает —
#      в release/ ещё нет server.js до первого деплоя)
#   7. Печатает секреты, которые нужно добавить в GitHub
#      (Settings → Secrets and variables → Actions)
#
# Безопасно запускать повторно — все шаги идемпотентны, существующий
# SSH-ключ не перегенерируется.
#
# Подробности и объяснение решений: DEPLOYMENT.md, раздел 10.
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Photo Gallery - настройка CI/CD (GitHub Actions)       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Запустите с sudo: sudo bash setup-ci-deploy.sh${NC}"
    exit 1
fi

DEPLOY_USER="deploy"
DEPLOY_HOME="/home/$DEPLOY_USER"
SERVICE_NAME="photo-gallery"
KEY_PATH="/root/.ssh/${SERVICE_NAME}-deploy_key"

# --- Путь к проекту -----------------------------------------------------
PROJECT_PATH="/var/www/apps/photo-gallery"
if [ ! -d "$PROJECT_PATH" ] || [ ! -f "$PROJECT_PATH/photo-gallery.service" ]; then
    echo -e "${YELLOW}Проект не найден по умолчанию: $PROJECT_PATH${NC}"
    read -p "Введите путь к каталогу проекта (git-чекаут): " PROJECT_PATH
    if [ ! -f "$PROJECT_PATH/photo-gallery.service" ]; then
        echo -e "${RED}Ошибка: $PROJECT_PATH/photo-gallery.service не найден${NC}"
        exit 1
    fi
fi
RELEASE_DIR="$PROJECT_PATH/release"

echo -e "${BLUE}[1/8] Пользователь для деплоя ($DEPLOY_USER)...${NC}"
if id -u "$DEPLOY_USER" &>/dev/null; then
    echo "Уже существует, пропускаю создание."
else
    # /bin/bash, не /usr/sbin/nologin: пользователю не нужен интерактивный
    # логин (пароля у него нет, только SSH-ключ), но rsync и systemctl restart
    # выполняются через SSH КАК КОМАНДЫ — nologin вместо их запуска печатает
    # "not available" в stdout, и rsync принимает это за начало протокола
    # ("protocol version mismatch -- is your shell clean?").
    adduser --system --group --home "$DEPLOY_HOME" --shell /bin/bash "$DEPLOY_USER"
fi
usermod -aG www-data "$DEPLOY_USER"
# На случай если пользователь уже был создан прежней версией этого скрипта
# с /usr/sbin/nologin — чиним шелл и при повторном запуске.
usermod -s /bin/bash "$DEPLOY_USER"

echo -e "${BLUE}[2/8] Права sudo (только restart/is-active для $SERVICE_NAME)...${NC}"
SYSTEMCTL_BIN="$(command -v systemctl)"
SUDOERS_FILE="/etc/sudoers.d/${SERVICE_NAME}-deploy"
cat > "$SUDOERS_FILE" << EOF
$DEPLOY_USER ALL=(root) NOPASSWD: $SYSTEMCTL_BIN restart $SERVICE_NAME, $SYSTEMCTL_BIN is-active --quiet $SERVICE_NAME
EOF
chmod 440 "$SUDOERS_FILE"
if ! visudo -cf "$SUDOERS_FILE" > /dev/null; then
    echo -e "${RED}Ошибка синтаксиса в $SUDOERS_FILE, удаляю файл${NC}"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

echo -e "${BLUE}[3/8] Каталог release/ (цель деплоя)...${NC}"
mkdir -p "$RELEASE_DIR"
chown "$DEPLOY_USER":www-data "$RELEASE_DIR"
chmod 2775 "$RELEASE_DIR"
# Кэш миниатюр — вне release/, чтобы не стирался при каждом деплое
# (см. CACHE_DIR в photo-gallery.service)
mkdir -p "$PROJECT_PATH/.data"
chown www-data:www-data "$PROJECT_PATH/.data"
# .env.local тоже намеренно вне release/ (деплой его не должен трогать),
# но Next.js на старте ищет .env.local в своей текущей директории — а это
# теперь release/. Кладём туда symlink на настоящий файл: сам файл как лежал
# в корне проекта, так и лежит, release/.env.local — просто ссылка на него.
# rsync --delete эту ссылку не тронет (см. --exclude в deploy.yml).
ln -sf "$PROJECT_PATH/.env.local" "$RELEASE_DIR/.env.local"

echo -e "${BLUE}[4/8] rsync (нужен деплою)...${NC}"
if ! command -v rsync &> /dev/null; then
    apt update && apt install -y rsync
else
    echo "Уже установлен."
fi

echo -e "${BLUE}[5/8] SSH-ключ для GitHub Actions...${NC}"
mkdir -p "$DEPLOY_HOME/.ssh"
if [ -f "$KEY_PATH" ]; then
    echo "Ключ уже существует ($KEY_PATH), не перегенерирую."
else
    ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "github-actions-deploy" -q
fi
touch "$DEPLOY_HOME/.ssh/authorized_keys"
if ! grep -qxF "$(cat "${KEY_PATH}.pub")" "$DEPLOY_HOME/.ssh/authorized_keys" 2>/dev/null; then
    cat "${KEY_PATH}.pub" >> "$DEPLOY_HOME/.ssh/authorized_keys"
fi
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"

echo -e "${BLUE}[6/8] systemd unit из репозитория...${NC}"
cp "$PROJECT_PATH/photo-gallery.service" "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" > /dev/null 2>&1 || true
echo "daemon-reload выполнен. Сервис НЕ перезапускаю — в release/ ещё нет"
echo "server.js до первого деплоя; текущий процесс (если запущен) продолжит работать."

echo -e "${BLUE}[7/8] Патч nginx (статика теперь отдаётся из release/)...${NC}"
# До перехода на CI/CD nginx отдавал /_next/static/, /demo-photos/ и корень
# public/ напрямую с диска (alias/root на /var/www/apps/photo-gallery/...) —
# в обход Node, для скорости. Эти файлы теперь лежат в release/, а не в
# корне проекта, иначе после деплоя всё, что nginx отдавал сам (JS/CSS/шрифты/
# demo-фото), превращается в 404, хотя сам Next.js работает нормально.
NGINX_FILES="$(grep -rlF "/var/www/apps/photo-gallery/.next/static/" /etc/nginx/sites-available /etc/nginx/sites-enabled 2>/dev/null || true)"
if [ -z "$NGINX_FILES" ]; then
    echo "Конфиг nginx со старыми путями не найден (уже пропатчен, или nginx настроен иначе/не используется) — пропускаю."
else
    PATCHED_ANY=false
    for f in $NGINX_FILES; do
        # sites-enabled обычно симлинки на sites-available — правим цель, не сам симлинк
        target="$(readlink -f "$f")"
        sed -i \
            -e "s#/var/www/apps/photo-gallery/\.next/static/#${RELEASE_DIR}/.next/static/#g" \
            -e "s#/var/www/apps/photo-gallery/public/demo-photos/#${RELEASE_DIR}/public/demo-photos/#g" \
            -e "s#root /var/www/apps/photo-gallery/public;#root ${RELEASE_DIR}/public;#g" \
            "$target"
        echo "Пропатчен: $target"
        PATCHED_ANY=true
    done
    if [ "$PATCHED_ANY" = true ] && command -v nginx &> /dev/null; then
        if nginx -t 2>&1; then
            systemctl reload nginx
            echo "nginx перезагружен."
        else
            echo -e "${RED}nginx -t упал после патча — проверьте конфиг вручную, reload НЕ делаю${NC}"
        fi
    fi
fi

# Отдельный баг, не связанный с путём release/: без модификатора ^~ у
# location /_next/static/ regex-локация для картинок/шрифтов ниже (она
# матчит *.woff2 тоже) имеет более высокий приоритет в nginx и перехватывает
# шрифты Next.js, отдавая 404 вместо файла (у неё нет своего alias — только
# root на public/, где шрифтов нет). Чинится модификатором ^~ и исключением
# woff/woff2 из regex-локации — сами шрифты уже кэшируются в блоке static/.
PRIO_FILES="$(grep -rlF 'location /_next/static/ {' /etc/nginx/sites-available /etc/nginx/sites-enabled 2>/dev/null || true)"
if [ -z "$PRIO_FILES" ]; then
    echo "Приоритет location для /_next/static/ уже исправлен (или конфиг не найден) — пропускаю."
else
    PATCHED_PRIO=false
    for f in $PRIO_FILES; do
        target="$(readlink -f "$f")"
        sed -i \
            -e 's#location /_next/static/ {#location ^~ /_next/static/ {#' \
            -e 's#\.(jpg|jpeg|png|gif|webp|ico|svg|woff|woff2|ttf|eot)\$#\.(jpg|jpeg|png|gif|webp|ico|svg)\$#' \
            -e 's#\.(jpg|jpeg|png|gif|webp|ico|svg|woff|woff2)\$#\.(jpg|jpeg|png|gif|webp|ico|svg)\$#' \
            "$target"
        echo "Исправлен приоритет location в: $target"
        PATCHED_PRIO=true
    done
    if [ "$PATCHED_PRIO" = true ] && command -v nginx &> /dev/null; then
        if nginx -t 2>&1; then
            systemctl reload nginx
            echo "nginx перезагружен."
        else
            echo -e "${RED}nginx -t упал после патча — проверьте конфиг вручную, reload НЕ делаю${NC}"
        fi
    fi
fi

echo -e "${BLUE}[8/8] Определение адреса сервера...${NC}"
SERVER_IP="$(curl -fsS --max-time 3 https://ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "<укажите вручную>")"
SSH_PORT="$(awk '/^[[:space:]]*Port[[:space:]]+[0-9]+/{print $2; exit}' /etc/ssh/sshd_config 2>/dev/null || true)"
SSH_PORT="${SSH_PORT:-22}"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Готово. Осталось добавить секреты в GitHub:${NC}"
echo -e "${GREEN} Settings → Secrets and variables → Actions → New repository secret${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  DEPLOY_HOST  = ${YELLOW}${SERVER_IP}${NC}"
echo -e "  DEPLOY_USER  = ${YELLOW}${DEPLOY_USER}${NC}"
echo -e "  DEPLOY_PATH  = ${YELLOW}${RELEASE_DIR}${NC}"
if [ "$SSH_PORT" != "22" ]; then
    echo -e "  DEPLOY_PORT  = ${YELLOW}${SSH_PORT}${NC}  (нестандартный SSH-порт — секрет обязателен)"
else
    echo -e "  DEPLOY_PORT  = не нужен (стандартный порт 22)"
fi
echo -e "  DEPLOY_SSH_KEY = содержимое файла целиком:"
echo ""
echo -e "${YELLOW}--- $KEY_PATH (скопируйте всё, включая BEGIN/END строки) ---${NC}"
cat "$KEY_PATH"
echo -e "${YELLOW}--- конец ключа ---${NC}"
echo ""
echo -e "${RED}Приватный ключ выше даёт право деплоить на этот сервер — храните его${NC}"
echo -e "${RED}только в секрете GitHub, никуда больше не копируйте и не коммитьте.${NC}"
echo ""
echo "После добавления секретов — пуш в main (или Actions → Build & Deploy →"
echo "Run workflow) соберёт и выложит проект. Проверить: sudo systemctl status $SERVICE_NAME"
