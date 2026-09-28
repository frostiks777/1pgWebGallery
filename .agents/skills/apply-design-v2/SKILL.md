---
name: apply-design-v2
description: Use when implementing or reviewing redesign v2 of «Календарь звонков» — palette «Мята и солнце», live pastel background, glass cards, booking views «Дни»/«Неделя», mobile wizard, manage booking page, organizer panel screens, private bookings list, slots in host time zone. Triggers — «дизайн v2», «редизайн v2», «мята и солнце», «живой фон», «мастер записи», «страница управления встречей», docs/design/v2, ADR-0022/0023/0024. Follow docs/design/v2/implementation-plan.md stage by stage.
---

# Apply design v2

Источник истины — `docs/design/v2/`. Старый скилл `apply-design` описывает v1 и для этой работы не используется.

## Перед началом

1. Прочитать `AGENTS.md`, `MEMORY.md`, `docs/conventions.md`.
2. В `docs/design/v2/` прочитать по порядку: `README.md` → `design-spec.md` → `ux-cases.md` → `test-contract.md` → `implementation-plan.md`.
3. Открыть `docs/design/v2/screenshots/*.png` — это эталон вида. `mockups/*.html` — эталон размеров и цветов (inline-стили только в макетах).
4. Узнать номер текущего этапа: последний коммит ветки `feat/redesign-v2-mint` и чек-лист в описании PR. Работать строго по одному этапу.

## Правила

- Цвета — только токены (`bg-primary`, `bg-highlight`, `text-accent-foreground`, `bg-card/70` …). Hex в компонентах запрещены. `bg-highlight` — только выбранное время, главная кнопка экрана и плашка «Ближайшее свободное».
- Inline `style={{}}` запрещены; нестандартные значения — произвольными классами Tailwind (`h-[52px]`) или ключами из `tailwind.config.snippet.js`.
- Раскладка — через `useMediaQuery('(min-width: 1024px)')`, а не дублирующие блоки с `hidden lg:block`.
- Время встречи всегда выводится с поясом гостя (`formatZoneShort`).
- Никакого автовыбора слота.
- Доступные имена, тексты и маршруты — как в `test-contract.md` §1. Тесты меняются только так, как разрешено в §2; каждую удалённую проверку заменить эквивалентной.
- Сервер меняется только на этапах 1 и 11 (ADR-0022, ADR-0024). `.github/workflows/hexlet-check.yml` не трогать.
- Новые зависимости не добавлять.
- Субагенты — только бесплатные модели (`docs/model-usage.md`).

## Проверка этапа

1. `npm run lint && npm run typecheck && npm test && npm run build` (скилл `verify`); на этапах 4–9 ещё `npm run test:e2e`.
2. `npm run server:dev` + `npm run dev`: открыть затронутые экраны на 1280×820 и 390×844 в светлой и тёмной теме и сравнить с `screenshots/` (скилл `browser-skill`, если доступен).
3. Пройти сценарий с клавиатуры: формат → день → время → имя/email → «Записаться на …» → подтверждение → «Перенести» → «Отменить».
4. Отметить пункты «Готово, когда» из `ux-cases.md` в описании PR.
5. Коммит по плану, Conventional Commits (скилл `commit-push`).

## Если что-то не сходится

- Спека и тест расходятся — приоритет у `test-contract.md`; отличие записать в раздел «Отклонения» `docs/design/v2/README.md` и в PR.
- Решение трудно обратимо или противоречит ADR — остановиться и спросить пользователя (`question(...)`), уведомление — по правилам `AGENTS.md`.
- Две неудачные попытки подряд на одной проверке — правило 2 итераций из `AGENTS.md`.
