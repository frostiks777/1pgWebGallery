import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { readMeta, writeMeta } from '../../src/lib/dir-meta';

/**
 * #152: the old sanitizer replaced every non-ASCII character with '_', so two
 * Cyrillic folders of the same length mapped to one .data/dir-meta/*.json and
 * overwrote each other's hidden photos, covers and panorama marks.
 *
 * These tests drive readMeta/writeMeta directly: the defect is in the filename
 * mapping, not in an HTTP handler, and a direct call keeps the dev server out
 * of the failure path. The suite is serial because it inspects the shared
 * .data/dir-meta directory.
 */

const META_DIR = path.join(process.cwd(), '.data', 'dir-meta');

function listMetaFiles(): string[] {
  return fs.existsSync(META_DIR) ? fs.readdirSync(META_DIR).filter((f) => f.endsWith('.json')) : [];
}

function readMetaFiles(): Array<{ file: string; raw: string }> {
  return listMetaFiles().map((file) => ({
    file,
    raw: fs.readFileSync(path.join(META_DIR, file), 'utf8'),
  }));
}

function removeMetaFilesContaining(marker: string): void {
  for (const { file, raw } of readMetaFiles()) {
    if (raw.includes(marker)) fs.rmSync(path.join(META_DIR, file), { force: true });
  }
}

/** The pre-#152 filename is the compatibility contract: those files exist on
 * deployed instances and must stay readable after the upgrade. */
function legacyFileName(dir: string): string {
  return `${dir.replace(/[^a-zA-Z0-9_\-]/g, '_')}.json`;
}

test.describe.configure({ mode: 'serial' });

test('non-ASCII folders get distinct metadata files', () => {
  const stamp = Date.now().toString(36);
  const dirs = ['2024/Лето', '2024/Зима', 'Отпуск 2024', 'Москва 2024', 'Ä/Ö', 'Ä/Ü'];
  const markers = dirs.map((dir, index) => `/${stamp}-${index}.jpg`);

  try {
    dirs.forEach((dir, index) => {
      writeMeta(dir, { hidden: [markers[index]], panoramas: [], covers: [] });
      expect(readMeta(dir).hidden, dir).toEqual([markers[index]]);
    });

    const files = readMetaFiles();
    const owners = markers.map((marker) => files.filter(({ raw }) => raw.includes(marker)));
    for (const [index, owned] of owners.entries()) {
      expect(owned, dirs[index]).toHaveLength(1);
    }

    const fileNames = owners.map(([owned]) => owned.file);
    expect(new Set(fileNames).size).toBe(dirs.length);
  } finally {
    removeMetaFilesContaining(stamp);
  }
});

test('metadata written before the fix is still readable', () => {
  const stamp = Date.now().toString(36);
  const dir = `legacy-${stamp}/Лето`;
  const legacyPath = path.join(META_DIR, legacyFileName(dir));
  const legacyMarker = `/${stamp}-legacy.jpg`;
  const freshMarker = `/${stamp}-fresh.jpg`;

  fs.mkdirSync(META_DIR, { recursive: true });
  fs.writeFileSync(
    legacyPath,
    JSON.stringify({ hidden: [legacyMarker], panoramas: [], covers: [] }),
    'utf8',
  );

  try {
    expect(readMeta(dir).hidden).toEqual([legacyMarker]);

    writeMeta(dir, { hidden: [freshMarker], panoramas: [], covers: [] });
    expect(readMeta(dir).hidden).toEqual([freshMarker]);
  } finally {
    fs.rmSync(legacyPath, { force: true });
    removeMetaFilesContaining(stamp);
  }
});
