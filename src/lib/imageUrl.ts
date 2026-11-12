import { IMAGE_PRESET_VERSION } from './cacheVersions';

export type ImageSize = 'thumbnail' | 'medium' | 'full';

// The version itself and its rationale live in ./cacheVersions: the URL is
// the only cache key the browser and nginx see (one-year immutable
// Cache-Control), and the mtime suffix makes a replaced file a different URL.

export function imageUrl(
  path: string,
  size: ImageSize,
  lastModified?: string | Date,
): string {
  const params = new URLSearchParams({ path, size });
  const mtime =
    lastModified instanceof Date ? lastModified.getTime() : Date.parse(lastModified ?? '');
  params.set(
    'v',
    Number.isFinite(mtime) && mtime > 0
      ? `${IMAGE_PRESET_VERSION}-${mtime}`
      : String(IMAGE_PRESET_VERSION),
  );
  return `/api/images?${params.toString()}`;
}
