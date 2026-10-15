# План: закрыть #36 (дрейф лок-файла → непригодные локальные замеры)

Ветка `fix/lockfile-drift`, база `origin/main` (349f60f). Issue: #36.

## Проблема (факт, а не гипотеза)

`bun.lock` — единственный закоммиченный лок-файл, CI/прод ставят через
`bun install --frozen-lockfile`. Локально bun не был установлен, ставили через `npm install`.
`package.json` использует кареты, `package-lock.json` в git не лежит → npm резолвит другое.

| пакет | `bun.lock` (= CI/прод) | было локально |
|---|---|---|
| `next` | 16.1.3 | 16.3.6 |
| `@playwright/test` | 1.62.1 | 1.63.0 |

`@playwright/test` привязывает сборку браузера, поэтому расхождение ломает e2e
(`Executable doesn't exist at .../chromium_headless_shell-1248/...`).

## Решение

Enforce вместо просьбы: дрейф становится невозможен физически.

1. **`devEngines.packageManager`** в `package.json`: `{ name: "bun", onFail: "error" }`.
   Проверено на этой машине: `npm install` → `EBADDEVENGINES ... Invalid name "bun" does not
   match "npm"`, exit 1. Без bun на машине и без corepack (corepack bun не поддерживает:
   разрешены только `yarn`, `npm`, `pnpm`).
2. **bun установлен** (`npm install -g bun` → 1.4.3), `bun install --frozen-lockfile`
   реально даёт дерево CI.
3. **Документация**: убрать ложное «`npm install` works for local dev» из `AGENTS.md` и
   шага 1 в `.agents/shared/checks.md`; заменить на `bun install --frozen-lockfile`.
4. **Версии в `package.json` не трогаем.** `@playwright/test` остаётся `^1.62.1`: при
   enforce'нутом bun карета резолвится по `bun.lock` и не плывёт, а точный пин противоречит
   собственной политике Playwright («every time you update Playwright, you might need to
   re-run the install CLI command»).

## Найдено при реализации (регрессия, пойманная до коммита)

`devEngines` срабатывает не только перед `install`/`ci`, но и перед **`npm run` и `npx`**.
То есть `npm run test:e2e` и `npx eslint .`, на которые ссылались `AGENTS.md`, `README.md`,
`checks.md` и скиллы `verify`/`plan`/`tdd`, после правки падают с `EBADDEVENGINES`.
Самое неприятное — `playwright.config.ts`: его `webServer` поднимал dev-сервер через
`npx next dev -p 3100`, и e2e падал с `Process from config.webServer was not able to start`.
Заменено на bun в: `AGENTS.md`, `README.md`, `MEMORY.md`, `.agents/shared/checks.md`,
`.agents/skills/{verify,commit-push,plan,tdd,ponytail,process-inbox}/SKILL.md`,
`playwright.config.ts`, `.github/workflows/ci.yml` (комментарий).

Исторические ADR (`docs/adr/0003`, `0004`) не трогались — это записи о прошлых решениях.

## Проверки (по .agents/shared/checks.md) — фактический прогон

- [x] `bun install --frozen-lockfile` — `next@16.1.3`, `@playwright/test@1.62.1`, `bun.lock` не изменён
- [x] `bun run lint` — 0 ошибок
- [x] `bunx tsc --noEmit` — 0 ошибок
- [x] `bun run test:e2e` — 2 passed, 1 flaky (известный #13, не этот дифф)
- [x] `bun run build` — exit 0, tracing warnings отсутствуют (подтверждает #7 на Next 16.1.3)
- [x] дрейф-тест: `npm install` → exit 1 `EBADDEVENGINES`, `npm run` → exit 1, `npx eslint .` → exit 1

Побочно: в свежем worktree понадобился `bunx playwright install chromium` — кэш браузеров
не совпал с залоченным Playwright. Отдельная боль (#13), здесь только зафиксировано.

## Не в этом PR

- `ci.yml` использует `bun-version: latest` — зависимости заморожены, а toolchain нет.
  Отдельная заявка.
- Issue #13 — остаточный флак первого e2e-прогона.
- `.github/workflows/ci.yml` изменён только в комментарии, но правило human-in-the-loop
  в `AGENTS.md` распространяется на правку workflow вообще — вынесено на твоё усмотрение.