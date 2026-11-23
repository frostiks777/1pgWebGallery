'use client';

import { Photo } from './types';
import { EyeOff, Trash2, RectangleHorizontal, Star } from 'lucide-react';
import { formatSyntheticMeta } from '@/lib/photo-meta';
import { cn } from '@/lib/utils';
import { imageUrl as buildImageUrl } from '@/lib/imageUrl';
import { PosterPlaceholder } from './PosterPlaceholder';

interface MinimalismLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

function thumbUrl(photo: Photo): string {
  // Demo photos are bundled static files: they skip /api/images and its
  // immutable URL versioning, and a dev-server reload is their cache invalidation.
  return photo.path.startsWith('/demo-photos/')
    ? photo.path
    : buildImageUrl(photo.path, 'thumbnail', photo.lastModified);
}

export function MinimalismLayout({
  photos,
  onPhotoClick,
  onHidePhoto,
  onDeletePhoto,
  panoramaPaths,
  onTogglePanorama,
  coverPaths,
  onToggleCover,
}: MinimalismLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-1 px-2">
      {photos.map((photo, i) => (
        <div
          key={photo.path}
          role="button"
          tabIndex={0}
          // The row shows its index, file name and EXIF line, so the name is
          // that same text followed by the action (WCAG 2.5.3).
          aria-label={`${String(i + 1).padStart(2, '0')} ${photo.name}${
            coverPaths?.includes(photo.path) ? ' ★' : ''
          } ${formatSyntheticMeta(photo)} — открыть фото`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPhotoClick(photo, i);
            }
          }}
          className={cn(
            'group grid cursor-pointer items-center gap-2 border-b border-[var(--rule)] py-2 font-mono text-xs sm:gap-3',
            'text-[var(--obs-muted)] transition-colors hover:text-[var(--amber)]',
            'grid-cols-[40px_44px_minmax(0,1fr)_auto] md:grid-cols-[56px_64px_minmax(0,1fr)_minmax(7rem,9rem)_auto]',
          )}
          onClick={() => onPhotoClick(photo, i)}
        >
          <span className="tabular-nums tracking-[0.16em]">{String(i + 1).padStart(2, '0')}{' '}</span>
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--r-sm)] border border-[var(--surface-border)] bg-black/20 md:h-14 md:w-14">
            {photo.posterUnavailable ? (
              <PosterPlaceholder className="h-full w-full" />
            ) : (
              <img
                src={thumbUrl(photo)}
                alt=""
                className="obs-thumb-crop h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </div>
          <span className="min-w-0 truncate tracking-[0.04em]">
            {photo.name}{' '}
            {coverPaths?.includes(photo.path) && <span className="ml-2 text-[var(--amber)]">★</span>}
          </span>
          <span className="hidden min-w-0 truncate text-right text-xs md:block">
            {formatSyntheticMeta(photo)}
          </span>
          <div
            className="flex shrink-0 flex-nowrap items-center justify-end gap-0.5 self-center opacity-0 transition-opacity group-hover:opacity-100 sm:gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {onHidePhoto && (
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--bg-elev)] text-[var(--fg)] hover:border-[var(--amber-border)] md:h-9 md:w-9"
                aria-label="Скрыть"
                onClick={() => onHidePhoto(photo)}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            )}
            {onDeletePhoto && (
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600/85 text-white hover:bg-red-600 md:h-9 md:w-9"
                aria-label="Удалить"
                onClick={() => onDeletePhoto(photo)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {onTogglePanorama && (
              <button
                type="button"
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--rule)] md:h-9 md:w-9',
                  panoramaPaths?.includes(photo.path) ? 'bg-blue-600/80 text-white' : 'bg-[var(--bg-elev)] text-[var(--fg)]',
                )}
                aria-label="Панорама"
                onClick={() => onTogglePanorama(photo)}
              >
                <RectangleHorizontal className="h-3.5 w-3.5" />
              </button>
            )}
            {onToggleCover && (
              <button
                type="button"
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--rule)] md:h-9 md:w-9',
                  coverPaths?.includes(photo.path)
                    ? 'bg-[var(--amber-tint)] text-[var(--amber)]'
                    : 'bg-[var(--bg-elev)] text-[var(--fg)]',
                )}
                aria-label="Обложка"
                onClick={() => onToggleCover(photo)}
              >
                <Star className={cn('h-3.5 w-3.5', coverPaths?.includes(photo.path) && 'fill-current')} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
