import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
// Shared ffmpeg plumbing — used by src/app/api/images/route.ts (and the bulk
// src/app/api/images/generate/route.ts) to extract a single "poster" frame
// for videos that have no companion photo. The actual moving-picture
// hover/lightbox preview is plain native <video> streaming
// (src/app/api/video-stream/route.ts) — no ffmpeg involved there at all.
//
// Kept in its own module so `withFfmpegSlot` remains a true single global
// queue: at most one ffmpeg process runs server-wide at a time (the production
// VPS has ONE CPU core), which only holds if every ffmpeg-calling route goes
// through this one queue.
//
// PERFORMANCE — why this file looks the way it does.
//
// Measured on the production box, 2026-10-16, C1145.MP4 (4K HEVC Main10 50fps,
// 3840x2160, GOP 250, 96 MB, 13.9 s), extracting exactly ONE poster frame:
//
//   before  -ss 4.6 -i file -frames:v 1                 →  11 582 ms
//   after   -ss 0 -skip_frame nokey -threads 1 ...      →   1 405 ms
//
// Two independent multipliers, both required:
//
//  1. `-skip_frame nokey`. Seeking into a long-GOP stream forces ffmpeg to
//     DECODE every frame from the preceding keyframe — for this clip that is
//     ~230 frames of 4K HEVC Main10 to reach 4.6 s, which is where the ~10 s
//     went. A poster does not need an exact frame: decoding the first keyframe
//     and stopping is ~8x cheaper.
//
//  2. `-threads 1`. The box has one core. Letting ffmpeg spin up a thread pool
//     buys nothing and competes with nginx's single worker for that core —
//     which is precisely how one poster request became a site-wide outage
//     (MEMORY.md, 2026-10-16).
//
// `-an -sn` drop audio/subtitle streams we never decode anyway.
//
// Every child process is hard-timed-out. A wedged ffmpeg used to hold
// `withFfmpegSlot` forever, and because the slot is server-wide that blocked
// every other poster on the box.
// ─────────────────────────────────────────────────────────────────────────────

/** Hard wall-clock ceiling for an ffmpeg run. Past this the child is SIGKILLed. */
const FFMPEG_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT_MS || 90_000);
/** Hard wall-clock ceiling for the availability probe. */
const FFPROBE_TIMEOUT_MS = Number(process.env.FFPROBE_TIMEOUT_MS || 30_000);

/** True when an error from `run` was a timeout kill rather than a decode failure. */
function isTimeoutKill(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('ffmpeg failed (killed after');
}

let ffmpegAvailable: boolean | null = null;

export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    await run('ffmpeg', ['-version'], FFPROBE_TIMEOUT_MS);
    await run('ffprobe', ['-version'], FFPROBE_TIMEOUT_MS);
    ffmpegAvailable = true;
    console.info('[ffmpeg] ffmpeg/ffprobe found — video previews & poster frames are ACTIVE');
  } catch {
    ffmpegAvailable = false;
    console.error('[ffmpeg] *** ffmpeg NOT FOUND — video previews & poster frames are DISABLED. Install with: sudo apt install -y ffmpeg ***');
  }
  return ffmpegAvailable;
}

/**
 * `execFile` with the two guarantees this module depends on: a child that
 * outlives `timeoutMs` is killed (SIGKILL, so a wedged decoder cannot survive
 * as an orphan burning the single core), and stdout is bounded so a chatty
 * ffmpeg cannot balloon the heap.
 *
 * Failures are re-thrown with ffmpeg's own diagnosis attached — "moov atom not
 * found", "Invalid data found when processing input" — because a bare
 * "Command failed" is the only clue the caller would otherwise get.
 */
async function run(bin: string, args: string[], timeoutMs: number): Promise<void> {
  try {
    await execFileAsync(bin, args, {
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
      maxBuffer: 1024 * 1024,
    });
  } catch (err) {
    const e = err as { killed?: boolean; signal?: string; stderr?: string; stdout?: string; message?: string };
    const detail = (e.stderr || e.stdout || e.message || '').trim();
    const how = e.killed
      ? `killed after ${timeoutMs}ms`
      : e.signal ? `signal ${e.signal}` : 'non-zero exit';
    throw new Error(`${bin} failed (${how})` + (detail ? `: ${detail.split('\n').slice(-2).join(' | ')}` : ''));
  }
}

let ffmpegQueue: Promise<unknown> = Promise.resolve();

/** Runs `job` once every previously-queued ffmpeg job has settled — never more than one at a time. */
export function withFfmpegSlot<T>(job: () => Promise<T>): Promise<T> {
  const queued = ffmpegQueue.then(job, job);
  // Swallow errors here so one failed job doesn't wedge the queue for the next caller.
  ffmpegQueue = queued.catch(() => {});
  return queued;
}

let posterJobsPending = 0;

/**
 * Reserves the poster slot, or reports that one is already held/waited for.
 *
 * Callers use this to REJECT rather than queue: an unbounded queue is what
 * turned one unlucky video open into hours of pinned CPU, because every queued
 * entry had already pulled its whole source file off WebDAV and was holding it
 * in memory while it waited.
 *
 * Reserved **synchronously**, before any await, and only then does the work
 * start. The previous flag was set inside the already-queued job, so N requests
 * arriving in the same tick all saw `busy = false`, all passed the check and all
 * queued — the unbounded queue survived the fix that was meant to remove it
 * (issue #99). A `finally`-released counter keeps that from happening again.
 *
 * Returns a release function on success, `null` when the slot is taken.
 */
export function tryReservePosterSlot(): (() => void) | null {
  if (posterJobsPending > 0) return null;
  posterJobsPending += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    posterJobsPending -= 1;
  };
}

/**
 * The poster timestamp: always the first keyframe, i.e. second 0.
 *
 * This used to be 33% of the duration, deliberately — "frame 0 is often black
 * or a logo". That reasoning ignored GOP length (see the measurement table at
 * the top of this file). The trade-off now is an occasionally dark first frame,
 * which is cosmetic on a thumbnail; 10 s of the one core we have is not.
 */
const POSTER_AT_SECONDS = 0;

/** Max width for an extracted poster, so we never hand sharp a 4K frame. */
const POSTER_MAX_WIDTH = 2400;

/**
 * Extracts a single poster frame from a local video file.
 *
 * `width` scales inside ffmpeg, so the JPEG we hand to sharp is already close
 * to the size the caller asked for instead of a 4K frame sharp would throw
 * ~90% of away.
 */
export async function extractFrameAt(
  videoFile: string,
  outFile: string,
  atSeconds: number,
  opts: { width?: number; quality?: string } = {},
): Promise<void> {
  const { width, quality = '4' } = opts;
  const seek = Math.max(0, atSeconds).toFixed(3);

  const build = (keyframeOnly: boolean) => {
    const args = ['-y'];
    if (keyframeOnly) args.push('-skip_frame', 'nokey');
    args.push('-ss', seek, '-i', videoFile, '-frames:v', '1', '-threads', '1', '-an', '-sn');
    if (width) args.push('-vf', `scale=${width}:-1:flags=bicubic`);
    args.push('-q:v', quality, '-loglevel', 'error', outFile);
    return args;
  };

  const produced = () => {
    try { return fs.statSync(outFile).size > 0; } catch { return false; }
  };

  try {
    await run('ffmpeg', build(true), FFMPEG_TIMEOUT_MS);
  } catch (err) {
    // Never retry a timeout kill — a kill means the box was already too busy to
    // finish the job, and spending the budget twice makes that worse. Same if
    // ffmpeg wrote a frame despite complaining.
    if (isTimeoutKill(err) || produced()) throw err;
    console.warn('[ffmpeg] keyframe-only decode failed, retrying with full decode:',
      err instanceof Error ? err.message : String(err));
    await run('ffmpeg', build(false), FFMPEG_TIMEOUT_MS);
    return;
  }

  // ffmpeg exited 0 but produced no file: frames not flagged as keyframes, so
  // `-skip_frame nokey` had nothing to decode. Rare — a plain decode is cheap
  // insurance against a permanently broken thumbnail.
  if (!produced()) {
    console.warn('[ffmpeg] keyframe-only decode wrote no output, retrying with full decode:', videoFile);
    await run('ffmpeg', build(false), FFMPEG_TIMEOUT_MS);
  }
}

/**
 * Poster frame for a video whose bytes are ALREADY in memory.
 *
 * Demo-mode only, where sources are small local files. WebDAV videos must go
 * through {@link extractVideoPosterFromFile} instead — see the note there.
 *
 * Takes no slot of its own: the caller must hold the poster reservation and run
 * this inside {@link withFfmpegSlot}, otherwise the demo path bypasses the
 * serialisation the WebDAV path gets (issue #99).
 */
export async function extractVideoPosterBuffer(
  videoBuf: Buffer,
  opts: { width?: number } = {},
): Promise<Buffer> {
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vposter-'));
  const videoFile = path.join(workDir, 'src.mp4'); // extension is cosmetic; ffmpeg sniffs the container
  const frameFile = path.join(workDir, 'poster.jpg');
  try {
    await fsp.writeFile(videoFile, videoBuf);
    await extractFrameAt(videoFile, frameFile, POSTER_AT_SECONDS, {
      quality: '2',
      width: Math.min(opts.width ?? POSTER_MAX_WIDTH, POSTER_MAX_WIDTH),
    });
    return await fsp.readFile(frameFile);
  } finally {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Poster frame for a video that lives on disk.
 *
 * This is the path production uses. The alternative — downloading the whole
 * video into a Buffer first — is what exhausted the 823 MB prod box on
 * 2026-10-16: 96–134 MB per video in the V8 heap, measured RSS climbing
 * 183 MB → 366 MB in under two minutes with the gallery idle, swap churning at
 * 19k–43k pages/s, and nginx's single worker starved until TLS handshakes
 * stopped completing, which is what made the whole site look down.
 *
 * Callers must hold the poster reservation ({@link tryReservePosterSlot}) and
 * call this inside {@link withFfmpegSlot}, so exactly one source video exists
 * per box at any moment.
 */
export async function extractVideoPosterFromFile(
  videoPath: string,
  opts: { width?: number } = {},
): Promise<Buffer> {
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vposter-'));
  const frameFile = path.join(workDir, 'poster.jpg');
  try {
    await extractFrameAt(videoPath, frameFile, POSTER_AT_SECONDS, {
      quality: '2',
      width: Math.min(opts.width ?? POSTER_MAX_WIDTH, POSTER_MAX_WIDTH),
    });
    return await fsp.readFile(frameFile);
  } finally {
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
