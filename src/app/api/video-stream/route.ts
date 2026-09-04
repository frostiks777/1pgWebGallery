import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import type { WebDAVClient } from 'webdav';
import { isVideoFile, videoMimeOf } from '@/lib/videoExt';

// ─────────────────────────────────────────────────────────────────────────────
// Native video playback — streams the ACTUAL source video (not a generated
// preview) so the browser's own <video> element can hover-play / lightbox-play
// it directly, honouring HTTP Range requests for seeking and fast start.
//
// This replaces the earlier animated-WebP "trailer" approach (see git history
// of the now-removed src/app/api/video-preview/route.ts): no ffmpeg cost per
// view, no `.previews/` cache tier to manage — the tradeoff is more bytes over
// the wire per view (the real video, not a tiny WebP), which is the right
// tradeoff on this project's 1-CPU-core VPS.
//
// Poster-frame generation (src/app/api/images/route.ts, extractVideoPosterBuffer)
// is UNCHANGED — this route only concerns the moving-picture preview.
//
//   - demo mode (public/demo-photos/*): 307-redirect to the static file path —
//     Next.js' (and nginx's, in production — see DEPLOYMENT.md) built-in
//     static file serving already handles Range requests correctly, so there
//     is nothing bespoke to write for this branch.
//   - WebDAV mode: genuine byte-range proxy via the `webdav` package's
//     `createReadStream(path, { range })`, which performs a true ranged GET
//     against the WebDAV backend and pipes the response through — confirmed
//     by reading node_modules/webdav/dist/node/operations/createStream.js,
//     it is NOT buffering the whole file into memory first.
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

async function statVideoSize(video: string): Promise<number | null> {
  const c = dav();
  if (!c) return null;
  try {
    const stat = await withTimeout(c.stat(video), 10_000, `stat ${video}`);
    const s = 'data' in stat ? stat.data : stat;
    return typeof s.size === 'number' ? s.size : null;
  } catch { return null; }
}

const PUBLIC_ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public');

function safePublicPath(video: string): string | null {
  const segs = video.split('/').filter(s => s.length > 0 && s !== '..' && s !== '.');
  const fp = path.join(PUBLIC_ROOT, ...segs);
  if (fp !== PUBLIC_ROOT && !fp.startsWith(PUBLIC_ROOT + path.sep)) return null;
  return fp;
}

/**
 * Parses a `Range: bytes=...` header per RFC 7233 — supports `start-end`,
 * `start-` (open-ended) and `-suffixLength` (last N bytes) forms. Returns
 * null for a missing/unsatisfiable/malformed header, in which case the
 * caller should fall back to a full 200 response.
 */
function parseRange(rangeHeader: string | null, totalSize: number): { start: number; end: number } | null {
  if (!rangeHeader || totalSize <= 0) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!m) return null;
  const [, startStr, endStr] = m;
  if (startStr === '' && endStr === '') return null;

  let start: number;
  let end: number;
  if (startStr === '') {
    // Suffix range: last N bytes of the resource.
    const suffixLength = parseInt(endStr, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else {
    start = parseInt(startStr, 10);
    end = endStr === '' ? totalSize - 1 : parseInt(endStr, 10);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= totalSize) {
    return null;
  }
  return { start, end: Math.min(end, totalSize - 1) };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path');
    if (!rawPath) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

    const decoded = decodeURIComponent(rawPath);
    if (!isVideoFile(decoded)) {
      return NextResponse.json({ error: 'Not a video file' }, { status: 400 });
    }

    const isDemo = decoded.split('/').filter(Boolean)[0] === 'demo-photos';

    // ── Demo mode: hand off to static file serving (nginx/Next.js already
    //    handle Range requests correctly for files under public/) ───────────
    if (isDemo) {
      const fp = safePublicPath(decoded);
      if (!fp || !fs.existsSync(fp)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const target = new URL(decoded, request.url);
      return NextResponse.redirect(target, 307);
    }

    // ── WebDAV mode: genuine Range-proxying stream ──────────────────────────
    const photosDir = process.env.PHOTOS_DIR || '/Photos';
    const normalizedPhotosDir = photosDir.endsWith('/') ? photosDir : photosDir + '/';
    if (!decoded.startsWith(normalizedPhotosDir) && decoded !== photosDir) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const c = dav();
    if (!c) return NextResponse.json({ error: 'WebDAV not configured' }, { status: 500 });

    const p = decoded.startsWith('/') ? decoded : '/' + decoded;
    const totalSize = await statVideoSize(p);
    if (totalSize === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const contentType = videoMimeOf(decoded);
    const range = parseRange(request.headers.get('range'), totalSize);

    if (range) {
      const nodeStream = c.createReadStream(p, { range: { start: range.start, end: range.end } });
      const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
          'Content-Length': String(range.end - range.start + 1),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const nodeStream = c.createReadStream(p);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[VideoStream] unhandled:', err);
    return NextResponse.json({ error: 'Video stream failed' }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path');
    if (!rawPath) return new NextResponse(null, { status: 400 });

    const decoded = decodeURIComponent(rawPath);
    if (!isVideoFile(decoded)) return new NextResponse(null, { status: 400 });

    const isDemo = decoded.split('/').filter(Boolean)[0] === 'demo-photos';
    const contentType = videoMimeOf(decoded);

    if (isDemo) {
      const fp = safePublicPath(decoded);
      if (!fp || !fs.existsSync(fp)) return new NextResponse(null, { status: 404 });
      const size = fs.statSync(fp).size;
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(size),
          'Accept-Ranges': 'bytes',
        },
      });
    }

    const photosDir = process.env.PHOTOS_DIR || '/Photos';
    const normalizedPhotosDir = photosDir.endsWith('/') ? photosDir : photosDir + '/';
    if (!decoded.startsWith(normalizedPhotosDir) && decoded !== photosDir) {
      return new NextResponse(null, { status: 404 });
    }
    const totalSize = await statVideoSize(decoded.startsWith('/') ? decoded : '/' + decoded);
    if (totalSize === null) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
