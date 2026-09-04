import { execFile } from 'child_process';
import { promisify } from 'util';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
// Shared ffmpeg plumbing — used by BOTH:
//   - src/app/api/video-preview/route.ts (animated-WebP hover trailer)
//   - src/app/api/images/route.ts        (static poster frame for videos that
//                                          have no companion photo — see
//                                          extractPosterFrame below)
//
// Kept in one module so the two routes share the SAME single-slot queue:
// the whole point of `withFfmpegSlot` is that at most one ffmpeg process runs
// server-wide at a time (the production VPS has just 1 CPU core), which only
// holds if every ffmpeg-calling route goes through this one queue.
// ─────────────────────────────────────────────────────────────────────────────

let ffmpegAvailable: boolean | null = null;

export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    await execFileAsync('ffmpeg', ['-version']);
    await execFileAsync('ffprobe', ['-version']);
    ffmpegAvailable = true;
    console.info('[ffmpeg] ffmpeg/ffprobe found — video previews & poster frames are ACTIVE');
  } catch {
    ffmpegAvailable = false;
    console.error('[ffmpeg] *** ffmpeg NOT FOUND — video previews & poster frames are DISABLED. Install with: sudo apt install -y ffmpeg ***');
  }
  return ffmpegAvailable;
}

let ffmpegQueue: Promise<unknown> = Promise.resolve();

/** Runs `job` once every previously-queued ffmpeg job has settled — never more than one at a time. */
export function withFfmpegSlot<T>(job: () => Promise<T>): Promise<T> {
  const run = ffmpegQueue.then(job, job);
  // Swallow errors here so one failed job doesn't wedge the queue for the next caller.
  ffmpegQueue = run.catch(() => {});
  return run;
}

export async function probeDuration(videoFile: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    videoFile,
  ]);
  const d = parseFloat(stdout.trim());
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/** Extracts a single frame at `atSeconds` (precise seek — cheap regardless of video length) to `outFile`. */
export async function extractFrameAt(
  videoFile: string,
  outFile: string,
  atSeconds: number,
  opts: { width?: number; quality?: string } = {},
): Promise<void> {
  const { width, quality = '4' } = opts;
  const args = ['-y', '-ss', Math.max(0, atSeconds).toFixed(3), '-i', videoFile, '-frames:v', '1'];
  if (width) args.push('-vf', `scale=${width}:-1:flags=lanczos`);
  args.push('-q:v', quality, '-loglevel', 'error', outFile);
  await execFileAsync('ffmpeg', args);
}

/**
 * Picks a single representative "poster" timestamp for a video — deliberately
 * NOT frame 0, which is often black or a logo rather than real content (same
 * reasoning as the trailer's frame sampling in video-preview/route.ts).
 */
export function posterTimestamp(durationSec: number): number {
  if (durationSec <= 0) return 0;
  return durationSec * 0.33;
}

/**
 * Full pipeline for videos with no companion photo (see src/lib/webdav.ts):
 * writes the video to a scratch temp dir, picks a representative timestamp,
 * and extracts one full-resolution frame — used as-is by src/app/api/images/
 * route.ts and src/app/api/images/generate/route.ts as the "original" they'd
 * otherwise have read straight from a photo file, before the normal
 * sharp resize/recompress pipeline runs on it.
 */
export async function extractVideoPosterBuffer(videoBuf: Buffer): Promise<Buffer> {
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vposter-'));
  const videoFile = path.join(workDir, 'src.mp4'); // extension is cosmetic; ffmpeg sniffs the container
  const frameFile = path.join(workDir, 'poster.jpg');
  try {
    await fsp.writeFile(videoFile, videoBuf);
    await withFfmpegSlot(async () => {
      const duration = await probeDuration(videoFile);
      await extractFrameAt(videoFile, frameFile, posterTimestamp(duration), { quality: '2' });
    });
    return await fsp.readFile(frameFile);
  } finally {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
