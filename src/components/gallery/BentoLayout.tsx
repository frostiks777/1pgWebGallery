'use client';

import { useMemo } from 'react';
import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface BentoLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

const BENTO_PATTERN: { col: string; row: string }[] = [
  { col: 'col-span-2', row: 'row-span-2' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-2' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-3', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
  { col: 'col-span-2', row: 'row-span-1' },
  { col: 'col-span-1', row: 'row-span-1' },
];

export function BentoLayout({ photos, onPhotoClick, onHidePhoto, onDeletePhoto, panoramaPaths, onTogglePanorama, coverPaths, onToggleCover }: BentoLayoutProps) {
  const photoConfigs = useMemo(() => {
    return photos.map((photo, index) => {
      const pattern = BENTO_PATTERN[index % BENTO_PATTERN.length];
      return { photo, index, col: pattern.col, row: pattern.row };
    });
  }, [photos]);

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 auto-rows-[110px] md:auto-rows-[130px] [grid-auto-flow:dense]">
      {photoConfigs.map(({ photo, index, col, row }) => (
        <PhotoCard
          key={photo.path}
          photo={photo}
          index={index}
          onClick={() => onPhotoClick(photo, index)}
          onHidePhoto={onHidePhoto}
          onDeletePhoto={onDeletePhoto}
          onTogglePanorama={onTogglePanorama}
          isPanorama={panoramaPaths?.includes(photo.path)}
          onToggleCover={onToggleCover}
          isCover={coverPaths?.includes(photo.path)}
          className={`${col} ${row}`}
          aspectRatio=""
          thumbnailSize={400}
        />
      ))}
    </div>
  );
}
