'use client';

import { useEffect, useState } from 'react';
import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface WaveLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

function useWaveCols(): number {
  const [cols, setCols] = useState(8);
  useEffect(() => {
    const mq = () => {
      const w = window.innerWidth;
      if (w < 640) setCols(4);
      else if (w < 960) setCols(6);
      else if (w < 1280) setCols(6);
      else setCols(8);
    };
    mq();
    window.addEventListener('resize', mq, { passive: true });
    return () => window.removeEventListener('resize', mq);
  }, []);
  return cols;
}

export function WaveLayout({
  photos,
  onPhotoClick,
  onHidePhoto,
  onDeletePhoto,
  panoramaPaths,
  onTogglePanorama,
  coverPaths,
  onToggleCover,
}: WaveLayoutProps) {
  const cols = useWaveCols();
  return (
    <div
      className="grid w-full items-center gap-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {photos.map((photo, i) => {
        const offset = Math.sin((i / 7) * Math.PI * 1.5) * 28;
        return (
          <div
            key={photo.path}
            className="min-h-0"
            style={{
              height: 180,
              transform: `translateY(${offset}px)`,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <PhotoCard
              photo={photo}
              index={i}
              total={photos.length}
              onClick={() => onPhotoClick(photo, i)}
              onHidePhoto={onHidePhoto}
              onDeletePhoto={onDeletePhoto}
              onTogglePanorama={onTogglePanorama}
              isPanorama={panoramaPaths?.includes(photo.path)}
              onToggleCover={onToggleCover}
              isCover={coverPaths?.includes(photo.path)}
              aspectRatio=""
              className="h-full"
              thumbnailSize={280}
              showCaption={false}
            />
          </div>
        );
      })}
    </div>
  );
}
