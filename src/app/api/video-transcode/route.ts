import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'node:child_process';
import type { WebDAVClient } from 'webdav';
import { isAuthRequired, validateAuthCookie } from '@/lib/auth';
import { isVideoFile } from '@/lib/videoExt';
import { transcodedPath } from '@/lib/transcodePaths';
import { withFfmpegSlot } from '@/lib/ffmpeg';

// Offline HEVC → H.264 batch (#184, #186).
//
// Why not on request: decoding 4K HEVC Main10 takes ~128 s for a 13-second clip
// on this box, so a viewer would wait minutes for a short video. The nightly job
// pays that once and caches the result next to the source; /api/video-stream
// then serves the cached copy transparently.
//
// The job does NOT schedule itself — a systemd timer or cron posts to this
// endpoint at night (see DEPLOYMENT.md). It is a route and not a standalone
// script on purpose: the production build is Next standalone, where `webdav`
// lives inside the server bundle and is not importable from scripts/.

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

interface TranscodeStatus {
  running: boolean;
  start: string | null;
  limit: number;
  total: number;
  done: number;
  encoded: number;
  skipped: number;
  failed: number;
  lastVideo: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

const status: TranscodeStatus = {
  running: false,
  start: null,
  limit: 0,
  total: 0,
  done: 0,
  encoded: 0,
  skipped: 0,
  failed: 0,
  lastVideo: null,
  startedAt: null,
  finishedAt: null,
};

function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(cmd + ' timeout after ' + timeoutMs + ' ms'));
    }, timeoutMs);
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(cmd + ' exited ' + code + ': ' + err.slice(0, 300)));
    });
  });
}

async function downloadVideo(client: WebDAVClient, remote: string, dest: string): Promise<void> {
  const stream = client.createReadStream(remote) as unknown as NodeJS.ReadableStream;
  await new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    stream.on('error', reject);
    out.on('error', reject);
    out.on('finish', () => resolve());
    stream.pipe(out);
  });
}

async function collectVideos(client: WebDAVClient, start: string): Promise<string[]> {
  const videos: string[] = [];
  const dirs = [start];
  while (dirs.length > 0) {
    const dir = dirs.shift() as string;
    let entries: Array<{ type: string; basename: string; filename: string }>;
    try {
      entries = await client.getDirectoryContents(dir, { deep: false }) as typeof entries;
    } catch (err) {
      console.warn('[Transcode] cannot list', dir, err instanceof Error ? err.message : err);
      continue;
    }
    for (const entry of entries) {
      if (entry.type === 'directory') {
        // Hidden folders are caches (.thumbs-v2, .transcoded-v1).
        if (!entry.basename.startsWith('.')) dirs.push(entry.filename);
        continue;
      }
      if (isVideoFile(entry.basename)) videos.push(entry.filename);
    }
  }
  return videos;
}

async function runTranscode(scopePath: string | undefined, limit: number): Promise<void> {
  const client = dav();
  if (!client) throw new Error('WebDAV not configured');

  const photosDir = (process.env.PHOTOS_DIR || '/Photos').replace(/\/+$/, '');
  const start = scopePath ? (photosDir + '/' + scopePath).replace(/\/+/g, '/') : photosDir;

  status.running = true;
  status.start = start;
  status.limit = limit;
  status.total = 0;
  status.done = 0;
  status.encoded = 0;
  status.skipped = 0;
  status.failed = 0;
  status.lastVideo = null;
  status.startedAt = Date.now();
  status.finishedAt = null;

  console.info('[Transcode] start=' + start + ' limit=' + limit);

  try {
    const videos = await collectVideos(client, start);
    status.total = videos.length;
    console.info('[Transcode] found ' + videos.length + ' videos');

    for (const video of videos) {
      if (status.encoded >= limit) break;
      status.lastVideo = path.basename(video);
      let stat;
      try {
        const raw = await client.stat(video);
        stat = 'data' in raw ? raw.data : raw;
      } catch (err) {
        status.failed += 1;
        status.done += 1;
        console.warn('[Transcode] stat failed', video, err instanceof Error ? err.message : err);
        continue;
      }

      const mtimeMs = stat.lastmod ? Date.parse(stat.lastmod) : NaN;
      if (!Number.isFinite(mtimeMs)) {
        status.skipped += 1;
        status.done += 1;
        continue;
      }

      const target = transcodedPath(video, mtimeMs);
      try {
        await client.stat(target);
        status.skipped += 1;
        status.done += 1;
        continue;
      } catch {
        // no cached copy yet — encode below
      }

      const work = await fsp.mkdtemp(path.join(os.tmpdir(), 'htr-'));
      const src = path.join(work, 'src.bin');
      const out = path.join(work, 'out.mp4');
      try {
        await downloadVideo(client, video, src);

        // Only HEVC needs re-encoding; H.264 already plays in every browser.
        const probe = JSON.parse(await run('ffprobe', [
          '-v', 'error', '-select_streams', 'v:0',
          '-show_entries', 'stream=codec_name', '-of', 'json', src,
        ], 120_000));
        const codec = probe.streams?.[0]?.codec_name;
        if (codec !== 'hevc') {
          status.skipped += 1;
          status.done += 1;
          console.info('[Transcode] skip ' + status.lastVideo + ': codec=' + (codec ?? 'unknown'));
          continue;
        }

        const started = Date.now();
        // One ffmpeg at a time on the box: the same slot posters use. A long
        // encode is acceptable at night; during the day it only delays posters.
        await withFfmpegSlot(() =>
          run('ffmpeg', [
            '-v', 'error', '-y', '-i', src,
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-vf', 'scale=-2:720',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart', out,
          ], 30 * 60_000),
        );

        const bytes = (await fsp.stat(out)).size;
        const dir = target.slice(0, target.lastIndexOf('/'));
        try { await client.createDirectory(dir); } catch { /* exists */ }
        await client.putFileContents(target, await fsp.readFile(out), { overwrite: true });

        status.encoded += 1;
        status.done += 1;
        console.info('[Transcode] ok ' + status.lastVideo + ' -> ' + (bytes / 1048576).toFixed(2) + ' MB in ' + ((Date.now() - started) / 1000).toFixed(0) + 's');
      } catch (err) {
        status.failed += 1;
        status.done += 1;
        console.error('[Transcode] FAILED', video, err instanceof Error ? err.message : err);
      } finally {
        // Awaited: a fire-and-forget rm loses the race with an open handle and
        // leaves a 96 MB source in /tmp (#100).
        try { await fsp.rm(work, { recursive: true, force: true }); }
        catch (err) { console.warn('[Transcode] cleanup failed', work, err instanceof Error ? err.message : err); }
      }
    }
  } finally {
    status.running = false;
    status.finishedAt = Date.now();
    console.info('[Transcode] done: encoded=' + status.encoded + ' skipped=' + status.skipped + ' failed=' + status.failed);
  }
}

function snapshot() {
  return {
    ...status,
    progress: status.total > 0 ? Math.round((status.done / status.total) * 100) : 0,
  };
}

export async function GET() {
  return NextResponse.json(snapshot());
}

export async function POST(request: NextRequest) {
  // Same rule as the poster batch (#92): a cookie is required when the gallery
  // has a password. A request with no `x-forwarded-for` did not come through
  // nginx, i.e. it is the local nightly timer; nginx appends the real client
  // address for outside traffic, so this cannot be forged from the internet.
  const forwarded = request.headers.get('x-forwarded-for');
  const isLocal = !forwarded;
  if (isAuthRequired() && !isLocal && !validateAuthCookie(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (status.running) {
    return NextResponse.json({ message: 'Transcode already in progress', ...snapshot() });
  }

  const body = await request.json().catch(() => ({})) as { path?: string; limit?: number };
  const rawScope = body?.path;
  if (rawScope !== undefined) {
    if (typeof rawScope !== 'string' || rawScope.includes('..') || path.isAbsolute(rawScope) || rawScope.length > 1024) {
      return NextResponse.json({ error: 'Invalid scope path' }, { status: 400 });
    }
  }
  const rawLimit = body?.limit ?? 10;
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 200) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
  }

  runTranscode(rawScope, rawLimit).catch((err) => {
    console.error('[Transcode] unhandled:', err);
    status.running = false;
    status.finishedAt = Date.now();
  });

  return NextResponse.json({
    message: rawScope ? 'Transcode started for: ' + rawScope : 'Transcode started',
    limit: rawLimit,
    running: true,
    startedAt: status.startedAt,
  });
}
