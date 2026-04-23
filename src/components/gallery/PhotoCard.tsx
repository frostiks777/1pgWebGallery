'use client';

import { Photo } from './types';
import { memo, useMemo, useState } from 'react';
import { EyeOff, Trash2, RectangleHorizontal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSyntheticMeta } from '@/lib/photo-meta';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  total?: number;
  frameLabel?: string;
  onClick: () => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  onTogglePanorama?: (photo: Photo) => void;
  isPanorama?: boolean;
  onToggleCover?: (photo: Photo) => void;
  isCover?: boolean;
  className?: string;
  aspectRatio?: string;
  thumbnailSize?: number;
  showCaption?: boolean;
}

export const PhotoCard = memo(function PhotoCard({
  photo,
  index,
  total,
  frameLabel,
  onClick,
  onHidePhoto,
  onDeletePhoto,
  onTogglePanorama,
  isPanorama = false,
  onToggleCover,
  isCover = false,
  className = '',
  aspectRatio = 'aspect-square',
  thumbnailSize = 300,
  showCaption = true,
}: PhotoCardProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageUrl = useMemo(
    () => `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`,
    [photo.path],
  );

  const metaLine = useMemo(() => formatSyntheticMeta(photo), [photo]);

  const computedFrame =
    frameLabel ??
    (total != null && total > 0
      ? `${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`
      : undefined);

  const aspectClass = aspectRatio.trim() === '' ? 'min-h-0 h-full w-full' : aspectRatio;

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'obs-photo-card group relative cursor-pointer overflow-hidden rounded-[var(--r-sm)] border border-[rgba(255,255,255,0.05)] bg-black',
        'shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-[250ms]',
        'motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:scale-[1.006]',
        'group-hover:border-[var(--amber-border)] group-hover:shadow-[var(--shadow-hover)]',
        aspectClass,
        className,
      )}
      onClick={onClick}
    >
      {/* Top amber hairline — fades on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--amber) 50%, transparent 100%)',
        }}
        aria-hidden
      />

      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black">
          <div className="mb-2 text-2xl" aria-hidden>
            ⚠️
          </div>
          <p className="max-w-full truncate font-mono text-[10px] text-[var(--obs-muted)]">{photo.name}</p>
          <p className="mt-1 text-xs text-red-400">Failed to load</p>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 animate-pulse bg-[var(--bg-card)]">
              <div className="h-full w-full bg-gradient-to-br from-black/40 to-black/80" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={photo.name}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
              isLoading ? 'opacity-0' : 'opacity-100',
            )}
            loading="lazy"
            decoding="async"
            fetchPriority="high"
            width={thumbnailSize}
            height={thumbnailSize}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </>
      )}

      {computedFrame && (
        <div
          className="pointer-events-none absolute left-2.5 top-2 z-10 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(233,228,217,0.75)] dark:text-[rgba(233,228,217,0.75)]"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          {computedFrame}
        </div>
      )}

      {isCover && onToggleCover && (
        <button
          type="button"
          className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--amber-border)] bg-[var(--star-capsule-bg)] backdrop-blur-[6px]"
          aria-label="Убрать с обложки"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCover(photo);
          }}
        >
          <Star className="h-[11px] w-[11px] fill-[var(--amber)] text-[var(--amber)]" aria-hidden />
        </button>
      )}
      {isCover && !onToggleCover && (
        <div
          className="pointer-events-none absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--amber-border)] bg-[var(--star-capsule-bg)] backdrop-blur-[6px]"
          aria-hidden
        >
          <Star className="h-[11px] w-[11px] fill-[var(--amber)] text-[var(--amber)]" />
        </div>
      )}

      <div
        className={cn(
          'absolute left-2 z-10 flex flex-col gap-1',
          computedFrame ? 'top-9' : 'top-2',
        )}
      >
        {onHidePhoto && (
          <button
            type="button"
            className="rounded-full border border-white/10 bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100"
            title="Скрыть фото"
            aria-label="Скрыть фото"
            onClick={(e) => {
              e.stopPropagation();
              onHidePhoto(photo);
            }}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        )}
        {onDeletePhoto && (
          <button
            type="button"
            className="rounded-full bg-red-500/70 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-600/90 group-hover:opacity-100"
            title="Удалить фото"
            aria-label="Удалить фото"
            onClick={(e) => {
              e.stopPropagation();
              onDeletePhoto(photo);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onTogglePanorama && (
          <button
            type="button"
            className={cn(
              'rounded-full p-1.5 backdrop-blur-sm transition-opacity',
              isPanorama
                ? 'bg-blue-500/80 text-white opacity-100 hover:bg-blue-600/90'
                : 'bg-black/50 text-white/70 opacity-0 hover:bg-black/70 hover:text-white group-hover:opacity-100',
            )}
            title={isPanorama ? 'Снять отметку панорамы' : 'Отметить как панораму'}
            aria-label={isPanorama ? 'Снять отметку панорамы' : 'Отметить как панораму'}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePanorama(photo);
            }}
          >
            <RectangleHorizontal className="h-3.5 w-3.5" />
          </button>
        )}
        {onToggleCover && !isCover && (
          <button
            type="button"
            className="rounded-full bg-black/50 p-1.5 text-white/70 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 hover:text-white group-hover:opacity-100"
            title="Сделать обложкой папки"
            aria-label="Сделать обложкой папки"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCover(photo);
            }}
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showCaption && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-2.5 pb-1.5 pt-[18px]"
          style={{ backgroundImage: 'var(--photo-caption-gradient)' }}
        >
          <div className="flex items-end justify-between gap-2 font-mono text-[10px] tracking-[0.04em] text-[var(--photo-caption-fg)]">
            <span className="min-w-0 truncate">{photo.name}</span>
            <span className="max-w-[48%] shrink-0 text-right text-[var(--photo-exif-hover)] opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100">
              {metaLine}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
