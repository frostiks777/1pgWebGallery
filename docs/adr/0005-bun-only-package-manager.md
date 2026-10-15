# ADR 0005: bun — единственный пакетный менеджер, npm запрещён через devEngines

## Status

Proposed — 2026-10-15.

## Context

`bun.lock` — единственный закоммиченный лок-файл, CI и деплой ставят зависимости через
`bun install --frozen-lockfile`. Но `bun` на машинах разработчика не был установлен, а
`AGENTS.md` и шаг 1 в `.agents/shared/checks.md` предписывали `npm install`. При каретных
диапазонах в `package.json` и отсутствии закоммиченного `package-lock.json` npm ре-резолвит
дерево, и `node_modules` перестаёт совпадать с тем, из чего собираются CI и прод.

Фактически зафиксированный дрейф (2026-10-15): `bun.lock` — `next@16.1.3`,
`@playwright/test@1.62.1`; локальная установка npm — `next@16.3.6`, `@playwright/test@1.63.0`.
`@playwright/test` жёстко привязывает сборку браузера, поэтому расхождение ломало e2e
(`Executable doesn't exist at .../chromium_headless_shell-1248/...`) и требовало ручного
обхода `npm install --no-save @playwright/test@1.63.0`, который следующая npm-команда
откатывала. За одну сессию это воспроизвелось трижды.

Последствие выходит за рамки тестов: «зелёная» локальная сборка измеряет не тот Next, что
уедет на прод. Любое утверждение о поведении сборки становилось непригодным без отдельной
сверки версий.

Референс — что делают проекты того же класса: [vercel/next.js], [vercel/turborepo],
[biomejs/biome], [withastro/astro] коммитят ровно один лок-файл, объявляют пакетный
менеджер в `packageManager` точным числом и в `CONTRIBUTING` пишут «всегда запускай X», а не
«X допустим, Y тоже сработает». Ни один из них не держит второй лок-файл.

[vercel/next.js]: https://github.com/vercel/next.js
[vercel/turborepo]: https://github.com/vercel/turborepo
[biomejs/biome]: https://github.com/biomejs/biome
[withastro/astro]: https://github.com/withastro/astro

## Decision

1. `package.json` получает
   `devEngines.packageManager = { name: "bun", onFail: "error" }`. npm проверяет это поле
   перед `install`, `ci`, `run` и внутри своего раннера, поэтому `npm install`, `npm ci`,
   `npm run` и `npx` отвергаются с `EBADDEVENGINES`. Дрейф становится невозможен, а не
   « discouraged».
2. Локальная установка — `bun install --frozen-lockfile`. bun ставится через
   `npm install -g bun`.
3. Кареты в `package.json` остаются. При enforce'нутом bun карета резолвится по `bun.lock`
   и не плывёт; точный пин противоречил бы собственной политике Playwright («every time you
   update Playwright, you might need to re-run the install CLI command»).
4. Чек-чейн переведён на `bun run` / `bunx`; `playwright.config.ts` поднимает dev-сервер
   через `bunx next dev`, а не `npx`.

Почему не Corepack: он поддерживает только `yarn`, `npm` и `pnpm`, bun — нет, поэтому поле
`packageManager` не enforce'илось бы ничем.

## Consequences

** (+) Локальное дерево совпадает с CI/продом по построению, а не по проверке. Регрессия,
которую раньше ловили только по симптому в тестах, теперь невозможна в принципе.
(+) Ложные «измерения» сборки исключены.
(+) Скрипты `package.json` работают как написаны; `bun run build` корректно переваривает
POSIX-префикс `NODE_OPTIONS='…'` и на Windows (проверено).
(+) Обнаруженное попутно: на Next 16.1.3 действительно нет Turbopack tracing warnings —
документированное утверждение про #7 теперь проверено на правильной версии, а не на
подплывшей.
(-) **bun становится обязательным.** Машина без bun не может не только поставить зависимости,
но и запустить ничего: `npx eslint .` тоже падает. Это осознанная плата — иначе дрейф
остаётся.
(-) Обход существует: `npx --force` и `npm install --force` понижают ошибку до warning и
работают. Это ровно та дверь, через которую пришёл #36, поэтому она описана в документации
как запрещённая, а не как решение проблемы.
(-) `devEngines` срабатывает и на `npx`, что потребовало правки `playwright.config.ts` и
всего чек-чейна. Это было найдено до коммита, а не после.
(-) Изменение затрагивает правила работы, а не только конфиг: агент, работавший по старым
инструкциям, получит красный `EBADDEVENGINES` на `npx`.

## Alternatives considered

- **Точный пин `next` и `@playwright/test` в `package.json`.** Сошлось бы с `bun.lock`, но
  замораживает инструмент против обновлений браузера вопреки документации Playwright и не
  защищает остальные ~40 каретных зависимостей.
- **Закоммитить `package-lock.json` рядом с `bun.lock`.** Два лок-файла на один проект
  разъедутся снова: bun при наличии `bun.lock` игнорирует `package-lock.json`, а npm не
  читает `bun.lock` вообще. Две независимые резолвы вместо одной.
- **`onFail: "warn"` вместо `error`.** npm стал бы работать, но `npm install` по-прежнему
  разъезжается с CI — исходная проблема #36 остаётся, только с предупреждением. Отклонено.
- **`npx --force` как штатный способ.** Отклонено: это не enforce, а его отключение.