'use client';

import { Photo } from './types';
import { EyeOff, Trash2, RectangleHorizontal, Star } from 'lucide-react';
import { formatSyntheticMeta } from '@/lib/photo-meta';
import { cn } from '@/lib/utils';

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
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-1 px-2">
      {photos.map((photo, i) => (
        <div
          key={photo.path}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPhotoClick(photo, i);
            }
          }}
          className={cn(
            'group grid cursor-pointer items-center gap-4 border-b border-[var(--rule)] py-2.5 font-mono text-[11px]',
            'text-[var(--obs-muted)] transition-colors hover:text-[var(--amber)]',
            'grid-cols-[60px_1fr] md:grid-cols-[60px_1fr_140px]',
          )}
          onClick={() => onPhotoClick(photo, i)}
        >
          <span className="tracking-[0.16em] opacity-55">{String(i + 1).padStart(2, '0')}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 tracking-[0.04em]">
              {photo.name}
              {coverPaths?.includes(photo.path) && <span className="ml-2 text-[var(--amber)]">★</span>}
            </span>
            <div
              className="flex shrink-0 flex-wrap justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {onHidePhoto && (
                <button
                  type="button"
                  className="min-h-9 min-w-9 rounded-full border border-[var(--rule)] bg-[var(--bg-elev)] p-1.5 text-[var(--fg)] hover:border-[var(--amber-border)]"
                  aria-label="Скрыть"
                  onClick={() => onHidePhoto(photo)}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </button>
              )}
              {onDeletePhoto && (
                <button
                  type="button"
                  className="min-h-9 min-w-9 rounded-full bg-red-600/85 p-1.5 text-white hover:bg-red-600"
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
                    'min-h-9 min-w-9 rounded-full border border-[var(--rule)] p-1.5',
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
                    'min-h-9 min-w-9 rounded-full border border-[var(--rule)] p-1.5',
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
          <span className="hidden text-right text-[10px] opacity-55 md:block">{formatSyntheticMeta(photo)}</span>
        </div>
      ))}
    </div>
  );
}
