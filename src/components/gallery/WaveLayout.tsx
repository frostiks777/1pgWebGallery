'use client';

import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface WaveLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
}

export function WaveLayout({ photos, onPhotoClick, onHidePhoto }: WaveLayoutProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 pt-12 pb-12">
      {photos.map((photo, index) => {
        const waveOffset = Math.sin(index * 0.5) * 20;
        return (
          <div
            key={photo.path}
            className="w-48 flex-shrink-0"
            style={{ transform: `translateY(${waveOffset}px)` }}
          >
            <PhotoCard
              photo={photo}
              index={index}
              onClick={() => onPhotoClick(photo, index)}
              onHidePhoto={onHidePhoto}
              aspectRatio=""
              className="h-64"
              thumbnailSize={250}
            />
          </div>
        );
      })}
    </div>
  );
}
