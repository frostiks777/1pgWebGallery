import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { WebDAVClient, FileStat } from 'webdav';
import { getWebDAVClient } from '@/lib/webdav';

// ─────────────────────────────────────────────────────────────────────────────
// Shared state — lives for the lifetime of the server process
// ─────────────────────────────────────────────────────────────────────────────

interface GenerateStatus {
  running: boolean;
  total: number;
  done: number;
  skipped: number;
  errors: number;
  lastPhoto: string;
  startedAt: number | null;
  finishedAt: number | null;
}

const status: GenerateStatus = {
  running: false,
  total: 0,
  done: 0,
  skipped: 0,
  errors: 0,
  lastPhoto: '',
  startedAt: null,
  finishedAt: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Re-use shared infra from the images route (sharp, webdav, presets)
// ─────────────────────────────────────────────────────────────────────────────

let sharp: typeof import('sharp') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharp = require('sharp');
} catch {}

const CACHE_DIR     = process.env.CACHE_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), '.data');
const THUMBS_SUBDIR = process.env.COLOCATED_THUMBS_DIR || '.thumbs';
const WEBDAV_COLOCATED_ENABLED = process.env.WEBDAV_COLOCATED_CACHE !== 'false';

const IMAGE_PRESETS = {
  thumbnail: { width: 800,  height: 800,  quality: 80, effort: 6 },
  medium:    { width: 1400, height: 1400, quality: 72, effort: 4 },
  full:      { width: 2400, height: 2400, quality: 82, effort: 2 },
} as const;

type ImageSize = keyof typeof IMAGE_PRESETS;
const ALL_SIZES: ImageSize[] = ['thumbnail', 'medium', 'full'];

const thumbExt = () => (sharp ? '.webp' : '.jpg');


function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Check if a thumbnail already exists
// ─────────────────────────────────────────────────────────────────────────────

function tmpCacheExists(photo: string, size: ImageSize): boolean {
  const hash = crypto.createHash('md5').update(`${photo}-${size}-v2`).digest('hex');
  const p = path.join(CACHE_DIR, `${hash}${thumbExt()}`);
  return fs.existsSync(p);
}

function writeTmpCache(photo: string, size: ImageSize, buf: Buffer): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const hash = crypto.createHash('md5').update(`${photo}-${size}-v2`).digest('hex');
    fs.writeFileSync(path.join(CACHE_DIR, `${hash}${thumbExt()}`), buf);
  } catch {}
}

function davThumbPaths(photo: string, size: ImageSize) {
  const slash  = photo.lastIndexOf('/');
  const parent = slash >= 0 ? (photo.slice(0, slash) || '/') : '/';
  const fname  = slash >= 0 ? photo.slice(slash + 1) : photo;
  const dot    = fname.lastIndexOf('.');
  const base   = dot >= 0 ? fname.slice(0, dot) : fname;
  const dir    = `${parent}/${THUMBS_SUBDIR}/${size}`;
  return { dir, file: `${dir}/${base}${thumbExt()}` };
}

async function davThumbExists(client: WebDAVClient, photo: string, size: ImageSize): Promise<boolean> {
  try {
    const { file } = davThumbPaths(photo, size);
    return await withTimeout(client.exists(file), 5_000, `exists ${file}`);
  } catch { return false; }
}

const verifiedDirs = new Set<string>();

async function writeDavThumb(client: WebDAVClient, photo: string, size: ImageSize, buf: Buffer): Promise<void> {
  const { dir, file } = davThumbPaths(photo, size);
  const segs = dir.split('/').filter(Boolean);
  let cur = '';
  for (const seg of segs) {
    cur += '/' + seg;
    if (verifiedDirs.has(cur)) continue;
    try {
      if (!await withTimeout(client.exists(cur), 5_000, `exists ${cur}`)) {
        await withTimeout(client.createDirectory(cur), 5_000, `mkdir ${cur}`);
      }
      verifiedDirs.add(cur);
    } catch {}
  }
  await withTimeout(
    client.putFileContents(file, Buffer.from(buf), { overwrite: true }),
    30_000, `put ${file}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimise image (same pipeline as images/route.ts)
// ─────────────────────────────────────────────────────────────────────────────

async function optimizeImage(buf: Buffer, size: ImageSize): Promise<Buffer> {
  if (!sharp) return buf;
  const preset = IMAGE_PRESETS[size];
  try {
    const out = await sharp(buf)
      .rotate()
      .resize(preset.width, preset.height, { fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .webp({ quality: preset.quality, effort: preset.effort, smartSubsample: true })
      .withMetadata({})
      .toBuffer();
    return out.byteLength < buf.byteLength ? out : buf;
  } catch { return buf; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Background generation job
// ─────────────────────────────────────────────────────────────────────────────

async function runGeneration(scopePath?: string) {
  if (status.running) return;

  status.running    = true;
  status.done       = 0;
  status.skipped    = 0;
  status.errors     = 0;
  status.lastPhoto  = '';
  status.startedAt  = Date.now();
  status.finishedAt = null;

  try {
    const client: WebDAVClient | null = (() => {
      try { return getWebDAVClient(); } catch { return null; }
    })();
    const photosDir = process.env.PHOTOS_DIR || '/Photos';
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];
    const thumbsDirName = process.env.COLOCATED_THUMBS_DIR || '.thumbs';

    // Scope walk to sub-directory; scopePath is already validated by POST handler
    const startDir = scopePath
      ? `${photosDir}/${scopePath}`.replace(/\/+/g, '/')
      : photosDir;

    // Collect all photo paths by walking subdirectories with Depth:1 requests
    // (Depth:infinity / { deep: true } is rejected by many WebDAV providers)
    let photoPaths: string[] = [];

    if (client) {
      const walkDir = async (dir: string): Promise<void> => {
        let entries: FileStat[];
        try {
          entries = await withTimeout(
            client.getDirectoryContents(dir) as Promise<FileStat[]>,
            30_000, `list ${dir}`,
          );
        } catch (err) {
          console.warn(`[Generate] Cannot list ${dir}:`, err instanceof Error ? err.message : err);
          return;
        }
        for (const entry of entries) {
          if (entry.type === 'directory') {
            if (entry.basename.startsWith('.')) continue; // skip .thumbs and other hidden dirs
            await walkDir(entry.filename);
          } else if (
            imageExts.includes(entry.basename.toLowerCase().substring(entry.basename.lastIndexOf('.'))) &&
            !entry.filename.split('/').includes(thumbsDirName)
          ) {
            photoPaths.push(entry.filename);
          }
        }
      };
      await walkDir(startDir);
    } else {
      const demoBase = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'demo-photos');
      const demoDir = scopePath ? path.join(demoBase, scopePath) : demoBase;
      const demoPrefix = scopePath ? `/demo-photos/${scopePath}` : '/demo-photos';
      if (fs.existsSync(demoDir)) {
        photoPaths = fs.readdirSync(demoDir)
          .filter(f => imageExts.includes(path.extname(f).toLowerCase()))
          .map(f => `${demoPrefix}/${f}`);
      }
    }

    status.total = photoPaths.length * ALL_SIZES.length;
    console.info(`[Generate] Starting: ${photoPaths.length} photos × ${ALL_SIZES.length} sizes = ${status.total} tasks`);

    for (const size of ALL_SIZES) {
      for (const photoPath of photoPaths) {
        try {
          // Check if already exists in local disk cache
          if (tmpCacheExists(photoPath, size)) {
            // Also check WebDAV co-located if enabled
            if (client && WEBDAV_COLOCATED_ENABLED) {
              const davExists = await davThumbExists(client, photoPath, size);
              if (davExists) {
                status.skipped++;
                status.done++;
                continue;
              }
              // DAV thumb missing — read from local cache and upload
              const hash = crypto.createHash('md5').update(`${photoPath}-${size}-v2`).digest('hex');
              const tmpFile = path.join(CACHE_DIR, `${hash}${thumbExt()}`);
              const cached = fs.readFileSync(tmpFile);
              await writeDavThumb(client, photoPath, size, cached);
              status.done++;
              status.lastPhoto = `${path.basename(photoPath)} [${size}] → DAV`;
              continue;
            }
            status.skipped++;
            status.done++;
            continue;
          }

          // Check WebDAV co-located cache
          if (client && WEBDAV_COLOCATED_ENABLED) {
            const davExists = await davThumbExists(client, photoPath, size);
            if (davExists) {
              status.skipped++;
              status.done++;
              continue;
            }
          }

          // Fetch original and generate
          status.lastPhoto = `${path.basename(photoPath)} [${size}]`;
          let original: Buffer;
          if (client) {
            const p = photoPath.startsWith('/') ? photoPath : '/' + photoPath;
            const ab = await withTimeout(
              client.getFileContents(p, { format: 'binary' }) as Promise<ArrayBuffer>,
              60_000, `fetch ${p}`,
            );
            original = Buffer.from(ab);
          } else {
            const publicRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public');
            const segs = photoPath.split('/').filter(s => s.length > 0 && s !== '..' && s !== '.');
            const fp = path.join(publicRoot, ...segs);
            if (!fp.startsWith(publicRoot + path.sep)) throw new Error('Invalid path');
            original = fs.readFileSync(fp);
          }

          const result = await optimizeImage(original, size);

          // Save to local disk cache
          writeTmpCache(photoPath, size, result);

          // Save to WebDAV co-located
          if (client && WEBDAV_COLOCATED_ENABLED) {
            await writeDavThumb(client, photoPath, size, result);
          }

          status.done++;
          console.info(`[Generate] ${status.done}/${status.total}: ${path.basename(photoPath)} [${size}]`);
        } catch (err) {
          status.errors++;
          status.done++;
          console.error(`[Generate] FAILED ${photoPath} [${size}]:`,
            err instanceof Error ? err.message : String(err));
        }
      }
    }

    status.finishedAt = Date.now();
    const elapsed = ((status.finishedAt - status.startedAt!) / 1000).toFixed(1);
    console.info(`[Generate] Done in ${elapsed}s: ${status.done} total, ${status.skipped} skipped, ${status.errors} errors`);
  } catch (err) {
    console.error('[Generate] Job failed:', err);
    status.finishedAt = Date.now();
  } finally {
    status.running = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET  — returns current generation status
// POST — starts generation in background
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    ...status,
    sharpAvailable: !!sharp,
    progress: status.total > 0 ? Math.round((status.done / status.total) * 100) : 0,
  });
}

export async function POST(request: NextRequest) {
  if (status.running) {
    return NextResponse.json({
      message: 'Generation already in progress',
      ...status,
      progress: status.total > 0 ? Math.round((status.done / status.total) * 100) : 0,
    });
  }

  const body = await request.json().catch(() => ({})) as { path?: string };
  const rawScopePath = body?.path || undefined;

  // Validate scopePath: must be a relative path with no traversal sequences
  let scopePath: string | undefined;
  if (rawScopePath !== undefined) {
    if (
      typeof rawScopePath !== 'string' ||
      rawScopePath.includes('..') ||
      path.isAbsolute(rawScopePath) ||
      rawScopePath.length > 1024
    ) {
      return NextResponse.json({ error: 'Invalid scope path' }, { status: 400 });
    }
    scopePath = rawScopePath;
  }

  // Fire-and-forget: start the job but respond immediately
  runGeneration(scopePath).catch(err => console.error('[Generate] Unhandled:', err));

  return NextResponse.json({
    message: scopePath ? `Generation started for: ${scopePath}` : 'Generation started',
    running: status.running,
    startedAt: status.startedAt,
  });
}
