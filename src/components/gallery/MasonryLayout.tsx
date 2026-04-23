'use client';

import { useMemo, useState, useEffect } from 'react';
import { Photo } from './types';
import { PhotoCard } from './PhotoCard';
import { masonryPatternForCols } from './masonry-patterns';

interface MasonryLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

function useMasonryCols(): number {
  const [cols, setCols] = useState(5);
  useEffect(() => {
    const mq = () => {
      const w = window.innerWidth;
      if (w < 640) setCols(2);
      else if (w < 960) setCols(3);
      else if (w < 1280) setCols(4);
      else setCols(5);
    };
    mq();
    window.addEventListener('resize', mq, { passive: true });
    return () => window.removeEventListener('resize', mq);
  }, []);
  return cols;
}

export function MasonryLayout({
  photos,
  onPhotoClick,
  onHidePhoto,
  onDeletePhoto,
  panoramaPaths,
  onTogglePanorama,
  coverPaths,
  onToggleCover,
}: MasonryLayoutProps) {
  const cols = useMasonryCols();
  const rowHeight = cols >= 5 ? 92 : cols === 4 ? 88 : cols === 3 ? 84 : 78;

  const pattern = useMemo(() => masonryPatternForCols(cols), [cols]);

  return (
    <div
      className="grid w-full gap-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: `${rowHeight}px`,
      }}
    >
      {photos.map((photo, index) => {
        const spec = pattern[index % pattern.length];
        return (
          <div
            key={photo.path}
            style={{
              gridColumn: `span ${spec.col} / span ${spec.col}`,
              gridRow: `span ${spec.row} / span ${spec.row}`,
            }}
          >
            <PhotoCard
              photo={photo}
              index={index}
              total={photos.length}
              onClick={() => onPhotoClick(photo, index)}
              onHidePhoto={onHidePhoto}
              onDeletePhoto={onDeletePhoto}
              onTogglePanorama={onTogglePanorama}
              isPanorama={panoramaPaths?.includes(photo.path)}
              onToggleCover={onToggleCover}
              isCover={coverPaths?.includes(photo.path)}
              aspectRatio=""
              className="h-full min-h-0"
              thumbnailSize={400}
            />
          </div>
        );
      })}
    </div>
  );
}
