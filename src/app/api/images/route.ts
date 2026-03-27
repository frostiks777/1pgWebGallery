import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Try to load sharp — it may not be available on all platforms
let sharpModule: typeof import('sharp') | null = null;
try {
  sharpModule = require('sharp');
} catch {
  console.warn('[Images API] Sharp not available — images will be served without optimization');
}

// Fallback local cache in /tmp (always writable; persists within server session)
const CACHE_DIR = process.env.CACHE_DIR || path.join('/tmp', 'photo-gallery-cache');

// Name of the co-located thumbnails subfolder placed next to original photos.
// Set COLOCATED_THUMBS_DIR env to override (e.g. ".cache" or "thumbs").
const THUMBS_SUBDIR = process.env.COLOCATED_THUMBS_DIR || '.thumbs';

// Set WEBDAV_COLOCATED_CACHE=false to disable writing thumbs back to WebDAV
const WEBDAV_COLOCATED_ENABLED = process.env.WEBDAV_COLOCATED_CACHE !== 'false';

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 400,  height: 400  },
  medium:    { width: 1200, height: 1200 },
  full:      { width: 2400, height: 2400 },
} as const;

type ImageSize = keyof typeof IMAGE_SIZES;

// Track consecutive WebDAV write failures to back off gradually.
// Reset to 0 on any successful write.
let webdavWriteConsecFailures = 0;
let webdavWriteLastFailureAt  = 0;

function webdavWriteBackedOff(): boolean {
  if (webdavWriteConsecFailures === 0) return false;
  // Exponential-ish backoff: 30 s → 2 min → 10 min (caps there)
  const intervals = [30_000, 120_000, 600_000];
  const interval  = intervals[Math.min(webdavWriteConsecFailures - 1, intervals.length - 1)];
  return Date.now() - webdavWriteLastFailureAt < interval;
}

// Ensure fallback /tmp cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (err) {
  console.error('[Images API] Cannot create /tmp cache dir:', err);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function thumbExtension(originalPath: string): string {
  return sharpModule ? '.webp' : (path.extname(originalPath).toLowerCase() || '.jpg');
}

function getContentType(photoPath: string): string {
  if (sharpModule) return 'image/webp';
  const ext = path.extname(photoPath).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif',  '.webp': 'image/webp',  '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
  };
  return map[ext] || 'image/jpeg';
}

async function optimizeImage(buffer: Buffer, size: ImageSize): Promise<Buffer> {
  if (!sharpModule) return buffer;
  const { width, height } = IMAGE_SIZES[size];
  try {
    return await sharpModule(buffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (err) {
    console.error('[Images API] Sharp failed, serving original:', err);
    return buffer;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback /tmp cache  (existing mechanism, keeps working when co-located fails)
// ─────────────────────────────────────────────────────────────────────────────

function tmpCachePath(photoPath: string, size: ImageSize): string {
  const hash = crypto.createHash('md5').update(`${photoPath}-${size}`).digest('hex');
  return path.join(CACHE_DIR, `${hash}${thumbExtension(photoPath)}`);
}

function readTmpCache(photoPath: string, size: ImageSize): Buffer | null {
  try {
    const p = tmpCachePath(photoPath, size);
    if (fs.existsSync(p)) {
      const age = Date.now() - fs.statSync(p).mtimeMs;
      if (age < 30 * 24 * 60 * 60 * 1000) return fs.readFileSync(p);
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  } catch (err) {
    console.error('[Images API] /tmp cache read error:', err);
  }
  return null;
}

function writeTmpCache(photoPath: string, size: ImageSize, buf: Buffer): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(tmpCachePath(photoPath, size), buf);
  } catch (err) {
    console.error('[Images API] /tmp cache write error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located cache — LOCAL demo photos
// Stores: public/demo-photos/.thumbs/{size}/{basename}.webp
// ─────────────────────────────────────────────────────────────────────────────

function localColocatedPath(photoPath: string, size: ImageSize): string {
  // photoPath = /demo-photos/sub/photo.jpg
  const segments = photoPath.split('/').filter(Boolean);
  const filename  = segments[segments.length - 1];
  const dirs      = segments.slice(0, -1);
  const basename  = filename.replace(/\.[^.]+$/, '');
  const ext       = thumbExtension(photoPath);
  return path.join(process.cwd(), 'public', ...dirs, THUMBS_SUBDIR, size, `${basename}${ext}`);
}

function readLocalColocated(photoPath: string, size: ImageSize): Buffer | null {
  try {
    const p = localColocatedPath(photoPath, size);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch { /* ignore */ }
  return null;
}

function writeLocalColocated(photoPath: string, size: ImageSize, buf: Buffer): boolean {
  try {
    const p   = localColocatedPath(photoPath, size);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, buf);
    console.log(`[Images API] Co-located cache saved (local): ${p}`);
    return true;
  } catch (err) {
    console.warn('[Images API] Cannot write local co-located cache:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located cache — WEBDAV photos
// Stores: {photosDir}/.thumbs/{size}/{basename}.webp  (on the WebDAV server)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns WebDAV paths for thumb dir and thumb file (posix separators). */
function webdavColocatedPaths(photoPath: string, size: ImageSize): { dir: string; file: string } {
  const lastSlash = photoPath.lastIndexOf('/');
  const parentDir = lastSlash >= 0 ? photoPath.slice(0, lastSlash) || '/' : '/';
  const filename  = lastSlash >= 0 ? photoPath.slice(lastSlash + 1) : photoPath;
  const dotIndex  = filename.lastIndexOf('.');
  const basename  = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
  const ext       = thumbExtension(photoPath);
  const dir  = `${parentDir}/${THUMBS_SUBDIR}/${size}`;
  const file = `${dir}/${basename}${ext}`;
  return { dir, file };
}

async function readWebDAVColocated(photoPath: string, size: ImageSize): Promise<Buffer | null> {
  if (!WEBDAV_COLOCATED_ENABLED) return null;
  try {
    const { createClient } = await import('webdav');
    const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD } = process.env;
    if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) return null;

    const client = createClient(WEBDAV_URL, { username: WEBDAV_USERNAME, password: WEBDAV_PASSWORD });
    const { file } = webdavColocatedPaths(photoPath, size);
    const ab = await client.getFileContents(file, { format: 'binary' }) as ArrayBuffer;
    console.log(`[Images API] Co-located cache HIT (WebDAV): ${file}`);
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/**
 * Writes the optimised thumbnail back to the WebDAV server in the .thumbs/ subfolder.
 *
 * Strategy:
 * - Uses exponential back-off after consecutive failures (30 s → 2 min → 10 min).
 * - Back-off resets to 0 as soon as any write succeeds.
 * - On a read-only WebDAV mount the back-off eventually reaches 10 min, so the
 *   server just keeps using the /tmp cache without hammering the WebDAV server.
 * - Detailed error text is always logged so the admin can diagnose issues.
 */
async function writeWebDAVColocated(photoPath: string, size: ImageSize, buf: Buffer): Promise<void> {
  if (!WEBDAV_COLOCATED_ENABLED) return;
  if (webdavWriteBackedOff()) {
    console.log(`[Images API] WebDAV write skipped (back-off active, ${webdavWriteConsecFailures} consecutive failures)`);
    return;
  }

  try {
    const { createClient } = await import('webdav');
    const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD } = process.env;
    if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) return;

    const client = createClient(WEBDAV_URL, { username: WEBDAV_USERNAME, password: WEBDAV_PASSWORD });
    const { dir, file } = webdavColocatedPaths(photoPath, size);

    // Create each segment of the thumb directory if it does not yet exist.
    // We check existence first to avoid spurious errors from some WebDAV servers
    // that return 405 for MKCOL on existing paths.
    const segments  = dir.split('/').filter(Boolean);
    let currentPath = '';
    for (const seg of segments) {
      currentPath += '/' + seg;
      try {
        const exists = await client.exists(currentPath);
        if (!exists) {
          await client.createDirectory(currentPath);
          console.log(`[Images API] Created WebDAV directory: ${currentPath}`);
        }
      } catch (dirErr) {
        // Some servers throw even when the directory already exists — keep going.
        console.warn(`[Images API] createDirectory(${currentPath}) warning:`,
          dirErr instanceof Error ? dirErr.message : String(dirErr));
      }
    }

    // Convert Buffer → Uint8Array so the webdav library receives a clean
    // ArrayBufferView regardless of any internal Buffer pool offsets.
    const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

    const ok = await client.putFileContents(file, data, { overwrite: true });
    if (!ok) {
      // putFileContents returns false (not an exception) when the server
      // rejects the upload with a non-2xx status.
      throw new Error(`putFileContents returned false — server rejected upload to ${file}`);
    }

    // Success: reset back-off counter
    webdavWriteConsecFailures = 0;
    webdavWriteLastFailureAt  = 0;
    console.log(`[Images API] Co-located cache saved (WebDAV): ${file}`);
  } catch (err) {
    webdavWriteConsecFailures++;
    webdavWriteLastFailureAt = Date.now();
    const msg = err instanceof Error ? `${err.constructor.name}: ${err.message}` : String(err);
    console.warn(`[Images API] WebDAV co-located write FAILED [${size}] "${photoPath}"`);
    console.warn(`[Images API]   Error: ${msg}`);
    console.warn(`[Images API]   Consecutive failures: ${webdavWriteConsecFailures}. Next retry in back-off window.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch original image from WebDAV
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWebDAVImage(photoPath: string): Promise<Buffer> {
  const { createClient } = await import('webdav');
  const { WEBDAV_URL, WEBDAV_USERNAME, WEBDAV_PASSWORD } = process.env;
  if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
    throw new Error('WebDAV credentials not configured');
  }
  const client = createClient(WEBDAV_URL, { username: WEBDAV_USERNAME, password: WEBDAV_PASSWORD });
  const normalizedPath = photoPath.startsWith('/') ? photoPath : '/' + photoPath;
  const ab = await client.getFileContents(normalizedPath, { format: 'binary' }) as ArrayBuffer;
  return Buffer.from(ab);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GET handler
// Cache lookup order:
//   1. /tmp cache  (fastest; session-persistent)
//   2. Co-located cache in .thumbs/ subfolder (persistent across server restarts)
//   3. Fetch original → optimize → save to both caches
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');
    const sizeParam = searchParams.get('size') || 'medium';

    if (!photoPath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const size        = (sizeParam in IMAGE_SIZES ? sizeParam : 'medium') as ImageSize;
    const decodedPath = decodeURIComponent(photoPath);
    const isDemo      = decodedPath.split('/').filter(Boolean)[0] === 'demo-photos';
    const contentType = getContentType(decodedPath);

    const respond = (buf: Buffer, cacheHeader: string) =>
      new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': cacheHeader,
        },
      });

    // ── 1. /tmp cache hit (fastest path) ──────────────────────────────────────
    const tmpHit = readTmpCache(decodedPath, size);
    if (tmpHit) return respond(tmpHit, 'HIT');

    // ── 2. Co-located cache hit (.thumbs/ next to original photo) ─────────────
    let colocatedHit: Buffer | null = null;
    if (isDemo) {
      colocatedHit = readLocalColocated(decodedPath, size);
    } else {
      colocatedHit = await readWebDAVColocated(decodedPath, size);
    }

    if (colocatedHit) {
      // Warm the /tmp cache so subsequent requests won't hit the network
      writeTmpCache(decodedPath, size, colocatedHit);
      return respond(colocatedHit, 'HIT-COLOCATED');
    }

    // ── 3. Fetch original ─────────────────────────────────────────────────────
    let originalBuffer: Buffer;

    if (isDemo) {
      const segments  = decodedPath.split('/').filter(Boolean);
      const localPath = path.join(process.cwd(), 'public', ...segments);
      if (!fs.existsSync(localPath)) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }
      originalBuffer = fs.readFileSync(localPath);
    } else {
      try {
        originalBuffer = await fetchWebDAVImage(decodedPath);
      } catch (err) {
        console.error('[Images API] WebDAV fetch failed:', err);
        return NextResponse.json(
          { error: `Failed to fetch image: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // ── 4. Optimize ───────────────────────────────────────────────────────────
    const resultBuffer = await optimizeImage(originalBuffer, size);

    // ── 5. Always persist to /tmp cache first (fast, local) ──────────────────
    writeTmpCache(decodedPath, size, resultBuffer);

    // ── 6. Persist to co-located cache next to the original photo ─────────────
    //   Local:  sync write — no latency concern
    //   WebDAV: awaited so errors surface in logs and we don't lose the write;
    //           back-off logic inside prevents hammering an unwritable server
    if (isDemo) {
      writeLocalColocated(decodedPath, size, resultBuffer);
    } else {
      await writeWebDAVColocated(decodedPath, size, resultBuffer);
    }

    return respond(resultBuffer, 'MISS');
  } catch (err) {
    console.error('[Images API] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process image' },
      { status: 500 }
    );
  }
}
