import { isVideoFile } from './videoExt';

// One budget for both sides of the video poster flow: the route that refuses to
// generate a poster for a huge upload, and the listing that tells the client not
// to ask for one. Reading the env var in two places would let the two drift, and
// the drift is visible as a 413 storm and a screen of failed cards (#180).
export const MAX_VIDEO_BYTES = Number(process.env.VIDEO_PREVIEW_MAX_MB || 300) * 1024 * 1024;

/**
 * True for a video the server will not render a poster for. Such an entry is
 * still a valid gallery item — it just needs a placeholder instead of an image
 * request that can only answer 413.
 */
export function isPosterUnavailable(filename: string, size: number): boolean {
  return isVideoFile(filename) && size > MAX_VIDEO_BYTES;
}
