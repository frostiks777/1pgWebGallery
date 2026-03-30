'use client';

import { Photo } from './types';
import { useState } from 'react';
import { EyeOff } from 'lucide-react';

interface HoneycombLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
}

function HexagonCard({ photo, index, onClick, onHidePhoto }: {
  photo: Photo;
  index: number;
  onClick: () => void;
  onHidePhoto?: (photo: Photo) => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const thumbnailUrl = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;
  
  return (
    <div className="hexagon-container group cursor-pointer relative" onClick={onClick}>
      <div className="hexagon relative overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-slate-100 dark:bg-slate-800">
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <span className="text-2xl">⚠️</span>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={thumbnailUrl}
              alt={photo.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              loading="lazy"
              fetchPriority="high"
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
      {/* Hide button — outside clip-path so it stays visible */}
      {onHidePhoto && (
        <button
          className="absolute top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70 z-10 pointer-events-auto"
          title="Скрыть фото"
          onClick={(e) => { e.stopPropagation(); onHidePhoto(photo); }}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      )}
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

export function HoneycombLayout({ photos, onPhotoClick, onHidePhoto }: HoneycombLayoutProps) {
  return (
    <div className="overflow-x-auto py-8">
      <div className="flex flex-wrap justify-center gap-1">
        {photos.map((photo, index) => {
          const row = Math.floor(index / 3);
          const posInRow = index % 3;
          const isEvenRow = row % 2 === 0;
          
          return (
            <div
              key={photo.path}
              style={{
                marginTop: row === 0 ? '0' : '-50px',
                marginLeft: posInRow === 0 ? '0' : '-30px',
                paddingLeft: isEvenRow && posInRow === 0 ? '90px' : '0',
              }}
            >
              <HexagonCard
                photo={photo}
                index={index}
                onClick={() => onPhotoClick(photo, index)}
                onHidePhoto={onHidePhoto}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
