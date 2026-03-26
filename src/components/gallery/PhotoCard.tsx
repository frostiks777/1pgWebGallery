'use client';

import { Photo } from './types';
import { memo, useState } from 'react';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
  className?: string;
  aspectRatio?: string;
}

export const PhotoCard = memo(function PhotoCard({ 
  photo, 
  index, 
  onClick,
  className = '',
  aspectRatio = 'aspect-square'
}: PhotoCardProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = `/api/photos${photo.path}`;
  
  return (
    <div
      className={`group relative overflow-hidden rounded-xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 bg-slate-100 dark:bg-slate-800 ${aspectRatio} ${className}`}
      onClick={onClick}
    >
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-full">{photo.name}</p>
          <p className="text-xs text-red-400 mt-1">Failed to load</p>
          <p className="text-xs text-slate-400 mt-2 truncate max-w-full" title={imageUrl}>
            {imageUrl.length > 40 ? imageUrl.substring(0, 40) + '...' : imageUrl}
          </p>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={photo.name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              console.error(`[Gallery] Failed to load image: ${imageUrl}`, e);
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </>
      )}
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
