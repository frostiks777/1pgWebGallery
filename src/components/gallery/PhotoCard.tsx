'use client';

import { Photo } from './types';
import { memo, useState } from 'react';
import { EyeOff } from 'lucide-react';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
  onHidePhoto?: (photo: Photo) => void;
  className?: string;
  aspectRatio?: string;
  thumbnailSize?: number;
}

export const PhotoCard = memo(function PhotoCard({ 
  photo, 
  index, 
  onClick,
  onHidePhoto,
  className = '',
  aspectRatio = 'aspect-square',
  thumbnailSize = 300
}: PhotoCardProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use unified optimized images API
  const imageUrl = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;
  
  return (
    <div
      className={`group relative overflow-hidden rounded-xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 bg-slate-200 dark:bg-slate-800 ${aspectRatio} ${className}`}
      onClick={onClick}
    >
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-200 dark:bg-slate-800">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-full">{photo.name}</p>
          <p className="text-xs text-red-400 mt-1">Failed to load</p>
        </div>
      ) : (
        <>
          {/* Skeleton placeholder */}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse">
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-300 dark:from-slate-700 dark:to-slate-900" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={photo.name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </>
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <p className="text-white text-sm font-medium truncate">{photo.name}</p>
        <p className="text-white/70 text-xs mt-0.5">
          {new Date(photo.lastModified).toLocaleDateString()}
        </p>
      </div>
      {/* Index badge */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          #{index + 1}
        </span>
      </div>
      {/* Hide button */}
      {onHidePhoto && (
        <button
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70"
          title="Скрыть фото"
          onClick={(e) => { e.stopPropagation(); onHidePhoto(photo); }}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
