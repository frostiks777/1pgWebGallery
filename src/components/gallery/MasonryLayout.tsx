'use client';

import { Photo } from './types';
import { PhotoCard } from './PhotoCard';
import { memo } from 'react';

interface MasonryLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  mode?: 'demo' | 'webdav';
}

export function MasonryLayout({ photos, onPhotoClick, mode = 'demo' }: MasonryLayoutProps) {
  // Create 3 columns for masonry layout
  const columns: Photo[][] = [[], [], []];
  
  photos.forEach((photo, index) => {
    columns[index % 3].push(photo);
  });

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
                mode={mode}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
