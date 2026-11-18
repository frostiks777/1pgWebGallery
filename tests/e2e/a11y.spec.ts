import { test, expect, type Page } from '@playwright/test';

/**
 * #148: the accessibility budget from the daily audit (Lighthouse ≥ 90) can only
 * be measured against the deployed stand, so it cannot gate a pull request.
 * These specs pin the findings the audit reported in code — controls without an
 * accessible name, sub-12px text, low-contrast muted tokens — where a regression
 * is visible before the deploy that would make it visible to a guest.
 *
 * The mobile block exists because Lighthouse measures at 390px wide: the layout
 * chips hide their text label below `sm`, so a chip that reads "Masonry" on a
 * desktop is an unnamed icon button on a phone.
 */

const LAYOUT_COUNT = 6;
const MIN_FONT_PX = 12;
const MIN_CONTRAST = 4.5;

type Offender = { element: string; detail: string };

/** The chip row is the only place with aria-pressed; index = LAYOUT_CHIPS order. */
async function switchLayout(page: Page, index: number): Promise<void> {
  const chip = page.locator('header button[aria-pressed]').nth(index);
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
}

/**
 * Runs inside the page: reports controls without an accessible name and text
 * nodes rendered below MIN_FONT_PX. Shadow roots (the Next dev overlay) are not
 * visited on purpose — they are not part of the app's markup.
 */
async function collectOffenders(page: Page): Promise<{ unnamed: Offender[]; tiny: Offender[] }> {
  return page.evaluate(
    ({ minFontPx }) => {
      const isRendered = (el: Element): boolean => {
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        return el.getClientRects().length > 0;
      };

      const describe = (el: Element): string => {
        const cls = typeof el.className === 'string'
          ? el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
          : '';
        return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
      };

      // innerText, not textContent: a label inside `hidden sm:inline` is not
      // announced on a phone and must not count as the control's name.
      const visibleText = (el: Element): string => (el as HTMLElement).innerText?.trim() ?? '';

      const unnamed: Offender[] = [];
      for (const el of document.querySelectorAll('button, [role="button"]')) {
        if (!isRendered(el)) continue;
        const ariaLabel = (el.getAttribute('aria-label') ?? '').trim();
        if (el.getAttribute('role') === 'button') {
          // Finding 1: a card announced as a button must carry its own name
          // instead of relying on the caption/img alt it happens to contain.
          if (!ariaLabel) unnamed.push({ element: describe(el), detail: 'role="button" без aria-label' });
          continue;
        }
        // Finding 2: an icon-only <button> must be named by aria-label; `title`
        // alone is not announced on touch and is skipped by several screen readers.
        if (ariaLabel) continue;
        const imageAlt = [...el.querySelectorAll('img[alt]')].some(
          (img) => (img.getAttribute('alt') ?? '').trim().length > 0,
        );
        if (!visibleText(el) && !imageAlt) {
          const title = (el.getAttribute('title') ?? '').trim();
          unnamed.push({
            element: describe(el),
            detail: title ? `только title="${title}"` : 'нет доступного имени',
          });
        }
      }

      const tiny: Offender[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = (node.nodeValue ?? '').trim();
        const el = node.parentElement;
        if (!text || !el || !isRendered(el)) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < minFontPx) tiny.push({ element: describe(el), detail: `${size}px — «${text.slice(0, 32)}»` });
      }

      return { unnamed, tiny };
    },
    { minFontPx: MIN_FONT_PX },
  );
}

const format = (layout: string, offenders: Offender[]): string[] =>
  offenders.map(({ element, detail }) => `[${layout}] ${element}: ${detail}`);

test.describe('accessibility (#148)', () => {
  test('every layout gives its controls an accessible name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.obs-photo-card').first()).toBeVisible();

    const problems: string[] = [];
    for (let index = 0; index < LAYOUT_COUNT; index += 1) {
      await switchLayout(page, index);
      problems.push(...format(`layout ${index + 1}`, (await collectOffenders(page)).unnamed));
    }
    expect(problems).toEqual([]);
  });

  test('no visible text renders below 12px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.obs-photo-card').first()).toBeVisible();

    const problems: string[] = [];
    for (let index = 0; index < LAYOUT_COUNT; index += 1) {
      await switchLayout(page, index);
      problems.push(...format(`layout ${index + 1}`, (await collectOffenders(page)).tiny));
    }
    expect(problems).toEqual([]);
  });

  test('an aria-label does not contradict the visible label (WCAG 2.5.3)', async ({ page }) => {
    // Lighthouse found this on the first pass: naming a card "Открыть фото X"
    // while the card shows a frame counter and EXIF line makes the accessible
    // name disagree with what is on screen. The rule is that the visible text
    // must be contained in the name, so decorative duplicates have to be
    // aria-hidden rather than merely considered unimportant.
    await page.goto('/');
    await expect(page.locator('.obs-photo-card').first()).toBeVisible();

    const problems = await page.evaluate(() => {
      // Matches how axe reads it: \`aria-hidden\` is irrelevant here, only CSS
      // visibility. \`opacity: 0\` still counts, which is why hover-only text has
      // to be \`invisible\` rather than merely transparent.
      const visibleText = (el: Element): string => {
        let out = '';
        const walk = (node: Node): void => {
          if (node.nodeType === Node.TEXT_NODE) {
            out += ` ${node.nodeValue ?? ''} `;
            return;
          }
          if (!(node instanceof Element)) return;
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return;
          for (const child of node.childNodes) walk(child);
        };
        for (const child of el.childNodes) walk(child);
        return out.replace(/\s+/g, ' ').trim().toLowerCase();
      };

      // axe compares word sequences, not raw substrings: punctuation and
      // arrows do not count, and the words only have to appear in order.
      const words = (s: string): string[] =>
        s.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, ' ').split(/\s+/).filter(Boolean);

      const contains = (haystack: string[], needle: string[]): boolean => {
        for (let start = 0; start + needle.length <= haystack.length; start += 1) {
          if (needle.every((word, offset) => haystack[start + offset] === word)) return true;
        }
        return false;
      };

      const found: string[] = [];
      for (const el of document.querySelectorAll('button[aria-label], [role="button"][aria-label]')) {
        const visible = words(visibleText(el));
        // Symbols and counters ("(3)") are not a label; only compare when the
        // visible text actually carries a word the guest reads.
        if (!visible.some((word) => /[a-zа-яё]/i.test(word))) continue;
        if (!contains(words(el.getAttribute('aria-label') ?? ''), visible)) {
          found.push(`${visible.join(' ')} ∉ ${el.getAttribute('aria-label')}`);
        }
      }
      return found;
    });

    expect(problems).toEqual([]);
  });

  test('the lightbox follows the same two rules', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.obs-photo-card').first();
    await card.waitFor({ state: 'visible' });
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const { unnamed, tiny } = await collectOffenders(page);
    expect(format('lightbox', unnamed)).toEqual([]);
    expect(format('lightbox', tiny)).toEqual([]);
  });

  test('muted text tokens clear WCAG AA in every palette', async ({ page }) => {
    await page.goto('/');

    const failures = await page.evaluate(
      ({ minContrast }) => {
        type Rgba = [number, number, number, number];

        const parse = (raw: string): Rgba => {
          const value = raw.trim();
          if (value.startsWith('#')) {
            const hex = value.slice(1);
            const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
            // Chrome serialises translucent tokens as 8-digit hex (#1a171599),
            // so the alpha byte has to be read or a 35%-opaque ink looks solid.
            const alpha = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
            return [
              parseInt(full.slice(0, 2), 16),
              parseInt(full.slice(2, 4), 16),
              parseInt(full.slice(4, 6), 16),
              alpha,
            ];
          }
          const nums = (value.match(/[0-9.]+/g) ?? []).map(Number);
          return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 1];
        };

        // The ink is composited onto its surface first: 60%-opaque text is not
        // the fg colour, and comparing the token as-is would flatter contrast.
        const composite = (ink: Rgba, surface: Rgba): Rgba => [
          ink[0] * ink[3] + surface[0] * (1 - ink[3]),
          ink[1] * ink[3] + surface[1] * (1 - ink[3]),
          ink[2] * ink[3] + surface[2] * (1 - ink[3]),
          1,
        ];

        const luminance = ([r, g, b]: Rgba): number => {
          const channel = (v: number): number => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
        };

        const contrast = (a: Rgba, b: Rgba): number => {
          const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
          return (hi + 0.05) / (lo + 0.05);
        };

        const palettes = [
          {
            name: 'obsidian light',
            apply: () => {
              document.documentElement.removeAttribute('data-theme');
              document.documentElement.classList.remove('dark');
            },
          },
          {
            name: 'coordinated light',
            apply: () => {
              document.documentElement.setAttribute('data-theme', 'light');
              document.documentElement.classList.remove('dark');
            },
          },
          {
            name: 'dark',
            apply: () => {
              document.documentElement.setAttribute('data-theme', 'dark');
              document.documentElement.classList.add('dark');
            },
          },
        ];

        const out: string[] = [];
        for (const palette of palettes) {
          palette.apply();
          const style = getComputedStyle(document.documentElement);
          const read = (name: string): Rgba => parse(style.getPropertyValue(name));
          for (const surfaceName of ['--bg', '--bg-card']) {
            const surface = read(surfaceName);
            for (const token of ['--obs-muted', '--obs-muted-dim']) {
              const ratio = contrast(composite(read(token), surface), surface);
              if (ratio < minContrast) {
                out.push(`${palette.name}: ${token} on ${surfaceName} = ${ratio.toFixed(2)}:1`);
              }
            }
          }
        }
        return out;
      },
      { minContrast: MIN_CONTRAST },
    );

    expect(failures).toEqual([]);
  });
});

test.describe('accessibility at phone width', () => {
  // Lighthouse measures the stand at 390x844 — the width where the layout chips
  // lose their text label and the card controls are the only target a thumb hits.
  test.use({ viewport: { width: 390, height: 844 } });

  test('every layout gives its controls an accessible name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.obs-photo-card').first()).toBeVisible();

    const problems: string[] = [];
    for (let index = 0; index < LAYOUT_COUNT; index += 1) {
      await switchLayout(page, index);
      problems.push(...format(`layout ${index + 1}`, (await collectOffenders(page)).unnamed));
    }
    expect(problems).toEqual([]);
  });
});
