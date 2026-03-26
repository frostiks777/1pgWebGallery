'use client';

import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface BentoLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  mode?: 'demo' | 'webdav';
}

export function BentoLayout({ photos, onPhotoClick, mode = 'demo' }: BentoLayoutProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 auto-rows-[120px]">
      {photos.map((photo, index) => {
        // Create interesting bento patterns
        let className = '';
        let aspectRatio = 'aspect-square';
        
        // Make some photos larger based on position
        if (index % 7 === 0) {
          className = 'col-span-2 row-span-2';
          aspectRatio = '';
        } else if (index % 5 === 0) {
          className = 'col-span-2 row-span-1';
          aspectRatio = '';
        } else if (index % 11 === 0) {
          className = 'col-span-1 row-span-2';
          aspectRatio = '';
        }
        
        return (
          <PhotoCard
            key={photo.path}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
            className={className}
            aspectRatio={aspectRatio}
            mode={mode}
          />
        );
      })}
    </div>
  );
}
