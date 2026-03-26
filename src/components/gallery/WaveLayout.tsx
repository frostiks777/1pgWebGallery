'use client';

import { Photo } from './types';
import { memo } from 'react';

interface WaveLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

const WaveItem = memo(function WaveItem({
  photo,
  index,
  onClick
}: {
  photo: Photo;
  index: number;
  onClick: () => void;
}) {
  // Create wave effect with varying heights and offsets
  const waveOffset = Math.sin(index * 0.5) * 20;
  const rotation = Math.sin(index * 0.3) * 3;
  const scale = 0.95 + Math.sin(index * 0.7) * 0.05;
  const heights = [180, 220, 160, 240, 200, 180, 260, 190];
  const height = heights[index % heights.length];

  return (
    <div
      className="group relative overflow-hidden rounded-xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 hover:z-10"
      style={{
        transform: `translateY(${waveOffset}px) rotate(${rotation}deg) scale(${scale})`,
        height: `${height}px`,
      }}
      onClick={onClick}
    >
      <img
        src={`/api/photos${photo.path}`}
        alt={photo.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <p className="text-white text-sm font-medium truncate">{photo.name}</p>
      </div>
      <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        #{index + 1}
      </div>
    </div>
  );
});

export function WaveLayout({ photos, onPhotoClick }: WaveLayoutProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 pt-12 pb-12">
      {photos.map((photo, index) => (
        <div key={photo.path} className="w-48 flex-shrink-0">
          <WaveItem
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
          />
        </div>
      ))}
    </div>
  );
}
