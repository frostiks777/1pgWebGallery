'use client';

import { Photo } from './types';
import { useState } from 'react';
import { EyeOff } from 'lucide-react';

interface MinimalismLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
}

function MinimalistCard({ photo, index, onClick, onHidePhoto }: {
  photo: Photo;
  index: number;
  onClick: () => void;
  onHidePhoto?: (photo: Photo) => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const thumbnailUrl = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;
  
  return (
    <div className="min-card group cursor-pointer" onClick={onClick}>
      <div className="min-image-wrapper">
        {hasError ? (
          <div className="min-error">⚠️</div>
        ) : (
          <>
            {isLoading && <div className="min-loader" />}
            <img
              src={thumbnailUrl}
              alt={photo.name}
              className={`min-image ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              loading="lazy"
              fetchPriority="high"
              onLoad={() => setIsLoading(false)}
              onError={() => { setHasError(true); setIsLoading(false); }}
            />
          </>
        )}
        <div className="min-overlay">
          <span className="min-index">{String(index + 1).padStart(2, '0')}</span>
        </div>
        {/* Hide button */}
        {onHidePhoto && (
          <button
            className="min-hide-btn"
            title="Скрыть фото"
            onClick={(e) => { e.stopPropagation(); onHidePhoto(photo); }}
          >
            <EyeOff style={{ width: '14px', height: '14px' }} />
          </button>
        )}
      </div>
      <div className="min-caption">
        <span>{photo.name.replace(/\.[^/.]+$/, '')}</span>
      </div>
      <style jsx>{`
        .min-card { transition: transform 0.4s ease; }
        .min-card:hover { transform: translateY(-4px); }
        .min-image-wrapper { position: relative; overflow: hidden; background: #fafafa; aspect-ratio: 1; }
        .min-image { width: 100%; height: 100%; object-fit: cover; filter: grayscale(10%); transition: all 0.6s ease; }
        .min-card:hover .min-image { filter: grayscale(0%); transform: scale(1.02); }
        .min-loader {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .min-loader::after {
          content: '';
          width: 24px; height: 24px;
          border: 2px solid #e5e5e5;
          border-top-color: #666;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .min-error { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2rem; background: #f5f5f5; }
        .min-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.02);
          opacity: 0; transition: opacity 0.3s;
          display: flex; align-items: center; justify-content: center;
        }
        .min-card:hover .min-overlay { opacity: 1; }
        .min-index { font-family: monospace; font-size: 3rem; font-weight: 200; color: white; text-shadow: 0 2px 20px rgba(0,0,0,0.3); }
        .min-caption { padding: 1rem 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .min-caption span { font-size: 0.8rem; color: #1a1a1a; letter-spacing: 0.02em; text-transform: lowercase; }
        .min-hide-btn {
          position: absolute; top: 8px; left: 8px;
          opacity: 0; transition: opacity 0.2s;
          background: rgba(0,0,0,0.5);
          color: white;
          border: none; border-radius: 50%; padding: 6px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .min-card:hover .min-hide-btn { opacity: 1; }
        .min-hide-btn:hover { background: rgba(0,0,0,0.7); }
      `}</style>
    </div>
  );
}

export function MinimalismLayout({ photos, onPhotoClick, onHidePhoto }: MinimalismLayoutProps) {
  return (
    <div className="bg-white min-h-screen py-16 px-8">
      <header className="text-center mb-12">
        <div className="w-10 h-px bg-gray-200 mx-auto" />
        <h1 className="text-xs tracking-[0.3em] uppercase text-gray-800 my-4">gallery</h1>
        <div className="w-10 h-px bg-gray-200 mx-auto" />
        <p className="text-xs text-gray-400 tracking-wider mt-4">{photos.length} pieces</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12 max-w-7xl mx-auto">
        {photos.map((photo, index) => (
          <MinimalistCard
            key={photo.path}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
            onHidePhoto={onHidePhoto}
          />
        ))}
      </div>
      <footer className="text-center mt-16">
        <div className="w-10 h-px bg-gray-200 mx-auto" />
        <p className="text-xs text-gray-300 tracking-widest mt-4">© photo gallery</p>
      </footer>
    </div>
  );
}
