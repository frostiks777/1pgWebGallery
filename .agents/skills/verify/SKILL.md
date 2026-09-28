---
name: verify
description: Use before reporting a task as done — «закончил», «готово», «можно коммитить», «всё работает», «проверь». Run the full local check chain (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` when relevant) and report exact results. If anything is red, fix and re-run; never declare done with a red checker. Combined with `commit-push` skill for the final gate.
---

# Verify

Скилл финальной проверки перед тем, как сказать «готово». Запрещает отмечать задачу выполненной, пока полный чек-чейн не зелёный.

## Когда применять

Перед **любым** сообщением «готово» / «можно коммитить» / «всё работает» в чате. В сочетании с `commit-push`: прогон verify → потом коммит. Не наоборот.

## Минимальный чек-чейн (всегда)

```bash
git status --short
git diff --stat
npm run lint
npm run typecheck
npm test
```

| Команда | Что должно быть | Источник истины |
|---|---|---|
| `npm run lint` | `0 errors` | `.eslint` flat config в корне |
| `npm run typecheck` | `0 errors` | `tsconfig.json` strict |
| `npm test` | `All tests passed` (или N/N пройдено) | Vitest 4 |

Допустимый baseline-warning фиксируется в `MEMORY.md` (раздел «Исправленные ошибки»). Если новый warning — стоп, чинить **до** коммита.

## Расширенный чек-чейн (по типу изменения)

### Изменения затронули бэкенд / БД / схему Drizzle

Дополнительно:

```bash
npm run build         # tsc --noEmit && vite build — фронт собирается
npm run server:dev    # в фоне, опционально
curl http://localhost:3000/health   # или browser.navigate
```

### Изменения затронули UI / компоненты shadcn

Дополнительно:

```bash
npm run dev           # в фоне
browser.navigate("http://localhost:5173/<route>")   # через browser-инструмент opencode
# визуальная проверка: нет красных ошибок в консоли, ожидаемый элемент рендерится
```

### Изменения затронули Drizzle-схему (`server/db/schema.ts`)

```bash
npm run db:generate   # генерация миграции
npm run db:push       # применение к локальной БД
# (опц.) перезапуск server:dev и smoke-тест эндпоинта
```

### Изменения затронули CI / workflows / публичные конфиги

```bash
git status            # посмотреть список файлов
git remote -v         # убедиться, что имя репозитория не изменено
git log -p -- .github/workflows/hexlet-check.yml | head -50   # hexlet-check НЕ тронут
```

## Сценарий «всё красное»

1. **Одна и та же ошибка после двух попытокфиксa** — остановись, переключись на `interview` (м.б. требование понято неверно) или `plan` (м.б. архитектура не та).
2. **> 5 ошибок одновременно** — возможно, фундаментальная ошибка (например, обновил `drizzle-orm` и сломался `schema.ts`); не правь по одной, разберись в причине.
3. **Никак не проходит, но при этом ясно, что код ок** — скажи пользователю «verify красный, причина — <X>, как смотришь на обход через <Y>?».

## Отчёт пользователю (шаблон)

```markdown
✅ Verify:
- `npm run lint`: 0 errors (1 допустимый warning в `button.tsx` — зафиксирован в MEMORY.md).
- `npm run typecheck`: 0 errors.
- `npm test`: 6/6 passed (10.26s).
- (опц.) `npm run build`: ok (171.52 kB JS, 9.91 kB CSS).

Что **не** проверялось: <если что-то было пропущено — перечислить честно>.
```

## Запрещено

- Писать «готово» / «можно коммитить» до прохода всех пунктов выше.
- Подавлять ошибки (`// @ts-ignore`, `eslint-disable`) чтобы verify прошёл — фиксить причину.
- Игнорировать падение тестов («вроде работает, локально проходит»).
- Прогонять verify не на всех изменённых файлах (частичная проверка = ложное «готово»).

## Связь с правилом «2 итераций»

После **2 неудачных попыток** фикса одной и той же ошибки — стоп и спроси пользователя / пересмотри подход. Это явно зафиксировано в `AGENTS.md` → «Hygiene of context window». Verify сам по себе не сбрасывает сессию, но фиксирует момент переключения.

## Связанные скиллы

- **`commit-push`** — после зелёного verify делает коммит и пуш.
- **`tdd`** — для нетривиальной логики: red→green→refactor; verify тут — финальная проверка перед коммитом.
