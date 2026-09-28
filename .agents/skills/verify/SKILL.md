---
name: verify
description: Use before reporting a task as done — «закончил», «готово», «можно коммитить», «всё работает», «проверь». Run the repo's check chain from `.agents/shared/checks.md` (`npx eslint .`, `npx tsc --noEmit`, `npx next build`, `npm run test:e2e`) and report exact results. If anything is red, fix and re-run; never declare done with a red checker. Combined with `commit-push` for the final gate.
---

# Verify

Скилл финальной проверки перед тем, как сказать «готово». Запрещает отмечать задачу выполненной, пока чек-чейн не зелёный. **Источник истины по командам и scope — `.agents/shared/checks.md`**; здесь — как их прогонять и как отчитываться.

## Когда применять

Перед **любым** сообщением «готово» / «можно коммитить» / «всё работает» в чате. В сочетании с `commit-push`: прогон verify → потом коммит. Не наоборот.

## Минимальный чек-чейн (всегда)

```bash
git status --short
git diff --stat
npx eslint .
npx tsc --noEmit
```

| Команда | Что должно быть | Источник истины |
|---|---|---|
| `npx eslint .` | ровно 9 baseline-ошибок `react-hooks/set-state-in-effect`, **новых нет** | `eslint.config.mjs`, `AGENTS.md` → «Known baseline issues» |
| `npx tsc --noEmit` | 0 ошибок | `tsconfig.json` |

Важно: скрипты `package.json` (`dev`/`build`/`start`/`lint`) вызывают `bunx` и падают без `bun` в PATH — запускай инструменты напрямую через `npx` (см. `AGENTS.md` → «Commands»). Прогон через `npm run lint` без `bun` даст ложный красный.

Новая ошибка линта на строке, которую твой diff **не трогал**, — это baseline, а не провал задачи. Всё, что diff затронул или добавил, обязано быть чистым.

## Расширенный чек-чейн (по типу изменения)

### Изменения затронули галерею / лайтбокс / навигацию

```bash
npm run test:e2e    # первый прогон на машине: npx playwright install chromium
```

Расширяй `tests/e2e/gallery.smoke.spec.ts` (или добавляй новый spec), а не проверяй руками — иначе регрессия останется без покрытия.

### Изменения видны пользователю (UI)

Сделай скриншот и посмотри на него: `page.screenshot()` в одноразовом Playwright-скрипте, файл в `.agents-runs/<task-id>/` (gitignored). «Сборка прошла» и «smoke прошёл» не доказывают, что UI выглядит правильно.

### Изменения уровня сборки / next.config / маршрутов

```bash
npx next build      # нужен исходящий HTTPS к fonts.googleapis.com/fonts.gstatic.com (next/font)
```

Сеть заблокирована — это не дефект кода: запусти `npx next dev`, открой затронутый роут и **честно** напиши в отчёте, что production-сборка не проверена. 11 предупреждений Turbopack «Dynamic filesystem access…» в `src/app/api/images/route.ts` и `api/video-stream/route.ts` — baseline. Новые `fs.*Sync` на вычисляемых путях помечай `/*turbopackIgnore: true*/`.

### Добавлен новый API-роут (`src/app/api/*/route.ts`)

Роут автоматически наследует rate-limit и bearer-токен из `src/proxy.ts` (`/api/images` освобождён). Проверь, что это ожидаемое поведение, и что `next build` не добавил новых tracing-предупреждений.

### Изменения затронули CI / workflows / деплой

```bash
git status                    # список файлов
git diff -- .github/workflows # workflow тронут осознанно
git remote -v                 # remote не менялся
```

`deploy.yml` собирает standalone-бандл на раннере и делает `rsync --delete` — ничего durable (`.data/`, `.env.local`) не должно оказаться под `DEPLOY_PATH`.

## Сценарий «всё красное»

1. **Одна и та же ошибка после двух попыток фикса** — остановись, переключись на `interview` (требование понято неверно?) или `plan` (архитектура не та?).
2. **Много ошибок сразу** — вероятно, фундаментальная причина (сломанный импорт, обновление зависимости); не правь по одной, разберись.
3. **Никак не проходит, но код явно ок** — скажи пользователю: «verify красный, причина — <X>, как смотришь на обход через <Y>?».

## Отчёт пользователю (шаблон)

```markdown
✅ Verify:
- `npx eslint .`: 9 baseline-ошибок, новых нет (список совпадает с AGENTS.md).
- `npx tsc --noEmit`: 0 ошибок.
- `npm run test:e2e`: 1/1 passed (gallery.smoke).
- (опц.) `npx next build`: ok.

Что **не** проверялось: <перечислить честно>.
```

## Запрещено

- Писать «готово» / «можно коммитить» до прохода всех пунктов выше.
- Подавлять ошибки (`// @ts-ignore`, `eslint-disable`) чтобы verify прошёл — фиксить причину.
- Игнорировать падение тестов («вроде работает, локально проходит»).
- Прогонять verify не на всех изменённых файлах (частичная проверка = ложное «готово»).

## Связь с правилом «2 итераций»

После **2 неудачных попыток** фикса одной и той же ошибки — стоп и спроси пользователя / пересмотри подход. Это явно зафиксировано в `AGENTS.md` → «Hygiene of context window».

## Связанные скиллы

- **`commit-push`** — после зелёного verify делает коммит и пуш.
- **`tdd`** — unit-раннера в проекте нет; для нетривиальной логики сначала пишем e2e-спеку, потом код (см. `AGENTS.md` → «Agent skills»).
