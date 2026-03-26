'use client';

import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface BentoLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

export function BentoLayout({ photos, onPhotoClick }: BentoLayoutProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 auto-rows-[100px] sm:auto-rows-[120px]">
      {photos.map((photo, index) => {
        // Create interesting bento patterns - responsive
        let className = '';
        let thumbnailSize = 200;
        
        // On mobile, use simpler layout without row spans to avoid overlap
        // Larger items on desktop
        if (index % 7 === 0) {
          // Large square - 2x2 on tablet/desktop, full width on mobile
          className = 'col-span-2 sm:col-span-2 row-span-1 sm:row-span-2';
          thumbnailSize = 400;
        } else if (index % 5 === 0) {
          // Wide rectangle - 2 columns, 1 row
          className = 'col-span-2 row-span-1';
          thumbnailSize = 300;
        } else if (index % 11 === 0) {
          // Tall rectangle - 1 column on mobile, 2 rows only on larger screens
          className = 'col-span-1 row-span-1 sm:row-span-2';
          thumbnailSize = 200;
        }
        
        return (
          <PhotoCard
            key={photo.path}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
            className={className}
            aspectRatio=""
            thumbnailSize={thumbnailSize}
          />
        );
      })}
    </div>
  );
}
