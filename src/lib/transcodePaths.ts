// Transcoded copies of HEVC videos live next to the originals, mirroring how
// thumbnails use .thumbs-v2 (see cacheVersions). Co-located on WebDAV on
// purpose: the prod box has 5.3 GB of free disk and .data already holds 3.7 GB,
// while the storage backend has room and the cache survives a deploy.
export const TRANSCODE_DIR = '.transcoded-v1';

/**
 * Path of the H.264 copy for a WebDAV video.
 *
 * The source mtime is part of the file name (not stored in a manifest): a
 * replaced video gets a new name, so an old transcode can never be served for
 * new bytes, and the check on the read path is a single stat — no extra
 * bookkeeping to keep in sync.
 */
export function transcodedPath(videoPath: string, mtimeMs: number): string {
  const slash = videoPath.lastIndexOf('/');
  const dir = slash >= 0 ? videoPath.slice(0, slash) : '';
  const base = slash >= 0 ? videoPath.slice(slash + 1) : videoPath;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${dir}/${TRANSCODE_DIR}/${stem}.${Math.trunc(mtimeMs)}.mp4`;
}
