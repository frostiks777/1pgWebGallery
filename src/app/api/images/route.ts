import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { WebDAVClient } from 'webdav';

// ─────────────────────────────────────────────────────────────────────────────
// Sharp initialisation — the CRITICAL piece for image optimisation.
//
// In standalone mode, Next.js cannot bundle native C++ addons.
// `serverExternalPackages: ['sharp']` in next.config.ts tells Next.js
// to keep sharp as an external require rather than trying to bundle it.
// If it still fails, we log loudly so the admin sees it immediately.
// ─────────────────────────────────────────────────────────────────────────────

let sharp: typeof import('sharp') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharp = require('sharp');
  sharp!.concurrency(1);
  console.info('[Images] sharp loaded OK — image optimisation is ACTIVE');
} catch (err) {
  console.error('[Images] *** SHARP FAILED TO LOAD — images will NOT be optimised! ***');
  console.error('[Images] Error:', err instanceof Error ? err.message : String(err));
  console.error('[Images] Make sure "sharp" is installed: bun add sharp');
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_DIR     = process.env.CACHE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.data');
const THUMBS_SUBDIR = process.env.COLOCATED_THUMBS_DIR || '.thumbs';
const WEBDAV_COLOCATED_ENABLED = process.env.WEBDAV_COLOCATED_CACHE !== 'false';

/**
 * Image size presets — tuned for real-world photos (3000–6000 px originals).
 *
 * Best-practice quality values for WebP:
 *   thumbnail  — viewed at ≤400 px in a grid; quality 50-60 is indistinguishable
 *   medium     — lightbox view; quality 72 is a sweet-spot
 *   full       — download / zoom; quality 82 preserves fine detail
 *
 * `effort` controls the encoder compression level (0-6). Higher = slower
 * but smaller files.  We use max effort for tiny thumbnails and less for
 * large images where encoding time matters.
 */
const IMAGE_PRESETS = {
  thumbnail: { width: 800,  height: 800,  quality: 80, effort: 6 },
  medium:    { width: 1400, height: 1400, quality: 72, effort: 4 },
  full:      { width: 2400, height: 2400, quality: 82, effort: 2 },
} as const;

type ImageSize = keyof typeof IMAGE_PRESETS;

// WebDAV write back-off state
let webdavWriteFailures    = 0;
let webdavWriteLastFailure = 0;
const verifiedDirs         = new Set<string>();

function isWebdavWriteBackedOff(): boolean {
  if (webdavWriteFailures === 0) return false;
  const delays = [30_000, 120_000, 600_000];
  return Date.now() - webdavWriteLastFailure < delays[Math.min(webdavWriteFailures - 1, delays.length - 1)];
}

try { if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch {}

// ─────────────────────────────────────────────────────────────────────────────
// Shared WebDAV client (singleton)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const thumbExt = () => (sharp ? '.webp' : '.jpg');

function contentType(p: string): string {
  if (sharp) return 'image/webp';
  const ext = path.extname(p).toLowerCase();
  const m: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  };
  return m[ext] || 'image/jpeg';
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core optimisation pipeline
//
// Steps:
//   1. Resize to target dimensions (fit: inside, no enlargement)
//   2. Auto-rotate based on EXIF orientation
//   3. Strip ALL metadata (EXIF, ICC, XMP) — saves 50-200 KB per photo
//   4. Encode to WebP with per-size quality & effort settings
//   5. If result is somehow bigger than input (edge case), return original
// ─────────────────────────────────────────────────────────────────────────────

async function optimizeImage(buf: Buffer, size: ImageSize): Promise<Buffer> {
  if (!sharp) {
    console.warn(`[Images] sharp not loaded — returning original (${fmtBytes(buf.byteLength)})`);
    return buf;
  }

  const preset = IMAGE_PRESETS[size];

  try {
    const pipeline = sharp(buf)
      .rotate()                        // auto-rotate from EXIF
      .resize(preset.width, preset.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .removeAlpha()                   // drop alpha for photos — saves bytes
      .webp({
        quality: preset.quality,
        effort: preset.effort,
        smartSubsample: true,          // chroma subsampling for smaller files
        nearLossless: false,
      })
      .withMetadata({})                // strip all EXIF/ICC/XMP

    const out = await pipeline.toBuffer();

    const ratio   = out.byteLength / buf.byteLength;
    const pctSave = ((1 - ratio) * 100).toFixed(1);

    console.info(
      `[Images] ${size}: ${fmtBytes(buf.byteLength)} → ${fmtBytes(out.byteLength)} (−${pctSave}%, ratio ${ratio.toFixed(3)})`
    );

    // Safety: if optimised version is somehow bigger, return original
    if (out.byteLength >= buf.byteLength) {
      console.warn(`[Images] ${size}: optimised is >= original — returning original`);
      return buf;
    }

    return out;
  } catch (err) {
    console.error('[Images] sharp pipeline failed:', err);
    return buf;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Local disk cache
// ─────────────────────────────────────────────────────────────────────────────

function tmpPath(photo: string, size: ImageSize): string {
  const hash = crypto.createHash('md5').update(`${photo}-${size}-v2`).digest('hex');
  return path.join(CACHE_DIR, `${hash}${thumbExt()}`);
}

function readTmpCache(photo: string, size: ImageSize): Buffer | null {
  try {
    const p = tmpPath(photo, size);
    if (!fs.existsSync(p)) return null;
    if (Date.now() - fs.statSync(p).mtimeMs > 30 * 86400_000) {
      try { fs.unlinkSync(p); } catch {} return null;
    }
    return fs.readFileSync(p);
  } catch { return null; }
}

function writeTmpCache(photo: string, size: ImageSize, buf: Buffer): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(tmpPath(photo, size), buf);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located .thumbs/ — LOCAL demo photos
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public');

/**
 * Safely resolve a photo path under public/.
 * Returns null if the resolved path escapes public/ (path traversal guard).
 */
function safePublicPath(photo: string, ...extra: string[]): string | null {
  const segs = photo.split('/').filter(s => s.length > 0 && s !== '..' && s !== '.');
  const fp = path.join(PUBLIC_ROOT, ...segs, ...extra);
  if (fp !== PUBLIC_ROOT && !fp.startsWith(PUBLIC_ROOT + path.sep)) return null;
  return fp;
}

function localThumbPath(photo: string, size: ImageSize): string | null {
  const segs = photo.split('/').filter(s => s.length > 0 && s !== '..' && s !== '.');
  const filename = segs.pop();
  if (!filename) return null;
  const base = filename.replace(/\.[^.]+$/, '');
  const fp = path.join(PUBLIC_ROOT, ...segs, THUMBS_SUBDIR, size, `${base}${thumbExt()}`);
  if (!fp.startsWith(PUBLIC_ROOT + path.sep)) return null;
  return fp;
}

function readLocalThumb(photo: string, size: ImageSize): Buffer | null {
  try {
    const fp = localThumbPath(photo, size);
    if (!fp) return null;
    return fs.existsSync(fp) ? fs.readFileSync(fp) : null;
  }
  catch { return null; }
}

function writeLocalThumb(photo: string, size: ImageSize, buf: Buffer): void {
  try {
    const fp = localThumbPath(photo, size);
    if (!fp) return;
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, buf);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located .thumbs/ — WEBDAV
// ─────────────────────────────────────────────────────────────────────────────

function davThumbPaths(photo: string, size: ImageSize) {
  const slash  = photo.lastIndexOf('/');
  const parent = slash >= 0 ? (photo.slice(0, slash) || '/') : '/';
  const fname  = slash >= 0 ? photo.slice(slash + 1) : photo;
  const dot    = fname.lastIndexOf('.');
  const base   = dot >= 0 ? fname.slice(0, dot) : fname;
  const dir    = `${parent}/${THUMBS_SUBDIR}/${size}`;
  return { dir, file: `${dir}/${base}${thumbExt()}` };
}

async function readDavThumb(photo: string, size: ImageSize): Promise<Buffer | null> {
  if (!WEBDAV_COLOCATED_ENABLED) return null;
  const c = dav();
  if (!c) return null;
  try {
    const { file } = davThumbPaths(photo, size);
    const ab = await withTimeout(
      c.getFileContents(file, { format: 'binary' }) as Promise<ArrayBuffer>,
      10_000, `readThumb ${file}`,
    );
    const b = Buffer.from(ab);
    // Sanity: reject cached files that are suspiciously large (old unoptimised copies)
    if (b.byteLength > 500_000 && size === 'thumbnail') {
      console.warn(`[Images] Cached thumbnail too large (${fmtBytes(b.byteLength)}), regenerating`);
      return null;
    }
    console.info(`[Images] DAV thumb HIT: ${file} (${fmtBytes(b.byteLength)})`);
    return b;
  } catch { return null; }
}

async function writeDavThumb(photo: string, size: ImageSize, buf: Buffer): Promise<void> {
  if (!WEBDAV_COLOCATED_ENABLED || isWebdavWriteBackedOff()) return;
  const c = dav();
  if (!c) return;
  try {
    const { dir, file } = davThumbPaths(photo, size);
    const segs = dir.split('/').filter(Boolean);
    let cur = '';
    for (const seg of segs) {
      cur += '/' + seg;
      if (verifiedDirs.has(cur)) continue;
      try {
        if (!await withTimeout(c.exists(cur), 5_000, `exists ${cur}`)) {
          await withTimeout(c.createDirectory(cur), 5_000, `mkdir ${cur}`);
        }
        verifiedDirs.add(cur);
      } catch {}
    }
    const ok = await withTimeout(
      c.putFileContents(file, Buffer.from(buf), { overwrite: true }),
      15_000, `put ${file}`,
    );
    if (ok === false) throw new Error(`putFileContents returned false for ${file}`);
    webdavWriteFailures = 0;
    webdavWriteLastFailure = 0;
    console.info(`[Images] DAV thumb saved: ${file} (${fmtBytes(buf.byteLength)})`);
  } catch (err) {
    webdavWriteFailures++;
    webdavWriteLastFailure = Date.now();
    console.error(`[Images] DAV write FAILED [${size}] "${photo}":`,
      err instanceof Error ? err.message : String(err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch original from WebDAV
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOriginal(photo: string): Promise<Buffer> {
  const c = dav();
  if (!c) throw new Error('WebDAV not configured');
  const p = photo.startsWith('/') ? photo : '/' + photo;
  const ab = await withTimeout(
    c.getFileContents(p, { format: 'binary' }) as Promise<ArrayBuffer>,
    60_000, `fetch ${p}`,
  );
  return Buffer.from(ab);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath   = searchParams.get('path');
    const sizeParam = searchParams.get('size') || 'medium';

    if (!rawPath) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    const size    = (sizeParam in IMAGE_PRESETS ? sizeParam : 'medium') as ImageSize;
    const decoded = decodeURIComponent(rawPath);
    const isDemo  = decoded.split('/').filter(Boolean)[0] === 'demo-photos';
    const ct      = contentType(decoded);

    const respond = (buf: Buffer, xCache: string) =>
      new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': xCache,
        },
      });

    // ── 1. Local disk cache ────────────────────────────────────────────────
    const tmpHit = readTmpCache(decoded, size);
    if (tmpHit) return respond(tmpHit, 'HIT');

    // ── 2. .thumbs/ co-located cache ────────────────────────────────────────
    const thumbHit = isDemo
      ? readLocalThumb(decoded, size)
      : await readDavThumb(decoded, size);

    if (thumbHit) {
      writeTmpCache(decoded, size, thumbHit);
      return respond(thumbHit, 'HIT-COLOCATED');
    }

    // ── 3. Fetch original ───────────────────────────────────────────────────
    let original: Buffer;
    if (isDemo) {
      const fp = safePublicPath(decoded);
      if (!fp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      original = fs.readFileSync(fp);
    } else {
      // Restrict WebDAV fetches to PHOTOS_DIR to prevent over-broad reads
      const photosDir = process.env.PHOTOS_DIR || '/Photos';
      const normalizedPhotosDir = photosDir.endsWith('/') ? photosDir : photosDir + '/';
      if (!decoded.startsWith(normalizedPhotosDir) && decoded !== photosDir) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      try { original = await fetchOriginal(decoded); }
      catch (err) {
        console.error('[Images] fetch failed:', err);
        return NextResponse.json({ error: 'Image fetch failed' }, { status: 500 });
      }
    }

    // ── 4. Optimise ─────────────────────────────────────────────────────────
    const result = await optimizeImage(original, size);

    // ── 5. Local disk cache (sync, fast) ────────────────────────────────────
    writeTmpCache(decoded, size, result);

    // ── 6. .thumbs/ (fire-and-forget — never blocks the response) ───────────
    if (isDemo) {
      writeLocalThumb(decoded, size, result);
    } else {
      writeDavThumb(decoded, size, result).catch(() => {});
    }

    return respond(result, 'MISS');
  } catch (err) {
    console.error('[Images] unhandled:', err);
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
  }
}
