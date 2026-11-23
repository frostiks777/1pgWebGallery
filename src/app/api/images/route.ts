import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import type { WebDAVClient } from 'webdav';
import { isAuthRequired, validateAuthCookie } from '@/lib/auth';
import { isVideoFile } from '@/lib/videoExt';
import { VIDEO_POSTER_WIDTH } from '@/lib/imagePresets';
import { IMAGE_CACHE_KEY_VERSION, DEFAULT_COLOCATED_THUMBS_DIR } from '@/lib/cacheVersions';
import { IMAGE_PRESETS, optimizeImage, thumbExt, isSharpAvailable, fmtBytes, type ImageSize } from '@/lib/imageOptimize';
import { withSharpSlot, SharpQueueFullError } from '@/lib/sharpQueue';
import { MAX_VIDEO_BYTES as MAX_VIDEO_BYTES_LIMIT } from '@/lib/videoLimits';
import {
  hasFfmpeg,
  tryReservePosterSlot,
  withFfmpegSlot,
  extractVideoPosterBuffer,
  extractVideoPosterFromFile,
} from '@/lib/ffmpeg';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_DIR     = process.env.CACHE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.data');
const THUMBS_SUBDIR = process.env.COLOCATED_THUMBS_DIR || DEFAULT_COLOCATED_THUMBS_DIR;
const WEBDAV_COLOCATED_ENABLED = process.env.WEBDAV_COLOCATED_CACHE !== 'false';

// Videos with no companion photo (see src/lib/webdav.ts) are still listed in
// the gallery, using a single extracted frame as their "photo" — the guard is
// against spending minutes of the one CPU core on a huge upload, NOT against
// holding it in memory (that is handled by streaming to disk instead — see
// fetchVideoToFile below).
// Shared with /api/photos, which marks such videos `posterUnavailable` so the
// client does not request a poster that can only be refused.
const MAX_VIDEO_BYTES = MAX_VIDEO_BYTES_LIMIT;

// How long we will wait for a video to arrive from WebDAV before giving up.
// The slowest observed prod pull (96 MB) took 5.5 s; 120 s leaves room for a
// slow uplink without letting a stuck transfer pin the ffmpeg slot.
const VIDEO_DOWNLOAD_TIMEOUT_MS = Number(process.env.VIDEO_DOWNLOAD_TIMEOUT_MS || 120_000);

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

function contentType(p: string): string {
  if (isSharpAvailable()) return 'image/webp';
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

// ─────────────────────────────────────────────────────────────────────────────
// Local disk cache
// ─────────────────────────────────────────────────────────────────────────────

function tmpPath(photo: string, size: ImageSize): string {
  const hash = crypto.createHash('md5').update(`${photo}-${size}-${IMAGE_CACHE_KEY_VERSION}`).digest('hex');
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
// Co-located .thumbs-v2/ — LOCAL demo photos
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
  const fp = path.join(/*turbopackIgnore: true*/ PUBLIC_ROOT, ...segs, THUMBS_SUBDIR, size, `${base}${thumbExt()}`);
  if (!fp.startsWith(PUBLIC_ROOT + path.sep)) return null;
  return fp;
}

function readLocalThumb(photo: string, size: ImageSize): Buffer | null {
  try {
    const fp = localThumbPath(photo, size);
    if (!fp) return null;
    return fs.existsSync(/*turbopackIgnore: true*/ fp) ? fs.readFileSync(/*turbopackIgnore: true*/ fp) : null;
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
// Co-located .thumbs-v2/ — WEBDAV
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

async function statSize(photo: string): Promise<number | null> {
  const c = dav();
  if (!c) return null;
  try {
    const stat = await withTimeout(c.stat(photo), 10_000, `stat ${photo}`);
    const s = 'data' in stat ? stat.data : stat;
    return typeof s.size === 'number' ? s.size : null;
  } catch { return null; }
}

/**
 * Streams a WebDAV video straight to a temp file on disk and returns its path.
 *
 * The old poster path called `fetchOriginal`, i.e.
 * `getFileContents(..., { format: 'binary' })`, which materialises the WHOLE
 * video in the Node heap — 96 MB for C1145.MP4, 134 MB for C1150.MP4, up to
 * `VIDEO_PREVIEW_MAX_MB` (300 MB by default) — purely so ffmpeg could read one
 * frame from it. On the 823 MB prod box that was the difference between a
 * working site and a dead one (MEMORY.md, 2026-10-16): RSS climbed 183 MB →
 * 366 MB while the gallery sat idle, swap churned at 19k–43k pages/s, and the
 * one nginx worker was starved until TLS handshakes stopped completing.
 *
 * Streaming keeps peak process memory flat — measured on prod: 96 MB pulled in
 * 5.5 s with `used` going 477 MB → 461 MB, i.e. no growth at all.
 */
async function fetchVideoToFile(photo: string, destPath: string): Promise<void> {
  const c = dav();
  if (!c) throw new Error('WebDAV not configured');
  const p = photo.startsWith('/') ? photo : '/' + photo;
  // `createReadStream` returns a PassThrough fed by a ranged GET; piping it to
  // a file lets the OS page cache absorb the bytes instead of the V8 heap.
  const src = c.createReadStream(p) as unknown as Readable;
  try {
    await withTimeout(
      pipeline(src, fs.createWriteStream(destPath)),
      VIDEO_DOWNLOAD_TIMEOUT_MS,
      `download ${p}`,
    );
  } catch (err) {
    // `withTimeout` only rejects the wrapper — without destroying the stream a
    // slow or stalled WebDAV would keep filling the disk long after we gave up.
    src.destroy();
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────
    if (isAuthRequired() && !validateAuthCookie(request)) {
      const placeholder = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAD0lEQVQImWNgoBMAAABoMZjDRQAAAAASUVORK5CYII=',
        'base64',
      );
      return new NextResponse(placeholder, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store, max-age=0',
          'X-Cache': 'BLOCKED',
        },
      });
    }
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

    // ── 2. .thumbs-v2/ co-located cache ─────────────────────────────────────
    const thumbHit = isDemo
      ? readLocalThumb(decoded, size)
      : await readDavThumb(decoded, size);

    if (thumbHit) {
      writeTmpCache(decoded, size, thumbHit);
      return respond(thumbHit, 'HIT-COLOCATED');
    }

    // A video with no companion photo (see src/lib/webdav.ts) is still listed
    // in the gallery with `path` pointing at the video itself — its "photo"
    // is a single extracted frame, generated below instead of just reading bytes.
    const isVideo = isVideoFile(decoded);
    if (isVideo && !(await hasFfmpeg())) {
      return NextResponse.json({ error: 'ffmpeg not available on server' }, { status: 501 });
    }

    // Validate the cheap parts (existence, size, PHOTOS_DIR scope) BEFORE taking
    // any slot: a 404/413 must not sit in the sharp queue behind real work.
    let demoFile: string | null = null;
    if (isDemo) {
      demoFile = safePublicPath(decoded);
      if (!demoFile || !fs.existsSync(/*turbopackIgnore: true*/ demoFile)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (isVideo && fs.statSync(/*turbopackIgnore: true*/ demoFile).size > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: 'Video too large for poster generation' }, { status: 413 });
      }
    } else {
      // Restrict WebDAV fetches to PHOTOS_DIR to prevent over-broad reads
      const photosDir = process.env.PHOTOS_DIR || '/Photos';
      const normalizedPhotosDir = photosDir.endsWith('/') ? photosDir : photosDir + '/';
      if (!decoded.startsWith(normalizedPhotosDir) && decoded !== photosDir) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (isVideo) {
        const vsize = await statSize(decoded);
        if (vsize !== null && vsize > MAX_VIDEO_BYTES) {
          return NextResponse.json({ error: 'Video too large for poster generation' }, { status: 413 });
        }
      }
    }

    // ── 3. Poster extraction (videos only) ──────────────────────────────────
    //
    // Its own ffmpeg slot, deliberately WITHOUT a sharp slot: waiting for
    // ffmpeg can take up to 90 s, and one of the two sharp pipelines must stay
    // available for ordinary photos meanwhile.
    let poster: Buffer | null = null;
    if (isVideo) {
      // Never let poster work queue up. The check was previously a flag that got
      // set *inside* the already-queued job, so every request arriving in the same
      // tick passed it and queued anyway; the reservation is taken synchronously,
      // before any await, which is what actually enforces "one poster at a time"
      // (issue #99). Everyone else gets a cheap "try again" that the client
      // retries (#98).
      const releasePosterSlot = tryReservePosterSlot();
      if (!releasePosterSlot) {
        return NextResponse.json(
          { error: 'Poster generation busy' },
          { status: 503, headers: { 'Retry-After': '5' } },
        );
      }
      try {
        if (isDemo) {
          const original = fs.readFileSync(/*turbopackIgnore: true*/ demoFile!);
          poster = await withFfmpegSlot(() =>
            extractVideoPosterBuffer(original, { width: VIDEO_POSTER_WIDTH }),
          );
        } else {
          // Stream to a scratch file, take one frame, delete the file — all
          // inside the single global ffmpeg slot, so at most one source video
          // exists on this box at any moment. See fetchVideoToFile for why this
          // is not fetchOriginal.
          const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vsrc-'));
          const videoPath = path.join(workDir, 'src.mp4');
          try {
            poster = await withFfmpegSlot(async () => {
              await fetchVideoToFile(decoded, videoPath);
              return extractVideoPosterFromFile(videoPath, { width: VIDEO_POSTER_WIDTH });
            });
          } finally {
            fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[Images] poster extraction failed:', err);
        return NextResponse.json({ error: 'Poster generation failed' }, { status: 500 });
      } finally {
        releasePosterSlot();
      }
    }

    // ── 4. Fetch + optimise under the shared sharp queue ────────────────────
    //
    // For a still photo the slot covers the original fetch too: without it, the
    // 22 requests the queue accepts would all pull their originals into the V8
    // heap before the first one reached sharp — the memory half of #144. A video
    // poster is already extracted and small (1280 px), so it only needs the
    // encode slot.
    let result: Buffer;
    try {
      result = await withSharpSlot(async () => {
        const original = poster ?? (isDemo
          ? fs.readFileSync(/*turbopackIgnore: true*/ demoFile!)
          : await fetchOriginal(decoded));
        return optimizeImage(original, size);
      });
    } catch (err) {
      if (err instanceof SharpQueueFullError) {
        return NextResponse.json(
          { error: 'Image processing queue is full' },
          { status: 503, headers: { 'Retry-After': '3' } },
        );
      }
      console.error('[Images] fetch failed:', err);
      return NextResponse.json({ error: 'Image fetch failed' }, { status: 500 });
    }

    // ── 5. Local disk cache (sync, fast) ────────────────────────────────────
    writeTmpCache(decoded, size, result);

    // ── 6. .thumbs-v2/ (fire-and-forget — never blocks the response) ────────
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
