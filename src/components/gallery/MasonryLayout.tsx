'use client';

import { useMemo } from 'react';
import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface MasonryLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
}

export function MasonryLayout({ photos, onPhotoClick, onHidePhoto, panoramaPaths, onTogglePanorama }: MasonryLayoutProps) {
  // Create 3 columns for masonry layout - memoized to prevent recalculation
  const columns = useMemo(() => {
    const cols: Photo[][] = [[], [], []];
    photos.forEach((photo, index) => {
      cols[index % 3].push(photo);
    });
    return cols;
  }, [photos]);

  return (
    <div className="flex gap-4">
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-4">
          {column.map((photo, photoIndex) => {
            const originalIndex = colIndex + photoIndex * 3;
            return (
              <PhotoCard
                key={photo.path}
                photo={photo}
                index={originalIndex}
                onClick={() => onPhotoClick(photo, originalIndex)}
                onHidePhoto={onHidePhoto}
                onTogglePanorama={onTogglePanorama}
                isPanorama={panoramaPaths?.includes(photo.path)}
                thumbnailSize={400}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
