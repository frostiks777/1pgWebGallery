'use client';

import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface WaveLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  mode?: 'demo' | 'webdav';
}

function WaveItem({
  photo,
  index,
  onClick,
  mode
}: {
  photo: Photo;
  index: number;
  onClick: () => void;
  mode: 'demo' | 'webdav';
}) {
  // Create wave effect with varying heights and offsets
  const waveOffset = Math.sin(index * 0.5) * 20;
  const heights = [180, 220, 160, 240, 200, 180, 260, 190];
  const height = heights[index % heights.length];

  return (
    <div
      className="w-48 flex-shrink-0"
      style={{
        transform: `translateY(${waveOffset}px)`,
      }}
    >
      <PhotoCard
        photo={photo}
        index={index}
        onClick={onClick}
        aspectRatio=""
        className="shadow-lg hover:shadow-2xl transition-all duration-500 hover:z-10"
        mode={mode}
      />
    </div>
  );
}

export function WaveLayout({ photos, onPhotoClick, mode = 'demo' }: WaveLayoutProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 pt-12 pb-12">
      {photos.map((photo, index) => (
        <WaveItem
          key={photo.path}
          photo={photo}
          index={index}
          onClick={() => onPhotoClick(photo, index)}
          mode={mode}
        />
      ))}
    </div>
  );
}
