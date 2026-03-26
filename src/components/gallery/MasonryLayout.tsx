'use client';

import { Photo } from './types';
import { memo } from 'react';

interface MasonryLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

const PhotoCard = memo(function PhotoCard({ 
  photo, 
  index, 
  onClick 
}: { 
  photo: Photo; 
  index: number;
  onClick: () => void;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300"
      onClick={onClick}
    >
      <img
        src={`/api/photos${photo.path}`}
        alt={photo.name}
        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <p className="text-white text-sm font-medium truncate">{photo.name}</p>
        <p className="text-white/70 text-xs mt-1">
          {new Date(photo.lastModified).toLocaleDateString()}
        </p>
      </div>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="bg-white/20 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full">
          #{index + 1}
        </span>
      </div>
    </div>
  );
});

export function MasonryLayout({ photos, onPhotoClick }: MasonryLayoutProps) {
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
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
