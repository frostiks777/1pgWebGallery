// lighthouse-summary.mjs — сводка отчёта Lighthouse в Markdown + JSON.
//
// Зачем отдельный файл: разбор отчёта внутри YAML-шага (`node -e '...'`) нечитаем
// и невозможно проверить локально. Форма `audits` в отчёте менялась между версиями
// Lighthouse (массив → объект), поэтому берём оба варианта.
//
// Использование:
//   node scripts/lighthouse-summary.mjs audit-report
//
// Пороги находятся рядом с числами в отчёте: агент читает сводку и по ним решает,
// что вообще заводить в issue.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Категория → минимальный балл, ниже которого находка становится задачей.
export const THRESHOLDS = {
  performance: 70,
  accessibility: 90,
  'best-practices': 80,
  seo: 80,
};

const CATEGORY_LABELS = {
  performance: 'Производительность',
  accessibility: 'Доступность',
  'best-practices': 'Лучшие практики',
  seo: 'SEO',
};

/** Lighthouse отдаёт `audits` как объект; в старых версиях — как массив. */
const toAudits = (report) => {
  const audits = report?.audits;
  if (!audits) return [];
  return Array.isArray(audits) ? audits : Object.values(audits);
};

const scoreOf = (category) =>
  category?.score === null || category?.score === undefined
    ? null
    : Math.round(category.score * 100);

const findReportJson = (dir) => {
  const candidates = readdirSync(dir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('summary'))
    .map((name) => join(dir, name));
  if (candidates.length === 0) {
    throw new Error(`В каталоге ${dir} нет JSON-отчёта Lighthouse`);
  }
  return candidates[0];
};

export function buildSummary(report, url) {
  const categories = report?.categories ?? {};
  const audits = toAudits(report);

  const scores = {};
  const rows = Object.entries(THRESHOLDS).map(([id, threshold]) => {
    const score = scoreOf(categories[id]);
    scores[id] = score;
    const verdict = score === null ? 'n/a' : score >= threshold ? '✅' : '⚠️ ниже порога';
    return `| ${CATEGORY_LABELS[id]} | ${score ?? 'n/a'} | ${threshold} | ${verdict} |`;
  });

  // Ниже порога — это и есть кандидаты в issue; «всё остальное» — микрооптимизации.
  const failing = audits
    .filter((audit) => audit?.score !== null && audit?.score !== undefined && audit.score < 0.9)
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      score: audit.score,
      displayValue: audit.displayValue ?? null,
      description: (audit.description ?? '').slice(0, 300),
    }))
    .sort((a, b) => a.score - b.score);

  const belowThreshold = Object.entries(THRESHOLDS)
    .filter(([id]) => scores[id] !== null && scores[id] < THRESHOLDS[id])
    .map(([id]) => CATEGORY_LABELS[id]);

  const markdown = [
    `# Lighthouse: ${url ?? report?.finalDisplayedUrl ?? 'unknown'}`,
    '',
    `Дата: ${new Date().toISOString()}`,
    '',
    '| Категория | Балл | Порог | Итог |',
    '|---|---|---|---|',
    ...rows,
    '',
    belowThreshold.length > 0
      ? `## Ниже порога: ${belowThreshold.join(', ')} — это то, из чего заводится issue`
      : '## Все категории выше порогов — issue не заводится',
    '',
    '## Аудиты с оценкой ниже 0.9',
    '',
    '| Аудит | Оценка | Значение |',
    '|---|---|---|',
    ...failing.map((a) => `| ${a.title} | ${a.score} | ${a.displayValue ?? '—'} |`),
    '',
  ].join('\n');

  return {
    markdown,
    json: {
      url: url ?? report?.finalDisplayedUrl ?? null,
      at: new Date().toISOString(),
      scores,
      thresholds: THRESHOLDS,
      belowThreshold,
      failing,
    },
  };
}

const isMain =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop());

if (isMain) {
  const dir = process.argv[2] ?? 'audit-report';
  const url = process.env.APP_URL ?? null;
  const report = JSON.parse(readFileSync(findReportJson(dir), 'utf8'));
  const { markdown, json } = buildSummary(report, url);
  writeFileSync(join(dir, 'summary.md'), markdown);
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(json, null, 2));
  console.log(markdown);
}