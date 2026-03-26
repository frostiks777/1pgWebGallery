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

**Новая директория кэша:**
```
.cache/
  └── images/
      ├── {hash}-thumbnail.webp
      ├── {hash}-medium.webp
      └── {hash}-full.webp
```

**Старые директории (можно удалить):**
```
.cache/
  ├── images/     # старый формат
  └── medium/     # старый формат
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
# Проверить что директория существует
ls -la .cache/images/

# Проверить логи:
# Должны быть сообщения [Images API] Cached: {path}
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
