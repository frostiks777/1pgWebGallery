---
name: apply-design
description: Use when implementing or reviewing the approved UI redesign of «Календарь звонков» (desktop layout A, mobile layout D, light and dark themes) — any task mentioning «редизайн», «новый дизайн», «тёмная тема», «макеты», docs/design. Follow docs/design/implementation-plan.md stage by stage, keep the test contract, compare with screenshots.
---

# Apply design (A + D, light/dark)

Скилл для внедрения утверждённого дизайна. Источник истины — папка `docs/design/`.

## Перед началом

1. Прочитать `AGENTS.md`, `docs/conventions.md`.
2. Прочитать `docs/design/design-spec.md` целиком, затем `docs/design/test-contract.md`.
3. Посмотреть скриншоты `docs/design/screenshots/*.png` — это эталон. HTML в `docs/design/mockups/` — эталон размеров и цветов (inline-стили там только для макета, в коде — Tailwind на токенах).
4. Работать по `docs/design/implementation-plan.md`, один этап — один коммит.

## Правила

- Цвета — только токены (`bg-primary`, `text-muted-foreground`, `bg-surface`, …). Никаких hex-значений и `dark:`-перекрасок цветов в компонентах: тёмная тема получается из переменных. Исключение — затемнение диалога (`bg-stone-900/45 dark:bg-black/60`).
- Никаких inline `style={{}}`; значения, которых нет в шкале Tailwind, — через произвольные значения (`h-[52px]`) или ключи из `tailwind.config.snippet.js`.
- Раскладка выбирается через `useMediaQuery('(min-width: 1024px)')`, а не через `hidden lg:block` у дублирующих блоков.
- Доступные имена элементов (метки, `aria-label`, тексты кнопок) — как в `test-contract.md` и в §7 спеки.
- Бэкенд, API, zod-схемы и `.github/workflows/hexlet-check.yml` не менять.
- Не удалять и не ослаблять существующие проверки в тестах. Разрешённые правки тестов перечислены в `test-contract.md`.

## Проверка этапа

1. `npm run lint && npm run typecheck && npm test && npm run build` — всё зелёное (скилл `verify`).
2. `npm run server:dev` + `npm run dev`, открыть `/` и `/dashboard` на 1280×820 и 390×844 в обеих темах (скилл `browser-skill`, если он доступен), сравнить со скриншотами того же экрана.
3. Пройти сценарий с клавиатуры: дата → слот → «Забронировать» → форма → успех → «Выбрать другое время».
4. Коммит в формате Conventional Commits (скилл `commit-push`).

## Если спека и тесты расходятся

Приоритет у `test-contract.md`. Отличие от макета записать в описание PR и в `docs/design/README.md` (раздел «Отклонения»), а не молча.
