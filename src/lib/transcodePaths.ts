import crypto from 'crypto';
import path from 'path';

// Transcoded HEVC copies live on the LOCAL disk, under CACHE_DIR/transcoded,
// not next to the source on WebDAV.
//
// Thumbnails use co-located storage because the prod box has little free disk,
// but the storage quota turned out to be exhausted (Nextcloud answers
// 507 Insufficient Storage, available bytes are negative), so a 2 MB MP4 per
// video cannot be written there at all. The local disk has ~5 GB free, and the
// whole library's transcodes are estimated at ~150 MB.
export const TRANSCODE_DIR = 'transcoded';

/**
 * Absolute path of the H.264 copy for a WebDAV video.
 *
 * The source mtime is part of the hash: a replaced video gets a different key,
 * so a stale encode can never be served and the read path needs one stat plus
 * one existsSync.
 */
export function transcodedPath(cacheDir: string, videoPath: string, mtimeMs: number): string {
  const key = crypto
    .createHash('md5')
    .update(`${videoPath}-${Math.trunc(mtimeMs)}`)
    .digest('hex');
  return path.join(cacheDir, TRANSCODE_DIR, `${key}.mp4`);
}
