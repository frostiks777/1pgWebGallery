# Photo Gallery — Cyberpunk Light Theme
## Аддон к `BRIEF.md` для репозитория `1pgWebGallery`

Этот документ — **дополнение** к основному брифу (`BRIEF.md`). Там описана тёмная тема Obsidian с янтарным акцентом. Здесь — светлая тема в стиле **«Blade Runner 2049 + Akira»**: выбеленная бумажная кость, hot-magenta × electric-cyan неон, CRT-сканлайны.

Всё остальное (раскладки, карточки, шапка, toolbar, Minimal, Album, Lightbox) работает идентично — меняются только CSS-токены и несколько эффектов-надстроек. Если реализован основной бриф — эта тема включается как альтернативный `data-theme="light"`.

Референс-прототип: `Obsidian.html` — переключатель темы в правом верхнем углу (луна/солнце). Состояние хранится в `localStorage` под ключом `obsidian:theme`.

---

## 1. Концепция

**Выбеленная бумага под неоновым светом.** Кремовый фон (`#ebe6d9`) — как старая газета или фотобумага. Акцент — ядовитый hot-magenta (`#ff1493`) с поддержкой cyan (`#00e5ff`) в градиентах активных состояний и лого. CRT-сканлайны поверх всего документа — как старый монитор. Grain — тот же SVG-нойз, но `mix-blend-mode: multiply` вместо `overlay`.

Главное правило: **неон только там, где активное действие или внимание**. Основной текст — чернильно-тёмный (`#1a0f1a`), не розовый. Статичные элементы — бумажные. Розовый/циан появляется в:
- активных chip-ах (градиент + неоновое подчёркивание)
- лого
- фокусе на карточке (hover-glow)
- favorite-звёздах
- sort-направлении
- selection (выделение текста)

---

## 2. Токены для `[data-theme="light"]`

Добавь блок параллельно основному `:root`. Тема включается атрибутом на `<html>`: `document.documentElement.setAttribute('data-theme', 'light')`.

```css
[data-theme="light"] {
  /* surfaces — bleached bone paper */
  --bg: #ebe6d9;
  --bg-elev: #f5f0e2;
  --bg-card: #ffffff;

  /* foreground — ink */
  --fg: #1a0f1a;
  --muted: rgba(26, 15, 26, 0.62);
  --muted-dim: rgba(26, 15, 26, 0.38);
  --rule: rgba(26, 15, 26, 0.1);

  /* neutral surface chips/buttons */
  --surface-0: rgba(255, 255, 255, 0.55);
  --surface-1: rgba(255, 255, 255, 0.85);
  --surface-border: rgba(26, 15, 26, 0.08);

  /* primary accent — hot magenta */
  --accent: #ff1493;
  --accent-dim: #d9107a;
  --accent-on: #fff6fb;
  --accent-glow: rgba(255, 20, 147, 0.35);
  --accent-tint: rgba(255, 20, 147, 0.10);
  --accent-tint-soft: rgba(255, 20, 147, 0.06);
  --accent-border: rgba(255, 20, 147, 0.40);
  --accent-border-strong: rgba(255, 20, 147, 0.70);
  --accent-badge-bg: rgba(255, 20, 147, 0.14);

  /* secondary accent — electric cyan, only in gradients */
  --cyan: #00e5ff;

  /* active chip — magenta→coral→cyan gradient */
  --accent-active-bg: linear-gradient(135deg, #ff1493 0%, #ff5a8a 50%, #00e5ff 100%);
  --accent-active-shadow:
    0 0 0 1px rgba(255,20,147,0.4),
    0 6px 20px rgba(255,20,147,0.35),
    0 0 40px rgba(0,229,255,0.25),
    inset 0 1px 0 rgba(255,255,255,0.5);

  /* logo — full gradient */
  --logo-bg: linear-gradient(135deg, #ff1493 0%, #00e5ff 100%);
  --logo-fg: #ffffff;
  --logo-shadow:
    0 0 0 1px rgba(255,20,147,0.3),
    0 4px 12px rgba(255,20,147,0.35),
    0 0 24px rgba(0,229,255,0.2);

  /* header */
  --header-bg: linear-gradient(180deg, rgba(245,240,226,0.92) 0%, rgba(235,230,217,0.78) 100%);

  /* shadows — softer, warmer */
  --shadow-card:
    0 1px 2px rgba(0,0,0,0.06),
    0 10px 30px -18px rgba(0,0,0,0.15);
  --shadow-hover:
    0 0 0 3px rgba(255,20,147,0.12),
    0 12px 40px -10px rgba(255,20,147,0.30),
    0 18px 40px -20px rgba(0,0,0,0.18);

  /* grain — softer on light */
  --grain-opacity: 0.04;
  --grain-blend: multiply;

  /* vignette — warm pink glow instead of dark corners */
  --vignette: radial-gradient(
    ellipse at top,
    rgba(255,20,147,0.05) 0%,
    transparent 50%
  );

  /* CRT scanlines — ПОЯВЛЯЮТСЯ только в светлой */
  --scanlines: repeating-linear-gradient(
    0deg,
    rgba(26,15,26,0.022) 0px,
    rgba(26,15,26,0.022) 1px,
    transparent 1px,
    transparent 3px
  );
}
```

Для тёмной темы дефолтно `--scanlines: none;` в основном `:root`, чтобы CRT был эксклюзивом светлой.

---

## 3. Film grain + vignette + scanlines

Один оверлей `body::after` рисует два слоя сразу:

```css
body::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 999;
  background: var(--scanlines), var(--vignette);
}
```

На тёмной теме `--scanlines: none` — работает только виньетка. На светлой — сканлайны 1px через 3px пишутся поверх розового свечения сверху. Grain (`body::before`) — общий для обеих тем, меняется только opacity и blend-mode через токены.

---

## 4. Логотип — градиентная апертура

Контейнер тот же 38×38, но:
- `background: var(--logo-bg)` — magenta → cyan 135°
- `color: var(--logo-fg)` (белый для контраста против неоновых цветов)
- `box-shadow: var(--logo-shadow)` — двойной glow: magenta-ring + cyan-halo
- **`overflow: hidden`** — градиент иначе вылезает за скруглённые углы на некоторых рендерерах

Иконка `ICN.aperture` наследует `currentColor` (белый).

---

## 5. Chip — активное состояние с неоновым подчёркиванием

Базовое и hover — те же токены (`--surface-0`, `--accent-tint-soft`, `--accent-border`). Меняется **активное**:

- Фон: `var(--accent-active-bg)` — тройной градиент magenta→coral→cyan (угол 135°)
- Цвет: `var(--accent-on)` (`#fff6fb` — тёплый белый)
- Shadow: `var(--accent-active-shadow)` — ring + magenta-bloom + cyan-halo + внутренний highlight
- Font-weight: 600, как в тёмной

**Neon underline** (только в светлой теме) — псевдоэлемент `::after` под chip-ом:

```css
[data-theme="light"] .chip-active::after {
  content: ''; position: absolute;
  left: 8px; right: 8px; bottom: -3px; height: 2px;
  background: linear-gradient(90deg, #ff1493, #00e5ff);
  border-radius: 2px;
  filter: blur(0.5px);
  box-shadow: 0 0 8px rgba(255,20,147,0.6);
}
```

Chip должен быть `position: relative`, чтобы псевдо позиционировался корректно. Класс `chip-active` ставится на активный chip (или используй data-атрибут).

Badge `NEW` — тот же механизм (`--accent-badge-bg`), просто в светлой это розовая пилюля на белом chip-е.

---

## 6. Карточки — тонкий неон на hover

Визуально идентично тёмной, но:
- `background: var(--bg-card)` = белый
- Border: `var(--surface-border)` — бледно-чёрный вместо белой alpha
- Hover shadow: `var(--shadow-hover)` (magenta glow 40px + тонкая розовая рамка 3px)
- Верхняя акцент-полоса на hover — тот же линейный градиент через `var(--accent)` (теперь это magenta)

EXIF в caption на hover — цвет `var(--accent)` (тоже magenta).

Favorite-звезда — фон `rgba(255, 255, 255, 0.8)` вместо тёмного, иконка `var(--accent)`. Backdrop-blur остаётся.

**Caption gradient** на светлой теме переверни — `linear-gradient(180deg, transparent, rgba(255,255,255,0.92))` и цвет подписи `var(--muted)`.

---

## 7. Toolbar

- Password input: фон `var(--surface-0)`, border `var(--surface-border)`, лейбл `PASS` — `var(--accent)` (розовый моноширинный).
- Sort direction (`↑`/`↓`): цвет `var(--accent)`.
- Status check: фон `var(--accent-tint)`, рамка `var(--accent-border)`, галочка `var(--accent)`.
- Refresh / login / theme: нейтральные иконки, hover → `var(--accent-tint)` + `var(--accent)`.
- Theme toggle в светлой показывает **солнце** (SVG из `ICN.sun`), клик возвращает в тёмную (показывает луну).

---

## 8. Selection + focus-visible

Неоновое выделение текста и фокус клавиатуры:

```css
::selection { background: var(--accent-glow); color: #fff; }

*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

На тёмной теме `::selection` тоже работает, но glow там янтарный — выглядит органично.

---

## 9. Переключатель темы (JS)

```js
const [theme, setTheme] = useState(() => localStorage.getItem('obsidian:theme') || 'dark');
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('obsidian:theme', theme);
}, [theme]);
```

Иконка переключателя меняется по текущей теме: `ICN.moon` в тёмной (клик → `light`), `ICN.sun` в светлой (клик → `dark`).

---

## 10. Album в светлой теме

Паспарту остаются белыми (`--bg-card: #ffffff`), но на белой бумаге теряются границы. Поэтому:
- Border `1px solid var(--surface-border)` обязателен
- Shadow `var(--shadow-card)` (мягкая, без неона)
- Hover: border → `var(--accent-border)`, лёгкое поднятие `translateY(-1px)`
- Заголовок `— A L B U M —` остаётся моно, цвет `var(--muted)`
- Serif-подзаголовок `Vol. 01 · Eight Frames` — `var(--fg)` (ink)

Не добавляй розовый фон паспарту — бумага должна оставаться белой.

---

## 11. Honeycomb / Wave / Empire в светлой теме

Все работают автоматически — они используют общие токены. Особенности:
- Honeycomb `clip-path` обрезает тени, поэтому hover-glow должен быть на внутреннем wrapper-е (не на самом полигоне)
- Wave — фон карточки белый, grain проявляется поверх → это ок
- Empire hero — добавить border `var(--surface-border)`, чтобы белый hero не сливался с bg

---

## 12. Responsive

Брейкпоинты те же, что в основном брифе. Особенности светлой:
- На мобильной CRT-scanlines могут выглядеть грубо → уменьши `opacity` до `0.012` через media-query
- Grain можно полностью отключить в `prefers-reduced-motion` (хотя он статичен, но уменьшить нагрузку имеет смысл)

---

## 13. Чек-лист приёмки (дополнительно к §15 основного брифа)

- [ ] Блок `[data-theme="light"]` с 30+ переопределёнными токенами
- [ ] `--scanlines: none` в дефолте, `repeating-linear-gradient(...)` в светлой
- [ ] `body::after` рисует `var(--scanlines), var(--vignette)` одной строкой
- [ ] Grain в светлой: `opacity: 0.04`, `mix-blend-mode: multiply`
- [ ] Лого: градиент magenta→cyan, белая иконка, двойной glow, `overflow: hidden`
- [ ] Chip активный: тройной градиент magenta→coral→cyan
- [ ] Chip активный в светлой имеет неоновое подчёркивание `::after` (magenta→cyan, 2px, blur+glow)
- [ ] `::selection` — розовое свечение
- [ ] Переключатель темы: луна/солнце, сохраняется в `localStorage`
- [ ] На светлой Album-паспарту остаются белыми, не розовыми
- [ ] Favorite-звезда в светлой: белая капсула, magenta-звезда
- [ ] Focus-visible outline — `var(--accent)` с offset 2px
- [ ] `prefers-reduced-motion` уменьшает или убирает grain+scanlines

---

## 14. Настроение

Не «фиолетовая киберпанк-помойка». Это **бумага на столе в лаборатории Tyrell Corp**: выбеленная, чуть тёплая, с пыльным grain-ом и еле заметными CRT-линиями от старого монитора рядом. Неон появляется только там, где есть действие — активный chip светится, курсор вызывает розовое свечение на карточке, выделение текста — магента. Всё остальное — чернила на бумаге.

Если неон выглядит везде — это перебор. Тяни в сторону чистоты, где 95% элементов выглядят как печатный журнал, и только яркие триггеры — как неоновая вывеска за окном.
