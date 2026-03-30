'use client';

import { useMemo, useState } from 'react';
import { Photo } from './types';
import { EyeOff } from 'lucide-react';

interface AlbumLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
}

// 7-item repeating pattern: one featured 2×2 tile, six regular 1×1 tiles
const ALBUM_PATTERN: { col: string; row: string }[] = [
  { col: 'col-span-2', row: 'row-span-2' }, // 0 — featured
  { col: 'col-span-1', row: 'row-span-1' }, // 1
  { col: 'col-span-1', row: 'row-span-1' }, // 2
  { col: 'col-span-1', row: 'row-span-1' }, // 3
  { col: 'col-span-1', row: 'row-span-1' }, // 4
  { col: 'col-span-1', row: 'row-span-1' }, // 5
  { col: 'col-span-1', row: 'row-span-1' }, // 6
];

function AlbumCard({
  photo,
  index,
  col,
  row,
  onClick,
  onHidePhoto,
}: {
  photo: Photo;
  index: number;
  col: string;
  row: string;
  onClick: () => void;
  onHidePhoto?: (photo: Photo) => void;
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
      {/* White mat / print frame */}
      <div className="flex-1 bg-white p-2 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col min-h-0">
        {/* Photo area */}
        <div className="flex-1 overflow-hidden bg-[#ede8e0] relative min-h-0">
          {!hasError && (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-content-center">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-[#d0c8bc] border-t-[#8a7d6e] mx-auto"
                    style={{ animation: 'album-spin 0.8s linear infinite' }}
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
            <div className="absolute inset-0 flex items-center justify-center text-[#b0a898] text-2xl">
              ✕
            </div>
          )}
          {/* Subtle number overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-end p-1.5 opacity-0 group-hover:opacity-100">
            <span className="text-[10px] font-mono text-white/80">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
          {/* Hide button */}
          {onHidePhoto && (
            <button
              className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-sm text-white rounded-full p-1 hover:bg-black/70 z-10"
              title="Скрыть фото"
              onClick={(e) => { e.stopPropagation(); onHidePhoto(photo); }}
            >
              <EyeOff className="h-3 w-3" />
            </button>
          )}
        </div>
        {/* Caption — inside the mat, below the photo */}
        <p className="mt-1.5 text-[10px] tracking-wider text-[#6b5e52] lowercase truncate leading-tight shrink-0">
          {caption}
        </p>
      </div>
      <style>{`@keyframes album-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function AlbumLayout({ photos, onPhotoClick, onHidePhoto }: AlbumLayoutProps) {
  const photoConfigs = useMemo(() => {
    return photos.map((photo, index) => {
      const pattern = ALBUM_PATTERN[index % ALBUM_PATTERN.length];
      return { photo, index, col: pattern.col, row: pattern.row };
    });
  }, [photos]);

  return (
    <div className="min-h-screen bg-[#f0ebe3] py-10 px-4 sm:px-8">
      {/* Minimal header */}
      <header className="text-center mb-10">
        <div className="w-8 h-px bg-[#c8b89a] mx-auto" />
        <p className="text-[10px] tracking-[0.35em] uppercase text-[#9a8878] my-3">album</p>
        <div className="w-8 h-px bg-[#c8b89a] mx-auto" />
        <p className="text-[10px] text-[#b0a090] tracking-wider mt-3">{photos.length} photos</p>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 auto-rows-[120px] sm:auto-rows-[140px] md:auto-rows-[160px] [grid-auto-flow:dense] max-w-7xl mx-auto">
        {photoConfigs.map(({ photo, index, col, row }) => (
          <AlbumCard
            key={photo.path}
            photo={photo}
            index={index}
            col={col}
            row={row}
            onClick={() => onPhotoClick(photo, index)}
            onHidePhoto={onHidePhoto}
          />
        ))}
      </div>

      {/* Minimal footer */}
      <footer className="text-center mt-10">
        <div className="w-8 h-px bg-[#c8b89a] mx-auto" />
        <p className="text-[10px] text-[#c0b0a0] tracking-widest mt-3">© photo gallery</p>
      </footer>
    </div>
  );
}
