import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { WebDAVClient } from 'webdav';
import { hasFfmpeg, withFfmpegSlot, probeDuration, extractFrameAt } from '@/lib/ffmpeg';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
// "Trailer" preview generation — turns a video into a short auto-playing
// animated WebP (like a video-hosting-site hover preview): a handful of
// frames sampled at even intervals across the clip, muxed together.
//
// Design constraints (from DEPLOYMENT.md): the production VPS has as little
// as 1 GB disk and a single CPU core, so this route is deliberately stingy:
//   - frames are extracted at a small width (400px) and re-encoded as a
//     lossy animated WebP — typically 20-40 KB per preview, not a video file
//   - only ONE ffmpeg preview job runs at a time server-wide (see `withFfmpegSlot`)
//     so a burst of gallery hovers can't spike CPU/memory on a 1-core box
//   - frames are extracted with precise seeks (`-ss` before `-i`) rather than
//     decoding the whole sampling span, so cost scales with frame COUNT, not
//     with source video length
//   - generated previews are cached exactly like the existing thumbnail
//     pipeline (local disk cache + co-located `.previews/` next to the
//     source, mirrored to WebDAV) so a given video is only ever processed once
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_DIR = process.env.CACHE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.data');
const PREVIEW_SUBDIR = process.env.COLOCATED_PREVIEWS_DIR || '.previews';
const WEBDAV_COLOCATED_ENABLED = process.env.WEBDAV_COLOCATED_CACHE !== 'false';

// Refuse to download/process source videos larger than this — protects the
// (potentially 1 GB total) disk from a single oversized upload.
const MAX_VIDEO_BYTES = Number(process.env.VIDEO_PREVIEW_MAX_MB || 300) * 1024 * 1024;

const DEFAULT_WIDTH = 400; // grid-hover size
const MIN_WIDTH = 240;
const MAX_WIDTH = 960;     // lightbox size cap — still an order of magnitude lighter than the source video
const HOLD_MS = 350; // per-frame display time in the final trailer
const MIN_FRAMES = 10;
const MAX_FRAMES = 30;

function clampWidth(raw: string | null): number {
  const n = raw ? parseInt(raw, 10) : DEFAULT_WIDTH;
  if (!Number.isFinite(n)) return DEFAULT_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n));
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
// Local disk cache (mirrors src/app/api/images/route.ts)
// ─────────────────────────────────────────────────────────────────────────────

function tmpPath(video: string, width: number): string {
  const hash = crypto.createHash('md5').update(`${video}-v1-w${width}`).digest('hex');
  return path.join(CACHE_DIR, `${hash}.preview.webp`);
}

function readTmpCache(video: string, width: number): Buffer | null {
  try {
    const p = tmpPath(video, width);
    if (!fs.existsSync(p)) return null;
    if (Date.now() - fs.statSync(p).mtimeMs > 30 * 86400_000) {
      try { fs.unlinkSync(p); } catch {} return null;
    }
    return fs.readFileSync(p);
  } catch { return null; }
}

function writeTmpCache(video: string, width: number, buf: Buffer): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(tmpPath(video, width), buf);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located .previews/ — LOCAL demo videos
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public');

function safePublicPath(video: string): string | null {
  const segs = video.split('/').filter(s => s.length > 0 && s !== '..' && s !== '.');
  const fp = path.join(PUBLIC_ROOT, ...segs);
  if (fp !== PUBLIC_ROOT && !fp.startsWith(PUBLIC_ROOT + path.sep)) return null;
  return fp;
}

function localPreviewPath(video: string, width: number): string | null {
  const segs = video.split('/').filter(s => s.length > 0 && s !== '..' && s !== '.');
  const filename = segs.pop();
  if (!filename) return null;
  const base = filename.replace(/\.[^.]+$/, '');
  const fp = path.join(PUBLIC_ROOT, ...segs, PREVIEW_SUBDIR, `${base}.w${width}.webp`);
  if (!fp.startsWith(PUBLIC_ROOT + path.sep)) return null;
  return fp;
}

function readLocalPreview(video: string, width: number): Buffer | null {
  try {
    const fp = localPreviewPath(video, width);
    if (!fp) return null;
    return fs.existsSync(fp) ? fs.readFileSync(fp) : null;
  } catch { return null; }
}

function writeLocalPreview(video: string, width: number, buf: Buffer): void {
  try {
    const fp = localPreviewPath(video, width);
    if (!fp) return;
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, buf);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Co-located .previews/ — WEBDAV
// ─────────────────────────────────────────────────────────────────────────────

function davPreviewPaths(video: string, width: number) {
  const slash  = video.lastIndexOf('/');
  const parent = slash >= 0 ? (video.slice(0, slash) || '/') : '/';
  const fname  = slash >= 0 ? video.slice(slash + 1) : video;
  const dot    = fname.lastIndexOf('.');
  const base   = dot >= 0 ? fname.slice(0, dot) : fname;
  const dir    = `${parent}/${PREVIEW_SUBDIR}`;
  return { dir, file: `${dir}/${base}.w${width}.webp` };
}

async function readDavPreview(video: string, width: number): Promise<Buffer | null> {
  if (!WEBDAV_COLOCATED_ENABLED) return null;
  const c = dav();
  if (!c) return null;
  try {
    const { file } = davPreviewPaths(video, width);
    const ab = await withTimeout(
      c.getFileContents(file, { format: 'binary' }) as Promise<ArrayBuffer>,
      10_000, `readPreview ${file}`,
    );
    const b = Buffer.from(ab);
    console.info(`[VideoPreview] DAV preview HIT: ${file} (${fmtBytes(b.byteLength)})`);
    return b;
  } catch { return null; }
}

const verifiedDirs = new Set<string>();

async function writeDavPreview(video: string, width: number, buf: Buffer): Promise<void> {
  if (!WEBDAV_COLOCATED_ENABLED) return;
  const c = dav();
  if (!c) return;
  try {
    const { dir, file } = davPreviewPaths(video, width);
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
    await withTimeout(c.putFileContents(file, Buffer.from(buf), { overwrite: true }), 15_000, `put ${file}`);
    console.info(`[VideoPreview] DAV preview saved: ${file} (${fmtBytes(buf.byteLength)})`);
  } catch (err) {
    console.error(`[VideoPreview] DAV write FAILED "${video}":`, err instanceof Error ? err.message : String(err));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch original video
// ─────────────────────────────────────────────────────────────────────────────

async function statVideoSize(video: string): Promise<number | null> {
  const c = dav();
  if (!c) return null;
  try {
    const stat = await withTimeout(c.stat(video), 10_000, `stat ${video}`);
    const s = 'data' in stat ? stat.data : stat;
    return typeof s.size === 'number' ? s.size : null;
  } catch { return null; }
}

async function fetchOriginalVideo(video: string): Promise<Buffer> {
  const c = dav();
  if (!c) throw new Error('WebDAV not configured');
  const p = video.startsWith('/') ? video : '/' + video;
  const t0 = Date.now();
  const ab = await withTimeout(
    c.getFileContents(p, { format: 'binary' }) as Promise<ArrayBuffer>,
    // A large real-world video (tens to a hundred+ MB) over a slow WebDAV
    // backend can genuinely take a while — this is the most likely place
    // for a big clip's FIRST trailer generation to be slow, so it gets a
    // generous ceiling and its own timing log rather than failing quietly.
    240_000, `fetch ${p}`,
  );
  console.info(`[VideoPreview] Fetched ${fmtBytes(ab.byteLength)} in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${p}`);
  return Buffer.from(ab);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core ffmpeg pipeline — 2-pass: precise-seek frame extraction, then mux.
//
// Frame extraction is done SEQUENTIALLY (not in parallel) even though a
// parallel `-ss` seek-per-frame batch is faster in isolation — on a 1-core
// VPS, N parallel ffmpeg processes just context-switch on the same core
// while competing for the same disk I/O, so sequential is both safer for
// memory and no slower in practice for a handful of frames.
// ─────────────────────────────────────────────────────────────────────────────

function frameCountFor(durationSec: number): number {
  if (durationSec <= 0) return MIN_FRAMES;
  return Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, Math.round(durationSec)));
}

async function extractFramesAndMux(videoFile: string, workDir: string, width: number): Promise<Buffer> {
  const t0 = Date.now();
  const duration = await probeDuration(videoFile);
  const frameCount = frameCountFor(duration);
  console.info(`[VideoPreview] duration=${duration.toFixed(1)}s, extracting ${frameCount} frames`);

  // Sample from the middle 90% of the clip — avoids black intro/outro frames
  // and (per the user's request) deliberately skips frame 0, which is often
  // a black or logo frame rather than representative content.
  const margin = duration > 0 ? duration * 0.05 : 0;
  const usable = duration > 0 ? duration * 0.90 : 0;

  for (let i = 0; i < frameCount; i++) {
    const t = duration > 0
      ? margin + (usable * i) / Math.max(1, frameCount - 1)
      : 0;
    const framePath = path.join(workDir, `f_${String(i).padStart(3, '0')}.jpg`);
    await extractFrameAt(videoFile, framePath, t, { width });
  }
  console.info(`[VideoPreview] ${frameCount} frames extracted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const outFile = path.join(workDir, 'preview.webp');
  const fps = (1000 / HOLD_MS).toFixed(3);
  await execFileAsync('ffmpeg', [
    '-y',
    '-framerate', fps,
    '-i', path.join(workDir, 'f_%03d.jpg'),
    '-c:v', 'libwebp_anim',
    '-lossless', '0',
    '-q:v', '65',
    '-loop', '0',
    '-loglevel', 'error',
    outFile,
  ]);
  console.info(`[VideoPreview] mux done, total ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  return fsp.readFile(outFile);
}

async function generatePreview(videoBuf: Buffer, width: number): Promise<Buffer> {
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vpreview-'));
  const videoFile = path.join(workDir, 'src' + '.mp4'); // extension is cosmetic; ffmpeg sniffs the container
  try {
    await fsp.writeFile(videoFile, videoBuf);
    return await withFfmpegSlot(() => extractFramesAndMux(videoFile, workDir, width));
  } finally {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    if (!(await hasFfmpeg())) {
      return NextResponse.json({ error: 'ffmpeg not available on server' }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path');
    if (!rawPath) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    const decoded = decodeURIComponent(rawPath);
    const isDemo  = decoded.split('/').filter(Boolean)[0] === 'demo-photos';
    const width   = clampWidth(searchParams.get('width'));
    const reqStart = Date.now();
    console.info(`[VideoPreview] request: ${decoded} (width=${width})`);

    const respond = (buf: Buffer, xCache: string) =>
      new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': xCache,
        },
      });

    // ── 1. Local disk cache ────────────────────────────────────────────────
    const tmpHit = readTmpCache(decoded, width);
    if (tmpHit) return respond(tmpHit, 'HIT');

    // ── 2. .previews/ co-located cache ──────────────────────────────────────
    const coHit = isDemo ? readLocalPreview(decoded, width) : await readDavPreview(decoded, width);
    if (coHit) {
      writeTmpCache(decoded, width, coHit);
      return respond(coHit, 'HIT-COLOCATED');
    }

    // ── 3. Fetch original video ─────────────────────────────────────────────
    let original: Buffer;
    if (isDemo) {
      const fp = safePublicPath(decoded);
      if (!fp || !fs.existsSync(fp)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const stat = fs.statSync(fp);
      if (stat.size > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: 'Video too large for preview generation' }, { status: 413 });
      }
      original = fs.readFileSync(fp);
    } else {
      const photosDir = process.env.PHOTOS_DIR || '/Photos';
      const normalizedPhotosDir = photosDir.endsWith('/') ? photosDir : photosDir + '/';
      if (!decoded.startsWith(normalizedPhotosDir) && decoded !== photosDir) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const size = await statVideoSize(decoded);
      if (size !== null && size > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: 'Video too large for preview generation' }, { status: 413 });
      }
      try { original = await fetchOriginalVideo(decoded); }
      catch (err) {
        console.error('[VideoPreview] fetch failed:', err);
        return NextResponse.json({ error: 'Video fetch failed' }, { status: 500 });
      }
    }

    // ── 4. Generate (single ffmpeg slot server-wide) ───────────────────────
    let result: Buffer;
    try {
      result = await generatePreview(original, width);
    } catch (err) {
      console.error('[VideoPreview] ffmpeg pipeline failed:', err);
      return NextResponse.json({ error: 'Preview generation failed' }, { status: 500 });
    }

    // ── 5. Local disk cache (sync, fast) ────────────────────────────────────
    writeTmpCache(decoded, width, result);

    // ── 6. .previews/ (fire-and-forget) ─────────────────────────────────────
    if (isDemo) writeLocalPreview(decoded, width, result);
    else writeDavPreview(decoded, width, result).catch(() => {});

    console.info(`[VideoPreview] MISS total ${((Date.now() - reqStart) / 1000).toFixed(1)}s: ${decoded}`);
    return respond(result, 'MISS');
  } catch (err) {
    console.error('[VideoPreview] unhandled:', err);
    return NextResponse.json({ error: 'Video preview processing failed' }, { status: 500 });
  }
}
