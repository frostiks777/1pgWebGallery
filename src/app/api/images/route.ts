import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { WebDAVClient } from 'webdav';

// Try to load sharp — it may not be available on all platforms
let sharpModule: typeof import('sharp') | null = null;
try {
  sharpModule = require('sharp');
} catch {
  // sharp is optional; images will be served without optimization
}

const CACHE_DIR     = process.env.CACHE_DIR || path.join('/tmp', 'photo-gallery-cache');
const THUMBS_SUBDIR = process.env.COLOCATED_THUMBS_DIR || '.thumbs';
const WEBDAV_COLOCATED_ENABLED = process.env.WEBDAV_COLOCATED_CACHE !== 'false';

const IMAGE_SIZES = {
  thumbnail: { width: 400,  height: 400  },
  medium:    { width: 1200, height: 1200 },
  full:      { width: 2400, height: 2400 },
} as const;

type ImageSize = keyof typeof IMAGE_SIZES;

// Track WebDAV write failures with exponential back-off
let webdavWriteFailures    = 0;
let webdavWriteLastFailure = 0;

function isWebdavWriteBackedOff(): boolean {
  if (webdavWriteFailures === 0) return false;
  const backoffs = [30_000, 120_000, 600_000];
  const delay    = backoffs[Math.min(webdavWriteFailures - 1, backoffs.length - 1)];
  return Date.now() - webdavWriteLastFailure < delay;
}

// Track which WebDAV directories we have already verified / created
// during this server process lifetime so we don't re-check on every request.
const verifiedDirs = new Set<string>();

try {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch { /* /tmp may be read-only in rare container setups */ }

// ─────────────────────────────────────────────────────────────────────────────
// Shared WebDAV client (singleton — avoids opening a new TCP connection per req)
// ─────────────────────────────────────────────────────────────────────────────

let _sharedClient: WebDAVClient | null = null;

function getWebDAVClient(): WebDAVClient | null {
  if (_sharedClient) return _sharedClient;
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD } = process.env;
  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('webdav');
    _sharedClient = createClient(WEBDAV_URL, {
      username: WEBDAV_USERNAME,
      password: WEBDAV_PASSWORD,
    }) as WebDAVClient;
    return _sharedClient;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function thumbExt(p: string): string {
  return sharpModule ? '.webp' : (path.extname(p).toLowerCase() || '.jpg');
}

function contentType(p: string): string {
  if (sharpModule) return 'image/webp';
  const ext = path.extname(p).toLowerCase();
  const m: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif',  '.webp': 'image/webp',  '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
  };
  return m[ext] || 'image/jpeg';
}

async function optimizeImage(buf: Buffer, size: ImageSize): Promise<Buffer> {
  if (!sharpModule) return buf;
  const { width, height } = IMAGE_SIZES[size];
  try {
    const out = await sharpModule(buf)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const pct = ((1 - out.byteLength / buf.byteLength) * 100).toFixed(0);
    console.info(`[Images] ${size}: ${buf.byteLength} → ${out.byteLength} bytes (−${pct}%)`);
    return out;
  } catch (err) {
    console.error('[Images] sharp failed, serving original:', err);
    return buf;
  }
}

/** Wrap a promise with a hard timeout so it can never hang. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout (${ms}ms): ${label}`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// /tmp cache  (always available, session-persistent)
// ─────────────────────────────────────────────────────────────────────────────

function tmpPath(photoPath: string, size: ImageSize): string {
  const hash = crypto.createHash('md5').update(`${photoPath}-${size}`).digest('hex');
  return path.join(CACHE_DIR, `${hash}${thumbExt(photoPath)}`);
}

function readTmpCache(photoPath: string, size: ImageSize): Buffer | null {
  try {
    const p = tmpPath(photoPath, size);
    if (!fs.existsSync(p)) return null;
    const age = Date.now() - fs.statSync(p).mtimeMs;
    if (age > 30 * 24 * 3600_000) { try { fs.unlinkSync(p); } catch {} return null; }
    return fs.readFileSync(p);
  } catch { return null; }
}

function writeTmpCache(photoPath: string, size: ImageSize, buf: Buffer): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(tmpPath(photoPath, size), buf);
  } catch { /* not critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located cache — LOCAL demo photos
// ─────────────────────────────────────────────────────────────────────────────

function localThumbPath(photoPath: string, size: ImageSize): string {
  const segs     = photoPath.split('/').filter(Boolean);
  const filename = segs[segs.length - 1];
  const dirs     = segs.slice(0, -1);
  const base     = filename.replace(/\.[^.]+$/, '');
  return path.join(process.cwd(), 'public', ...dirs, THUMBS_SUBDIR, size, `${base}${thumbExt(photoPath)}`);
}

function readLocalThumb(p: string, size: ImageSize): Buffer | null {
  try { const fp = localThumbPath(p, size); return fs.existsSync(fp) ? fs.readFileSync(fp) : null; }
  catch { return null; }
}

function writeLocalThumb(p: string, size: ImageSize, buf: Buffer): void {
  try {
    const fp  = localThumbPath(p, size);
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, buf);
  } catch { /* not critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located cache — WEBDAV
// ─────────────────────────────────────────────────────────────────────────────

function webdavThumbPaths(photoPath: string, size: ImageSize): { dir: string; file: string } {
  const slash   = photoPath.lastIndexOf('/');
  const parent  = slash >= 0 ? (photoPath.slice(0, slash) || '/') : '/';
  const fname   = slash >= 0 ? photoPath.slice(slash + 1) : photoPath;
  const dot     = fname.lastIndexOf('.');
  const base    = dot >= 0 ? fname.slice(0, dot) : fname;
  const dir     = `${parent}/${THUMBS_SUBDIR}/${size}`;
  const file    = `${dir}/${base}${thumbExt(photoPath)}`;
  return { dir, file };
}

async function readWebDAVThumb(photoPath: string, size: ImageSize): Promise<Buffer | null> {
  if (!WEBDAV_COLOCATED_ENABLED) return null;
  const client = getWebDAVClient();
  if (!client) return null;
  try {
    const { file } = webdavThumbPaths(photoPath, size);
    const ab = await withTimeout(
      client.getFileContents(file, { format: 'binary' }) as Promise<ArrayBuffer>,
      10_000, `readThumb ${file}`,
    );
    console.info(`[Images] WebDAV thumb HIT: ${file} (${Buffer.from(ab).byteLength} bytes)`);
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget: writes the optimised thumb back to WebDAV.
 * Never blocks the HTTP response; failures are logged and back-off tracked.
 */
async function writeWebDAVThumb(photoPath: string, size: ImageSize, buf: Buffer): Promise<void> {
  if (!WEBDAV_COLOCATED_ENABLED || isWebdavWriteBackedOff()) return;
  const client = getWebDAVClient();
  if (!client) return;

  try {
    const { dir, file } = webdavThumbPaths(photoPath, size);

    // Ensure directories exist (skip segments we already verified this session)
    const segs = dir.split('/').filter(Boolean);
    let cur    = '';
    for (const seg of segs) {
      cur += '/' + seg;
      if (verifiedDirs.has(cur)) continue;
      try {
        const exists = await withTimeout(client.exists(cur), 5_000, `exists ${cur}`);
        if (!exists) {
          await withTimeout(client.createDirectory(cur), 5_000, `mkdir ${cur}`);
          console.info(`[Images] Created WebDAV dir: ${cur}`);
        }
        verifiedDirs.add(cur);
      } catch {
        // Keep going — directory may already exist via a parallel request
      }
    }

    const ok = await withTimeout(
      client.putFileContents(file, Buffer.from(buf), { overwrite: true }),
      15_000, `putFile ${file}`,
    );

    if (ok === false) {
      throw new Error(`putFileContents returned false for ${file}`);
    }

    webdavWriteFailures    = 0;
    webdavWriteLastFailure = 0;
    console.info(`[Images] WebDAV thumb saved: ${file} (${buf.byteLength} bytes)`);
  } catch (err) {
    webdavWriteFailures++;
    webdavWriteLastFailure = Date.now();
    console.error(`[Images] WebDAV write FAILED [${size}] "${photoPath}":`,
      err instanceof Error ? err.message : String(err),
      `| failures: ${webdavWriteFailures}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch original from WebDAV
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOriginal(photoPath: string): Promise<Buffer> {
  const client = getWebDAVClient();
  if (!client) throw new Error('WebDAV not configured');
  const p  = photoPath.startsWith('/') ? photoPath : '/' + photoPath;
  const ab = await withTimeout(
    client.getFileContents(p, { format: 'binary' }) as Promise<ArrayBuffer>,
    60_000, `fetchOriginal ${p}`,
  );
  return Buffer.from(ab);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/images?path=...&size=thumbnail|medium|full
//
// Lookup order:
//   1. /tmp cache  →  instant
//   2. .thumbs/ on WebDAV (or local)  →  fast
//   3. Fetch original → sharp → respond → background-save to .thumbs/
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath   = searchParams.get('path');
    const sizeParam = searchParams.get('size') || 'medium';

    if (!rawPath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const size    = (sizeParam in IMAGE_SIZES ? sizeParam : 'medium') as ImageSize;
    const decoded = decodeURIComponent(rawPath);
    const isDemo  = decoded.split('/').filter(Boolean)[0] === 'demo-photos';
    const ct      = contentType(decoded);

    const respond = (buf: Buffer, cache: string) =>
      new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': cache,
        },
      });

    // ── 1. /tmp cache ───────────────────────────────────────────────────────
    const tmpHit = readTmpCache(decoded, size);
    if (tmpHit) return respond(tmpHit, 'HIT');

    // ── 2. Co-located .thumbs/ cache ────────────────────────────────────────
    const thumbHit = isDemo
      ? readLocalThumb(decoded, size)
      : await readWebDAVThumb(decoded, size);

    if (thumbHit) {
      writeTmpCache(decoded, size, thumbHit);
      return respond(thumbHit, 'HIT-COLOCATED');
    }

    // ── 3. Fetch original ───────────────────────────────────────────────────
    let original: Buffer;
    if (isDemo) {
      const segs = decoded.split('/').filter(Boolean);
      const fp   = path.join(process.cwd(), 'public', ...segs);
      if (!fs.existsSync(fp)) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }
      original = fs.readFileSync(fp);
    } else {
      try {
        original = await fetchOriginal(decoded);
      } catch (err) {
        console.error('[Images] fetch failed:', err);
        return NextResponse.json(
          { error: `Fetch failed: ${err instanceof Error ? err.message : 'Unknown'}` },
          { status: 500 },
        );
      }
    }

    // ── 4. Optimize ─────────────────────────────────────────────────────────
    const result = await optimizeImage(original, size);

    // ── 5. Save to /tmp (sync, fast) ────────────────────────────────────────
    writeTmpCache(decoded, size, result);

    // ── 6. Save to .thumbs/ AFTER responding (fire-and-forget) ──────────────
    //   This is the critical fix: the HTTP response goes out IMMEDIATELY.
    //   The WebDAV write happens in the background; if it hangs or fails,
    //   it cannot block the user from seeing the photo.
    if (isDemo) {
      writeLocalThumb(decoded, size, result);
    } else {
      writeWebDAVThumb(decoded, size, result).catch(() => {});
    }

    return respond(result, 'MISS');
  } catch (err) {
    console.error('[Images] unhandled:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process image' },
      { status: 500 },
    );
  }
}
