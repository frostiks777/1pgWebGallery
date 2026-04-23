'use client';

import { useMemo, useState } from 'react';
import { Photo } from './types';
import { EyeOff, Trash2, RectangleHorizontal, Star } from 'lucide-react';

interface AlbumLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

const ALBUM_PATTERN: { col: string; row: string }[] = [
  { col: 'col-span-2', row: 'row-span-2' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
];

function AlbumCard({
  photo,
  index,
  col,
  row,
  onClick,
  onHidePhoto,
  onDeletePhoto,
  isPanorama,
  onTogglePanorama,
  isCover,
  onToggleCover,
}: {
  photo: Photo;
  index: number;
  col: string;
  row: string;
  onClick: () => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  isPanorama?: boolean;
  onTogglePanorama?: (photo: Photo) => void;
  isCover?: boolean;
  onToggleCover?: (photo: Photo) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const thumbnailUrl = photo.path.startsWith('/demo-photos/')
    ? photo.path
    : `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;

  const caption = photo.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  return (
    <div
      className={`${col} ${row} group cursor-pointer flex flex-col`}
      onClick={onClick}
    >
      <div
        className="flex-1 p-2 rounded-[var(--r-md)] border border-[var(--album-mat-outline)] shadow-[var(--shadow-card)] motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:group-hover:-translate-y-px motion-safe:group-hover:border-[var(--amber-border)] motion-safe:group-hover:shadow-[var(--shadow-hover)] flex flex-col min-h-0"
        style={{ background: 'var(--album-mat-bg)' }}
      >
        <div
          className="flex-1 overflow-hidden relative min-h-0"
          style={{ background: 'var(--album-photo-bg)' }}
        >
          {!hasError && (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-5 h-5 rounded-full mx-auto"
                    style={{
                      border: '2px solid var(--album-spin-border)',
                      borderTopColor: 'var(--album-spin-top)',
                      animation: 'album-spin 0.8s linear infinite',
                    }}
                  />
                </div>
              )}
              <img
                src={thumbnailUrl}
                alt={photo.name}
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                }`}
                loading="lazy"
                fetchPriority="high"
                onLoad={() => setIsLoading(false)}
                onError={() => { setHasError(true); setIsLoading(false); }}
              />
            </>
          )}
          {hasError && (
            <div
              className="absolute inset-0 flex items-center justify-center text-2xl"
              style={{ color: 'var(--album-caption)' }}
            >
              ✕
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-end p-1.5 opacity-0 group-hover:opacity-100">
            <span className="text-[10px] font-mono text-white/80">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
            {onHidePhoto && (
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-sm text-white rounded-full p-1 hover:bg-black/70"
                title="Скрыть фото"
                onClick={(e) => { e.stopPropagation(); onHidePhoto(photo); }}
              >
                <EyeOff className="h-3 w-3" />
              </button>
            )}
            {onDeletePhoto && (
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500/70 backdrop-blur-sm text-white rounded-full p-1 hover:bg-red-600/90"
                title="Удалить фото"
                onClick={(e) => { e.stopPropagation(); onDeletePhoto(photo); }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
            {onTogglePanorama && (
              <button
                className={`transition-opacity duration-200 backdrop-blur-sm text-white rounded-full p-1 ${
                  isPanorama
                    ? 'opacity-100 bg-blue-500/80 hover:bg-blue-600/90'
                    : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white/70 hover:bg-black/70 hover:text-white'
                }`}
                title={isPanorama ? 'Снять отметку панорамы' : 'Отметить как панораму'}
                onClick={(e) => { e.stopPropagation(); onTogglePanorama(photo); }}
              >
                <RectangleHorizontal className="h-3 w-3" />
              </button>
            )}
            {onToggleCover && (
              <button
                className={`transition-opacity duration-200 backdrop-blur-sm text-white rounded-full p-1 ${
                  isCover
                    ? 'opacity-100 bg-amber-500/80 hover:bg-amber-600/90'
                    : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white/70 hover:bg-black/70 hover:text-white'
                }`}
                title={isCover ? 'Убрать с обложки' : 'Сделать обложкой папки'}
                onClick={(e) => { e.stopPropagation(); onToggleCover(photo); }}
              >
                <Star className={`h-3 w-3 ${isCover ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
        <p
          className="mt-1.5 text-[10px] tracking-wider lowercase truncate leading-tight shrink-0"
          style={{ color: 'var(--album-caption)' }}
        >
          {caption}
        </p>
      </div>
      <style>{`@keyframes album-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function AlbumLayout({ photos, onPhotoClick, onHidePhoto, onDeletePhoto, panoramaPaths, onTogglePanorama, coverPaths, onToggleCover }: AlbumLayoutProps) {
  const photoConfigs = useMemo(() => {
    return photos.map((photo, index) => {
      const pattern = ALBUM_PATTERN[index % ALBUM_PATTERN.length];
      return { photo, index, col: pattern.col, row: pattern.row };
    });
  }, [photos]);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-8" style={{ background: 'var(--album-page-bg)' }}>
      <header className="mb-10 text-center">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--obs-muted)]"
        >
          — A L B U M —
        </p>
        <p
          className="mt-2 text-2xl italic text-[var(--fg)] md:text-[24px]"
          style={{ fontFamily: 'var(--serif)' }}
        >
          Vol. 01 · {photos.length} {photos.length === 1 ? 'Frame' : 'Frames'}
        </p>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-[14px] auto-rows-[88px] sm:auto-rows-[88px] md:auto-rows-[88px]">
        {photoConfigs.map(({ photo, index, col, row }) => (
          <AlbumCard
            key={photo.path}
            photo={photo}
            index={index}
            col={col}
            row={row}
            onClick={() => onPhotoClick(photo, index)}
            onHidePhoto={onHidePhoto}
            onDeletePhoto={onDeletePhoto}
            isPanorama={panoramaPaths?.includes(photo.path)}
            onTogglePanorama={onTogglePanorama}
            isCover={coverPaths?.includes(photo.path)}
            onToggleCover={onToggleCover}
          />
        ))}
      </div>
    </div>
  );
}
