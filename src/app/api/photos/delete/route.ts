import { NextRequest, NextResponse } from 'next/server';
import { isAuthRequired, validateAuthCookie } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { WebDAVClient } from 'webdav';

const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '.data');
const THUMBS_SUBDIR = process.env.COLOCATED_THUMBS_DIR || '.thumbs';
const WEBDAV_COLOCATED_ENABLED = process.env.WEBDAV_COLOCATED_CACHE !== 'false';

let sharp: typeof import('sharp') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharp = require('sharp');
} catch {}

const ALL_SIZES = ['thumbnail', 'medium', 'full'] as const;
type ImageSize = (typeof ALL_SIZES)[number];

const thumbExt = () => (sharp ? '.webp' : '.jpg');

let _dav: WebDAVClient | null = null;
function dav(): WebDAVClient | null {
  if (_dav) return _dav;
  const { WEBDAV_URL: u, WEBDAV_USERNAME: n, WEBDAV_PASSWORD: p } = process.env;
  if (!u || !n || !p) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('webdav');
    _dav = createClient(u, { username: n, password: p }) as WebDAVClient;
    return _dav;
  } catch { return null; }
}

function localCachePath(photo: string, size: ImageSize): string {
  const hash = crypto.createHash('md5').update(`${photo}-${size}-v2`).digest('hex');
  return path.join(CACHE_DIR, `${hash}${thumbExt()}`);
}

function davThumbPath(photo: string, size: ImageSize): string {
  const slash = photo.lastIndexOf('/');
  const parent = slash >= 0 ? (photo.slice(0, slash) || '/') : '/';
  const fname = slash >= 0 ? photo.slice(slash + 1) : photo;
  const dot = fname.lastIndexOf('.');
  const base = dot >= 0 ? fname.slice(0, dot) : fname;
  return `${parent}/${THUMBS_SUBDIR}/${size}/${base}${thumbExt()}`;
}

async function deleteOne(photoPath: string): Promise<{ path: string; ok: boolean; error?: string }> {
  const client = dav();
  const errors: string[] = [];

  // 1. Delete original from WebDAV
  if (client) {
    try {
      await client.deleteFile(photoPath);
    } catch (err) {
      errors.push(`original: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Delete local cache thumbnails
  for (const size of ALL_SIZES) {
    try {
      const p = localCachePath(photoPath, size);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }

  // 3. Delete WebDAV .thumbs
  if (client && WEBDAV_COLOCATED_ENABLED) {
    for (const size of ALL_SIZES) {
      try {
        await client.deleteFile(davThumbPath(photoPath, size));
      } catch {}
    }
  }

  if (errors.length > 0) {
    return { path: photoPath, ok: false, error: errors.join('; ') };
  }
  return { path: photoPath, ok: true };
}

export async function POST(request: NextRequest) {
  if (isAuthRequired() && !validateAuthCookie(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { paths?: string[]; dir?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const paths = body?.paths;
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: 'paths must be a non-empty array' }, { status: 400 });
  }

  if (paths.length > 200) {
    return NextResponse.json({ error: 'Too many paths (max 200)' }, { status: 400 });
  }

  const validPaths = paths.filter(
    (p): p is string => typeof p === 'string' && p.length > 0 && p.length <= 1024 && !p.includes('..'),
  );

  let deleted = 0;
  let errored = 0;
  const results: { path: string; ok: boolean; error?: string }[] = [];

  for (const photoPath of validPaths) {
    const result = await deleteOne(photoPath);
    results.push(result);
    if (result.ok) deleted++;
    else errored++;
  }

  const timestamp = new Date().toISOString();
  console.info(`[Delete] ${deleted} deleted, ${errored} errors | ${timestamp}`);
  if (errored > 0) {
    const failedPaths = results.filter((r) => !r.ok).map((r) => `${r.path}: ${r.error}`);
    console.warn(`[Delete] Failures:`, failedPaths);
  }

  return NextResponse.json({ success: true, deleted, errors: errored });
}
