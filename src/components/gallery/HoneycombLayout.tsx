'use client';

import { useMemo, useEffect, useState } from 'react';
import { Photo } from './types';
import { EyeOff, Trash2, RectangleHorizontal, Star } from 'lucide-react';

interface HoneycombLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

function useHoneyCols(): number {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const mq = () => {
      const w = window.innerWidth;
      if (w < 640) setCols(3);
      else if (w < 960) setCols(3);
      else setCols(4);
    };
    mq();
    window.addEventListener('resize', mq, { passive: true });
    return () => window.removeEventListener('resize', mq);
  }, []);
  return cols;
}

export function HoneycombLayout({
  photos,
  onPhotoClick,
  onHidePhoto,
  onDeletePhoto,
  panoramaPaths,
  onTogglePanorama,
  coverPaths,
  onToggleCover,
}: HoneycombLayoutProps) {
  const colsPerRow = useHoneyCols();
  const layout = useMemo(() => {
    return photos.map((photo, i) => {
      const col = i % colsPerRow;
      const row = Math.floor(i / colsPerRow);
      const offsetX = row % 2 ? 90 : 0;
      return { photo, index: i, x: col * 172 + offsetX, y: row * 148 };
    });
  }, [photos, colsPerRow]);

  const maxX = layout.reduce((m, c) => Math.max(m, c.x + 170), 0);
  const maxY = layout.reduce((m, c) => Math.max(m, c.y + 196), 0);

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="relative mx-auto" style={{ width: maxX + 24, height: maxY + 24, minHeight: 200 }}>
        {layout.map(({ photo, index, x, y }) => {
          const thumbnailUrl = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;
          return (
            <div
              key={photo.path}
              className="honeycomb-tile group absolute cursor-pointer"
              style={{
                left: x + 12,
                top: y + 12,
                width: 170,
                height: 196,
              }}
              onClick={() => onPhotoClick(photo, index)}
            >
              <div
                className="honeycomb-inner relative h-full w-full motion-safe:transition-[transform,filter] motion-safe:duration-200 motion-safe:group-hover:scale-[1.04]"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
              >
              <img
                src={thumbnailUrl}
                alt={photo.name}
                className="h-full w-full object-cover bg-black"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-1">
                {onHidePhoto && (
                  <button
                    type="button"
                    className="pointer-events-auto rounded-full bg-black/55 p-1 text-white opacity-0 backdrop-blur-sm hover:bg-black/75 group-hover:opacity-100"
                    aria-label="Скрыть"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHidePhoto(photo);
                    }}
                  >
                    <EyeOff className="h-3 w-3" />
                  </button>
                )}
                {onDeletePhoto && (
                  <button
                    type="button"
                    className="pointer-events-auto rounded-full bg-red-600/80 p-1 text-white opacity-0 hover:bg-red-600 group-hover:opacity-100"
                    aria-label="Удалить"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePhoto(photo);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {onTogglePanorama && (
                  <button
                    type="button"
                    className={`pointer-events-auto rounded-full p-1 text-white backdrop-blur-sm ${
                      panoramaPaths?.includes(photo.path)
                        ? 'bg-blue-600/90 opacity-100'
                        : 'bg-black/55 opacity-0 group-hover:opacity-100'
                    }`}
                    aria-label="Панорама"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePanorama(photo);
                    }}
                  >
                    <RectangleHorizontal className="h-3 w-3" />
                  </button>
                )}
                {onToggleCover && (
                  <button
                    type="button"
                    className={`pointer-events-auto rounded-full p-1 backdrop-blur-sm ${
                      coverPaths?.includes(photo.path)
                        ? 'bg-amber-500/90 text-white opacity-100'
                        : 'bg-black/55 text-white opacity-0 group-hover:opacity-100'
                    }`}
                    aria-label="Обложка"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCover(photo);
                    }}
                  >
                    <Star className={`h-3 w-3 ${coverPaths?.includes(photo.path) ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
