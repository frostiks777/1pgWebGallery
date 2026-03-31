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

function sanitizeDir(dir: string): string {
  if (!dir) return '__root__';
  return dir.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function getMetaFile(dir: string): string {
  if (!fs.existsSync(DIR_META_DIR)) fs.mkdirSync(DIR_META_DIR, { recursive: true });
  return path.join(DIR_META_DIR, `${sanitizeDir(dir)}.json`);
}

export function readMeta(dir: string): DirMeta {
  try {
    const file = getMetaFile(dir);
    if (!fs.existsSync(file)) return { hidden: [], panoramas: [], covers: [] };
    const raw = fs.readFileSync(file, 'utf8');
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
