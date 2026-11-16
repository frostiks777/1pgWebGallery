import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const CACHE_DIR    = process.env.CACHE_DIR || path.join(process.cwd(), '.data');
const DIR_META_DIR = path.join(CACHE_DIR, 'dir-meta');

export const MAX_PATH_LENGTH = 1024;
export const MAX_DIR_LENGTH  = 512;
export const MAX_PATHS       = 5000;
export const MAX_COVERS      = 3;

export interface DirMeta {
  hidden: string[];
  panoramas: string[];
  covers: string[];
}

// The readable prefix keeps a filename debuggable, but the prefix alone is not
// injective: every non-ASCII character and every slash collapses to '_', so
// '2024/Лето' and '2024/Зима' used to share one file and overwrite each other
// (#152). The hash of the raw path makes the mapping unique.
function sanitizeDir(dir: string): string {
  if (!dir) return '__root__';
  const hash = createHash('sha256').update(dir).digest('hex').slice(0, 12);
  const prefix = dir.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 32);
  return `${prefix}_${hash}`;
}

// Filename written by releases before #152. It stays readable, but new writes
// never target it. We do not delete it after a migration: the old name is lossy
// and may have been shared by several folders, so deleting it would wipe the
// only remaining copy for folders that have not been written since the upgrade.
function legacyFileName(dir: string): string {
  if (!dir) return '__root__';
  return dir.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function getMetaFile(dir: string): string {
  if (!fs.existsSync(DIR_META_DIR)) fs.mkdirSync(DIR_META_DIR, { recursive: true });
  return path.join(DIR_META_DIR, `${sanitizeDir(dir)}.json`);
}

function getLegacyMetaFile(dir: string): string {
  return path.join(DIR_META_DIR, `${legacyFileName(dir)}.json`);
}

export function readMeta(dir: string): DirMeta {
  try {
    const file = getMetaFile(dir);
    const legacy = getLegacyMetaFile(dir);
    const source = fs.existsSync(file) ? file : fs.existsSync(legacy) ? legacy : null;
    if (!source) return { hidden: [], panoramas: [], covers: [] };
    const raw = fs.readFileSync(source, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      hidden:    Array.isArray(parsed.hidden)    ? parsed.hidden    : [],
      panoramas: Array.isArray(parsed.panoramas) ? parsed.panoramas : [],
      covers:    Array.isArray(parsed.covers)    ? parsed.covers    : [],
    };
  } catch {
    return { hidden: [], panoramas: [], covers: [] };
  }
}

export function writeMeta(dir: string, meta: DirMeta): void {
  try {
    const file = getMetaFile(dir);
    fs.writeFileSync(file, JSON.stringify(meta), 'utf8');
  } catch (err) {
    console.error('[DirMeta] Failed to write:', err);
  }
}
