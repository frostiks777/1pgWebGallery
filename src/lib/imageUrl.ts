export type ImageSize = 'thumbnail' | 'medium' | 'full';

// Bump when IMAGE_PRESETS changes: /api/images answers with a one-year
// immutable Cache-Control, so this URL is the only cache key the browser and
// nginx see. The mtime suffix makes a replaced file a different URL.
export const IMAGE_PRESET_VERSION = 4;

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
