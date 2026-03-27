# Миграция на оптимизированную версию

## 🎯 Что изменилось

### API Endpoints

**Устаревшие (удалить после миграции):**
- ❌ `/api/photos/[...path]` 
- ❌ `/api/thumbnail`
- ❌ `/api/medium`
- ❌ `/api/photo-file`

**Новый унифицированный эндпоинт:**
- ✅ `/api/images?path={path}&size={thumbnail|medium|full}`

### Изменения в коде

#### 1. WebDAV библиотека (`src/lib/webdav.ts`)
**Удалены функции:**
- `getPhotoAsBase64()` - заменена на `getPhotoBuffer()`
- `getPhotoThumbnail()` - удалена (теперь в API)

**Новая функция:**
```typescript
export async function getPhotoBuffer(photoPath: string): Promise<Buffer>
```

#### 2. PhotoCard компонент
**Было:**
```typescript
const imageUrl = `/api/thumbnail?path=${encodeURIComponent(photo.path)}`;
```

**Стало:**
```typescript
const imageUrl = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;
```

#### 3. Lightbox компонент
**Было:**
```typescript
const imageUrl = `/api/medium?path=${encodeURIComponent(currentPhoto.path)}`;
const fullImageUrl = `/api/photo-file?path=${encodeURIComponent(currentPhoto.path)}`;
```

**Стало:**
```typescript
const imageUrl = `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=medium`;
const fullImageUrl = `/api/images?path=${encodeURIComponent(currentPhoto.path)}&size=full`;
```

## 📦 Новые зависимости

Библиотека `sharp` уже установлена в проекте (указана в `package.json`), поэтому дополнительной установки не требуется.

## 🗂️ Структура кэша

Система использует **двухуровневый кэш**:

### Уровень 1 — Co-located кэш (рядом с оригиналами, постоянный)

Миниатюры сохраняются в папку `.thumbs/{size}/` **в той же директории**, что и оригинальные фото.

**Для локальных demo-фото:**
```
public/
  demo-photos/
    photo1.jpg
    photo2.jpg
    .thumbs/
      thumbnail/
        photo1.webp
        photo2.webp
      medium/
        photo1.webp
        photo2.webp
      full/
        photo1.webp
        photo2.webp
```

**Для WebDAV фото** (сохраняется прямо на сервере WebDAV):
```
/Photos/
  vacation/
    img001.jpg
    img002.jpg
    .thumbs/
      thumbnail/
        img001.webp
        img002.webp
      medium/
        img001.webp
```

Если WebDAV сервер **не поддерживает запись** (read-only), система автоматически переключается на уровень 2.

### Уровень 2 — /tmp кэш (сессионный, резервный)

Используется как резервный вариант и для ускорения доступа внутри сессии сервера:
```
/tmp/photo-gallery-cache/
  {md5hash}.webp    # ← имя файла = md5(path+size)
```

### Порядок поиска при запросе изображения

```
запрос /api/images?path=...&size=thumbnail
  │
  ├─ 1. /tmp кэш (самый быстрый) ──────────────→ [HIT]  X-Cache: HIT
  │
  ├─ 2. .thumbs/ рядом с оригиналом ───────────→ [HIT]  X-Cache: HIT-COLOCATED
  │       (+ прогрев /tmp кэша)
  │
  └─ 3. Оригинал → оптимизация → сохранить в обоих кэшах → [MISS] X-Cache: MISS
```

### Конфигурация кэша через переменные окружения

```env
# Имя папки для co-located миниатюр (по умолчанию .thumbs)
COLOCATED_THUMBS_DIR=.thumbs

# Отключить запись миниатюр обратно на WebDAV (по умолчанию true)
WEBDAV_COLOCATED_CACHE=false

# Путь к локальному /tmp кэшу (по умолчанию /tmp/photo-gallery-cache)
CACHE_DIR=/tmp/photo-gallery-cache
```

## 🚀 Шаги миграции

### 1. Обновить код (уже сделано)
Все изменения уже применены в проекте.

### 2. Очистить старый кэш (опционально)
```bash
# Удалить старые закэшированные изображения
rm -rf .cache/images/*
rm -rf .cache/medium/*
```

### 3. Пересобрать проект
```bash
# Остановить dev сервер, если запущен
# Затем пересобрать
npm run build
# или
bun run build
```

### 4. Запустить проект
```bash
npm run start
# или
bun run start
```

### 5. Удалить старые API файлы (опционально, после проверки)
После того как убедитесь что все работает:
```bash
rm -rf src/app/api/photos/[...path]/
rm -rf src/app/api/thumbnail/
rm -rf src/app/api/medium/
rm -rf src/app/api/photo-file/
```

## 🧪 Тестирование

### 1. Проверить загрузку галереи
- Открыть главную страницу
- Убедиться что все изображения загружаются
- Проверить Network tab: все запросы должны идти на `/api/images`

### 2. Проверить Lightbox
- Открыть любое фото
- Проверить навигацию (← →)
- Проверить скачивание (кнопка Download)

### 3. Проверить кэширование
- Обновить страницу (F5)
- В Network tab должны появиться ответы с заголовком `X-Cache: HIT`

### 4. Проверить разные layout
- Переключить все layouts (Masonry, Bento, Honeycomb и т.д.)
- Убедиться что все работает корректно

## 📊 Мониторинг производительности

### Chrome DevTools
1. Открыть DevTools (F12)
2. Вкладка Network
3. Фильтр: Images
4. Проверить:
   - Все изображения в формате WebP
   - Размеры соответствуют ожидаемым (thumbnail ~50-150KB, medium ~200-500KB)
   - Есть заголовки Cache-Control

### Lighthouse
```bash
# В Chrome DevTools
1. Открыть Lighthouse tab
2. Выбрать Performance
3. Generate report
```

**Ожидаемые показатели:**
- Performance Score: > 90
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Speed Index: < 2.0s

## 🔧 Troubleshooting

### Проблема: Изображения не загружаются
**Решение:**
```bash
# Проверить права доступа к .cache
chmod -R 755 .cache/

# Проверить что Sharp установлен
npm list sharp
```

### Проблема: Ошибки TypeScript после обновления
**Решение:**
```bash
# Очистить кэш TypeScript
rm -rf .next/
rm -rf node_modules/.cache/

# Пересобрать
npm run build
```

### Проблема: WebDAV изображения не отображаются
**Решение:**
1. Проверить переменные окружения в `.env.local`
2. Проверить логи сервера для WebDAV ошибок:
```bash
# В консоли должны быть логи вида:
# [Images API] Fetching from WebDAV
```

### Проблема: Кэш не работает
**Решение:**
```bash
# Проверить /tmp кэш
ls -la /tmp/photo-gallery-cache/

# Проверить co-located кэш для demo фото
ls -la public/demo-photos/.thumbs/

# Проверить логи сервера — должны быть сообщения вида:
# [Images API] Co-located cache saved (local): .../public/demo-photos/.thumbs/thumbnail/photo.webp
# [Images API] Co-located cache HIT (WebDAV): /Photos/.thumbs/thumbnail/photo.webp
# [Images API] WebDAV co-located write failed; falling back to /tmp cache only.
```

### Проблема: WebDAV не даёт права записи для миниатюр
**Решение:** Добавить в `.env.local`:
```env
WEBDAV_COLOCATED_CACHE=false
```
Система продолжит работать через `/tmp` кэш.

### Проблема: Не хочу папку `.thumbs` в директории с фото
**Решение:** Либо отключить co-located кэш:
```env
WEBDAV_COLOCATED_CACHE=false
```
Либо сменить имя папки:
```env
COLOCATED_THUMBS_DIR=.cache
```

## 🎛️ Настройка кэша

### Изменить время жизни кэша
В `src/app/api/images/route.ts`:
```typescript
const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
// Изменить на нужное значение, например:
const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
```

### Изменить качество WebP
В `src/app/api/images/route.ts`:
```typescript
.webp({ quality: 85 })
// Изменить на нужное значение (1-100):
.webp({ quality: 90 }) // выше качество, больше размер
```

### Изменить размеры изображений
В `src/app/api/images/route.ts`:
```typescript
const IMAGE_SIZES = {
  thumbnail: { width: 400, height: 400 },
  medium: { width: 1200, height: 1200 },
  full: { width: 2400, height: 2400 },
}
```

## 📝 Rollback план

Если что-то пошло не так, можно откатиться:

### 1. Восстановить старые файлы из git
```bash
git checkout origin/main -- src/app/api/photos/
git checkout origin/main -- src/app/api/thumbnail/
git checkout origin/main -- src/app/api/medium/
git checkout origin/main -- src/app/api/photo-file/
git checkout origin/main -- src/lib/webdav.ts
git checkout origin/main -- src/components/gallery/PhotoCard.tsx
git checkout origin/main -- src/components/gallery/Lightbox.tsx
```

### 2. Удалить новый API
```bash
rm -rf src/app/api/images/
```

### 3. Пересобрать
```bash
npm run build
npm run start
```

## ✅ Checklist миграции

- [ ] Код обновлен
- [ ] Старый кэш очищен
- [ ] Проект пересобран
- [ ] Галерея загружается корректно
- [ ] Lightbox работает
- [ ] Кэширование работает (X-Cache: HIT)
- [ ] Все layouts работают
- [ ] Performance Score > 90
- [ ] Старые API файлы удалены (опционально)

## 🆘 Поддержка

При возникновении проблем:
1. Проверить логи в консоли браузера
2. Проверить логи сервера
3. Проверить Network tab в DevTools
4. Создать issue в репозитории с детальным описанием проблемы
