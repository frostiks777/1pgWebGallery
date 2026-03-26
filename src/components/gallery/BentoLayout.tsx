'use client';

import { Photo } from './types';
import { memo } from 'react';

interface BentoLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

const PhotoItem = memo(function PhotoItem({
  photo,
  index,
  onClick,
  className
}: {
  photo: Photo;
  index: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 ${className || ''}`}
      onClick={onClick}
    >
      <img
        src={`/api/photos${photo.path}`}
        alt={photo.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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

export function BentoLayout({ photos, onPhotoClick }: BentoLayoutProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 auto-rows-[120px]">
      {photos.map((photo, index) => {
        // Create interesting bento patterns
        let className = 'col-span-1 row-span-1';
        
        // Make some photos larger based on position
        if (index % 7 === 0) {
          className = 'col-span-2 row-span-2';
        } else if (index % 5 === 0) {
          className = 'col-span-2 row-span-1';
        } else if (index % 11 === 0) {
          className = 'col-span-1 row-span-2';
        }
        
        return (
          <PhotoItem
            key={photo.path}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
            className={className}
          />
        );
      })}
    </div>
  );
}
