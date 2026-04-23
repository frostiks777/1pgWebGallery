# Photo Gallery — Obsidian Redesign
## Брief для AI-агента: что реализовать в репозитории `1pgWebGallery`

Ты — разработчик, которому передан готовый дизайн. Твоя задача — перенести визуальный язык **Obsidian** в существующий код галереи, сохранив всю функциональность (7 режимов раскладки, пароль, сортировка, refresh, смена темы, звёздочки-favorites).

Референс-прототип: `Obsidian.html` (+ `obsidian-parts.jsx`, `obsidian-card.jsx`, `obsidian-layouts.jsx`).
Весь дизайн можно изучить вживую — переключи режимы, наведись на карточки, посмотри hover-состояния.

---

## 1. Дизайн-токены (CSS custom properties)

Добавь в корневой стиль (`:root`) на тёмной теме. Светлая тема — опционально, тот же набор токенов с инвертированными значениями.

```css
:root {
  /* surfaces */
  --bg: #0b0b0d;                            /* page */
  --bg-elev: #121214;                       /* header, modals */
  --bg-card: #141311;                       /* album mat-board */

  /* foreground */
  --fg: #e9e4d9;                            /* primary text */
  --muted: rgba(233, 228, 217, 0.55);       /* secondary text */
  --muted-dim: rgba(233, 228, 217, 0.30);   /* captions, meta */
  --rule: rgba(255, 255, 255, 0.06);        /* dividers */

  /* accent — amber */
  --amber: #e6a85a;
  --amber-dim: #c88a3e;
  --amber-glow: rgba(230, 168, 90, 0.25);
  --amber-tint: rgba(230, 168, 90, 0.12);
  --amber-border: rgba(230, 168, 90, 0.35);

  /* status */
  --ok: #e6a85a;  /* использовать янтарь как «всё хорошо», не зелёный */

  /* radii */
  --r-xs: 4px;
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 10px;

  /* shadows */
  --shadow-card: 0 1px 2px rgba(0,0,0,0.4), 0 10px 30px -18px rgba(0,0,0,0.7);
  --shadow-hover: 0 0 0 3px rgba(230,168,90,0.12),
                  0 12px 40px -10px rgba(230,168,90,0.25),
                  0 18px 40px -20px rgba(0,0,0,0.8);

  /* fonts */
  --sans: 'Inter', system-ui, -apple-system, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
  --serif: 'Instrument Serif', 'Times New Roman', serif;
}
```

Подключи с Google Fonts:
- Inter (400/500/600/700)
- JetBrains Mono (400/500/600)
- Instrument Serif (400 regular + italic — только для Album и footer)

---

## 2. Film grain + vignette (глобально)

Два фиксированных оверлея на `<body>`. Не интерактивны (`pointer-events: none`), поверх всего кроме лайтбокса.

```css
body::before {
  /* зернистость */
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 1000;
  opacity: 0.055; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
body::after {
  /* мягкая виньетка */
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 999;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%);
}
```

---

## 3. Логотип — «апертура»

Замени текущую фиолетовую каплю на SVG диафрагмы. Контейнер 38×38, `border-radius: var(--r-lg)`, фон `linear-gradient(145deg, #2a1d0e, #15100a)`, цвет иконки `var(--amber)`, тень `0 0 0 1px var(--amber-glow), 0 6px 16px rgba(230,168,90,0.15)`.

SVG (смотри `obsidian-parts.jsx` → `ICN.aperture`): окружность + 6 лучей-лезвий + внутренний круг-заливка.

---

## 4. Шапка (header)

- `position: sticky; top: 0; z-index: 50;`
- Фон: `linear-gradient(180deg, rgba(18,18,20,0.95) 0%, rgba(11,11,13,0.85) 100%)` + `backdrop-filter: blur(14px)`
- Bottom border: `1px solid var(--rule)`
- Padding: `14px 24px 0`, центровать `max-width: 1440px`

Два ряда:
1. **Top row:** слева `[логотип] Photo Gallery / obsidian · demo` (подзаголовок моноширинный, `10px`, `letter-spacing: 0.14em`, uppercase). Справа toolbar.
2. **Mode row:** горизонтальный список chip-ов, `gap: 6px`, `padding: 14px 0 12px`.

---

## 5. Chip (переключатель режимов)

Базовое состояние:
- `padding: 7px 12px; border-radius: var(--r-md);`
- Фон: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.06)`
- Цвет: `rgba(233,228,217,0.75)`, `font-size: 12px`

Hover:
- Фон: `rgba(230,168,90,0.08)`, border: `1px solid var(--amber-border)`, цвет: `var(--amber)`

Активный:
- Фон: `linear-gradient(180deg, #e6a85a 0%, #c88a3e 100%)`
- Цвет: `#1a0f05` (тёмно-коричневый для контраста)
- Border: `1px solid rgba(230,168,90,0.6)`
- Shadow: `0 4px 14px rgba(230,168,90,0.28), inset 0 1px 0 rgba(255,240,210,0.4)`
- `font-weight: 600`

Badge (например, `NEW` у Album): маленький пилюлевый бейдж `9px / 700 / letter-spacing: 0.08em`, янтарный текст на `rgba(230,168,90,0.18)` в неактивном состоянии; в активном — тёмный текст на `rgba(26,15,5,0.25)`.

Transition: `all .18s`.

Список иконок (lucide-style, stroke 1.6): masonry, bento, honeycomb, wave, empire, minimal, album — точные SVG в `obsidian-parts.jsx`.

---

## 6. Toolbar справа

Элементы слева-направо:
1. **Пароль** — инпут шириной `~180px`, фон `rgba(255,255,255,0.03)`, border `1px solid rgba(255,255,255,0.07)`, `border-radius: var(--r-md)`. Внутри слева — лейбл `PASS` моноширинный `10px`, цвет `rgba(230,168,90,0.7)`, `letter-spacing: 0.12em`. Сам `<input type="password">` моноширинный с `letter-spacing: 0.2em` — точки выглядят как в терминале.
2. **Login button** — иконка «стрелка вправо / дверь» (ICN.login), квадрат 30×30.
3. **Sort button** — `[sort-icon] name [↑/↓]` моноширинный. Клик переключает направление. Стрелка — цвет `var(--amber)`.
4. **Status** (зелёная галочка сейчас) — квадратная иконка 30×30 с `var(--amber-tint)` фоном, `var(--amber-border)` рамкой, `var(--amber)` галочкой. Не используй зелёный — у нас один акцент.
5. **Refresh** — иконка 30×30, нейтральная.
6. **Theme toggle** — иконка луны (в тёмной) / солнца (в светлой). 30×30.

Все иконки-кнопки: hover → фон `rgba(255,255,255,0.05)`, цвет `var(--fg)`. Активные → фон `var(--amber-tint)`, цвет `var(--amber)`.

---

## 7. Count row + footer

Между шапкой и сеткой — узкая строка:
```
8 PHOTOS · MASONRY · SORT ↑  ─────────────  OBSIDIAN · V1
```
Моноширинный, `10px`, `letter-spacing: 0.18em`, uppercase, `var(--muted)`. Посередине — тонкий разделитель `1px` `var(--rule)`.

Footer:
- Граница сверху `1px solid var(--rule)`, padding `40px 24px 28px`
- Три колонки: `© photo.gallery · 1pg` (моно, слева) — `every frame a held breath.` (Instrument Serif italic, 14px, центр, `var(--muted)`) — `↑ TOP` (моно, справа).

---

## 8. Карточка фото (Card)

Базовое:
- `overflow: hidden; border-radius: var(--r-sm);`
- Border: `1px solid rgba(255,255,255,0.05)`
- Shadow: `var(--shadow-card)`
- `background: #000` (на случай, если фото не загрузилось)
- Внутри `<img>` на всю площадь, `object-fit: cover`
- Transition: `transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .2s`

Hover (ТОНКО):
- Lift: `transform: translateY(-2px) scale(1.006)`
- Border: `1px solid var(--amber-border)`
- Shadow: `var(--shadow-hover)` (двойной glow: янтарная кайма 3px + мягкая янтарная тень 40px)
- Появляется верхняя янтарная полоса 2px: `linear-gradient(90deg, transparent 0%, var(--amber) 50%, transparent 100%)` — fade in/out `.25s`
- EXIF-подпись в caption плавно появляется (см. ниже)

**Frame number** (необязательно) — моно 10px, `letter-spacing: 0.14em`, `rgba(233,228,217,0.75)` с тенью `0 1px 2px rgba(0,0,0,0.6)`, позиция `top: 8px; left: 10px`. Формат: `01/08`.

**Favorite star** — если `photo.fav === true`:
- Позиция: `top: 8px; right: 8px`, круг 20×20
- Фон: `rgba(11,11,13,0.7)` + `backdrop-filter: blur(6px)`
- Border: `1px solid var(--amber-border)`
- Иконка-звезда `var(--amber)`, 11px, `fill: currentColor`

**Caption bar** (низ карточки):
- Gradient: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)`
- Padding: `18px 10px 6px`
- Моно 10px, `rgba(233,228,217,0.82)`, `letter-spacing: 0.04em`
- Слева — filename (`01_mountain_sunset`)
- Справа — EXIF (`ISO 200 · f/8 · 1/250`), `opacity: 0` по умолчанию, `opacity: 1` на hover, цвет `rgba(230,168,90,0.85)`.

---

## 9. Раскладки (7 режимов)

Контейнер: `max-width: 1440px; margin: 0 auto; padding: 4px 24px 24px`.

### 9.1 Masonry (приоритет)
CSS grid, `grid-template-columns: repeat(5, 1fr)`, `grid-auto-rows: 92px`, `gap: 8px`. Нерегулярные спаны: смесь `span 1/1`, `span 2/2`, `span 1/2`. Паттерн см. в `obsidian-layouts.jsx`.

### 9.2 Bento (приоритет)
`grid-template-columns: repeat(9, 1fr)`, `grid-auto-rows: 62px`, `gap: 8px`. Один hero `span 3/3`, остальные mix из `2/2`, `2/3`, `3/2`.

### 9.3 Album (приоритет) — журнальный
Над сеткой — центрированный заголовок:
```
— A L B U M —     (моно, 10px, letter-spacing: 0.4em, muted)
Vol. 01 · Eight Frames  (Instrument Serif italic, 24px)
```
Сетка `repeat(6, 1fr)`, rows `88px`, `gap: 14px`. Каждая карточка — «паспарту»:
- Контейнер с padding `8px 8px 28px`, фон `var(--bg-card)`, border `1px solid rgba(255,255,255,0.05)`, `border-radius: var(--r-md)`
- Внутри: фото (высота `calc(100% - 20px)`) + подпись filename моно `9px` внизу
- Hover: border → `var(--amber-border)`

### 9.4 Honeycomb
Абсолютное позиционирование шестиугольников с `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`. Размер `170×196`, смещение каждой второй строки на `+90px` по X. Hover → `transform: scale(1.04)`.

### 9.5 Wave
`grid-template-columns: repeat(8, 1fr)`, `gap: 8px`. Каждая карточка получает `transform: translateY(${sin(i/7 * PI * 1.5) * 28}px)`. Высота 180px, `border-radius: 14px`, caption скрыт.

### 9.6 Empire
Трёхколоночный layout с hero в центре:
```
[col1] [ HERO col2 ] [col3]
[col1] [ HERO col2 ] [col3]
```
Слева колонка из 2 фото, центр — один большой hero, справа — 3 маленьких. Gap 10px.

### 9.7 Minimal
Текстовый контактный лист. Однa колонка, max-width 820px, centered. Каждый ряд:
```
01   01_mountain_sunset ★        ISO 200 · f/8 · 1/250
```
Grid `60px 1fr 140px`, gap 16px. Hover ряда → цвет текста → `var(--amber)`. Разделители — `1px solid rgba(255,255,255,0.06)`.

---

## 10. Смена режима

Запоминать в `localStorage` под ключом `obsidian:mode`. При смене — fade-in анимация контейнера сетки:
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Применять к обёртке `<main>` при изменении `mode` (проще всего через `key={mode}` на React-обёртке или принудительное пересоздание узла).

---

## 11. Lightbox (опционально, если уже есть — адаптировать)

При клике на карточку открывать полноэкранный просмотр:
- Фон: `rgba(0,0,0,0.92)` + backdrop-filter blur (10px)
- Фото в центре, `max-height: 85vh; max-width: 90vw`
- Закрытие: Esc, клик по фону, кнопка × (моно 18px, `var(--muted)`)
- Снизу — моно-метадата: `filename · EXIF · «frame N/total»`
- Стрелки ←/→ для навигации (iconBtn 40×40 по краям)
- Над кадром не рисовать грейн (z-index выше 1000)

---

## 12. Светлая тема (переключатель солнце/луна)

Если текущий код поддерживает обе темы — инвертируй токены:
```css
[data-theme="light"] {
  --bg: #f5f1e8;          /* кремовая бумага */
  --bg-elev: #ffffff;
  --bg-card: #ffffff;
  --fg: #1a1715;
  --muted: rgba(26, 23, 21, 0.6);
  --muted-dim: rgba(26, 23, 21, 0.35);
  --rule: rgba(0, 0, 0, 0.08);
  /* amber остаётся таким же — он работает на обеих темах */
  --shadow-card: 0 1px 2px rgba(0,0,0,0.06), 0 8px 24px -12px rgba(0,0,0,0.15);
  --shadow-hover: 0 0 0 3px rgba(230,168,90,0.18),
                  0 12px 40px -10px rgba(230,168,90,0.3),
                  0 8px 24px -12px rgba(0,0,0,0.2);
}
```
Грейн на светлой теме уменьшить: `opacity: 0.03`, `mix-blend-mode: multiply`.

---

## 13. Responsive

- `≥ 1280px` — всё как описано
- `960–1279px` — Masonry: 4 столбца; Bento: 6; Album: 4; Wave: 6
- `640–959px` — 3 столбца у всех сеточных; Honeycomb: 2 ряда по 3
- `< 640px` — 2 столбца; Minimal скрывает EXIF; toolbar становится выдвижным меню по иконке ☰
- Header превращается в одну строку на узких экранах, режимы уезжают в горизонтальный скролл

Моды hit-areas на мобилке — минимум 44×44.

---

## 14. Доступность

- Все кнопки — реальные `<button>` с `aria-label`
- Chip-переключатели — `aria-pressed={active}`
- Lightbox — трап фокуса, Esc закрывает, `role="dialog" aria-modal="true"`
- Контраст `var(--fg)` на `var(--bg)` — 12.8:1 ✅; `var(--muted)` на `var(--bg)` — 7:1 ✅; `var(--amber)` на `var(--bg)` — 8.5:1 ✅
- `prefers-reduced-motion` — отключить fade-in между режимами и hover-lift

---

## 15. Чек-лист приёмки

- [ ] Токены из §1 в `:root`, подключены шрифты
- [ ] Film grain + vignette работают, не перекрывают клики
- [ ] Логотип заменён на апертуру
- [ ] Шапка sticky с blur, два ряда, моно-подзаголовок
- [ ] Chip-ы: base / hover / active / badge — все 4 состояния
- [ ] Toolbar: пароль с лейблом `PASS`, sort с направлением-стрелкой янтарного цвета, иконки-кнопки 30×30
- [ ] Карточка: hover-lift, amber glow shadow, верхняя полоса, EXIF появляется
- [ ] Favorite-звезда в капсуле с blur
- [ ] Все 7 режимов работают, Masonry/Bento/Album доведены до пиксельной точности
- [ ] Album имеет свой header с serif-курсивом
- [ ] Minimal — текстовый контактный лист
- [ ] Переключение режимов сохраняется, fade-in анимация
- [ ] Светлая тема (если есть) — инвертированные токены
- [ ] Responsive 4 брейкпоинта
- [ ] `prefers-reduced-motion` уважается

---

## 16. Файлы с референсом

В проекте лежат:
- `Obsidian.html` — живой прототип со всеми 7 режимами
- `obsidian-parts.jsx` — иконки, данные фото, список режимов
- `obsidian-card.jsx` — реализация карточки с hover
- `obsidian-layouts.jsx` — все 7 раскладок
- `index.html` — канвас с тремя концепциями (Obsidian / Cinema / Darkroom) — победила первая

Сверяйся с Obsidian.html в браузере — там все состояния можно проверить вживую.
