import type { Photo } from '@/components/gallery/types';

export function formatSyntheticMeta(photo: Photo): string {
  const d = new Date(photo.lastModified);
  const dt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const kb =
    photo.size > 1024 * 1024
      ? `${(photo.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(photo.size / 1024))} KB`;
  const mimeShort = photo.mimeType?.includes('/') ? photo.mimeType.split('/')[1].toUpperCase() : '';
  return [mimeShort, kb, dt].filter(Boolean).join(' · ');
}
