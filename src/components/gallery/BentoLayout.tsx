'use client';

import { useMemo } from 'react';
import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface BentoLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

export function BentoLayout({ photos, onPhotoClick }: BentoLayoutProps) {
  // Memoize photo rendering configuration
  const photoConfigs = useMemo(() => {
    return photos.map((photo, index) => {
      let className = '';
      let thumbnailSize = 200;
      
      if (index % 7 === 0) {
        className = 'col-span-2 sm:col-span-2 row-span-1 sm:row-span-2';
        thumbnailSize = 400;
      } else if (index % 5 === 0) {
        className = 'col-span-2 row-span-1';
        thumbnailSize = 300;
      } else if (index % 11 === 0) {
        className = 'col-span-1 row-span-1 sm:row-span-2';
        thumbnailSize = 200;
      }
      
      return { photo, className, thumbnailSize, index };
    });
  }, [photos]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 auto-rows-[100px] sm:auto-rows-[120px]">
      {photoConfigs.map(({ photo, className, thumbnailSize, index }) => (
        <PhotoCard
          key={photo.path}
          photo={photo}
          index={index}
          onClick={() => onPhotoClick(photo, index)}
          className={className}
          aspectRatio=""
          thumbnailSize={thumbnailSize}
        />
      ))}
    </div>
  );
}
