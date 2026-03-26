'use client';

import { Photo } from './types';
import { useState } from 'react';

interface HoneycombLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  mode?: 'demo' | 'webdav';
}

function HexagonItem({
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
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = mode === 'demo' ? photo.path : `/api/photos${photo.path}`;
  
  return (
    <div
      className="hexagon-container group cursor-pointer relative"
      onClick={onClick}
    >
      <div className="hexagon relative overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-slate-100 dark:bg-slate-800">
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-700">
            <span className="text-2xl">⚠️</span>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={photo.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              loading="lazy"
              onLoad={() => setIsLoading(false)}
              onError={() => { setHasError(true); setIsLoading(false); }}
            />
          </>
        )}
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
}

export function HoneycombLayout({ photos, onPhotoClick, mode = 'demo' }: HoneycombLayoutProps) {
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
                mode={mode}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
