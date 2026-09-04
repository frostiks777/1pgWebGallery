// Shared helpers for detecting "companion" video files that sit next to a
// photo in the same folder (e.g. IMG_0042.jpg + IMG_0042.mp4) and should
// power a short auto-playing "trailer" preview in the gallery.
//
// Kept in its own module (rather than duplicated per-route, like the image
// extension lists elsewhere in this codebase) because the matching logic
// here is more than a plain extension check — see `findCompanionVideoStem`.

export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'];

export function videoExtOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

export function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.includes(videoExtOf(filename));
}

/** Filename without its extension, used to match a photo to its companion video. */
export function stemOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(0, dot) : filename;
}

/**
 * Given all basenames in a directory, build a map of `stem -> video basename`
 * for every video file present, so photo entries can look up a companion by
 * their own stem in O(1).
 */
export function buildVideoStemMap(basenames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of basenames) {
    if (isVideoFile(name)) map.set(stemOf(name), name);
  }
  return map;
}
