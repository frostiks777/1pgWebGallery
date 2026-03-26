'use client';

import { Photo } from './types';
import { memo } from 'react';

interface HoneycombLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

const HexagonItem = memo(function HexagonItem({
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
      className="hexagon-container group cursor-pointer relative"
      onClick={onClick}
    >
      <div className="hexagon relative overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
        <img
          src={`/api/photos${photo.path}`}
          alt={photo.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <span className="bg-white/20 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full">
          #{index + 1}
        </span>
      </div>
      <style jsx>{`
        .hexagon-container {
          width: 180px;
          height: 200px;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
        .hexagon {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
});

export function HoneycombLayout({ photos, onPhotoClick }: HoneycombLayoutProps) {
  return (
    <div className="honeycomb-wrapper overflow-x-auto py-8">
      <div className="flex flex-wrap justify-center gap-1">
        {photos.map((photo, index) => {
          const row = Math.floor(index / 3);
          const posInRow = index % 3;
          const isEvenRow = row % 2 === 0;
          
          return (
            <div
              key={photo.path}
              className="hex-wrapper"
              style={{
                marginTop: row === 0 ? '0' : '-50px',
                marginLeft: posInRow === 0 ? '0' : '-30px',
                paddingLeft: isEvenRow && posInRow === 0 ? '90px' : '0',
              }}
            >
              <HexagonItem
                photo={photo}
                index={index}
                onClick={() => onPhotoClick(photo, index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
