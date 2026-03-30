'use client';

import { Photo } from './types';
import { useState } from 'react';
import { EyeOff } from 'lucide-react';

interface EmpireLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
}

function EmpireCard({ photo, index, onClick, onHidePhoto }: {
  photo: Photo;
  index: number;
  onClick: () => void;
  onHidePhoto?: (photo: Photo) => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const thumbnailUrl = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;
  
  const frameStyles = ['from-amber-500 to-yellow-600', 'from-orange-600 to-amber-700', 'from-gray-400 to-gray-500'];
  const frameStyle = frameStyles[index % frameStyles.length];

  return (
    <div className="empire-card group relative">
      <div className="empire-ornament">⚜</div>
      <div className={`empire-frame bg-gradient-to-br ${frameStyle}`} onClick={onClick}>
        <div className="empire-inner">
          {hasError ? (
            <div className="empire-error">⚠️</div>
          ) : (
            <>
              {isLoading && <div className="empire-loader" />}
              <img
                src={thumbnailUrl}
                alt={photo.name}
                className={`empire-image ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                loading="lazy"
                fetchPriority="high"
                onLoad={() => setIsLoading(false)}
                onError={() => { setHasError(true); setIsLoading(false); }}
              />
            </>
          )}
        </div>
      </div>
      <div className="empire-caption">
        <h3>{photo.name.replace(/\.[^/.]+$/, '')}</h3>
        <p>{new Date(photo.lastModified).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <span>№ {String(index + 1).padStart(3, '0')}</span>
      </div>
      {/* Hide button */}
      {onHidePhoto && (
        <button
          className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70 z-10"
          title="Скрыть фото"
          onClick={(e) => { e.stopPropagation(); onHidePhoto(photo); }}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      )}
      <style jsx>{`
        .empire-card {
          background: linear-gradient(135deg, #faf7f2, #f5ebe0);
          padding: 1.5rem;
          border-radius: 4px;
          box-shadow: 0 4px 20px rgba(139, 109, 76, 0.15);
          transition: transform 0.3s ease;
          cursor: pointer;
        }
        .empire-card:hover { transform: translateY(-4px); }
        .empire-ornament { text-align: center; font-size: 2rem; color: #c9a959; margin-bottom: 0.5rem; }
        .empire-frame {
          padding: 8px;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.3), 0 8px 24px rgba(139, 109, 76, 0.3);
        }
        .empire-inner { background: #faf7f2; padding: 4px; position: relative; min-height: 200px; }
        .empire-image { width: 100%; height: 200px; object-fit: cover; transition: opacity 0.3s; }
        .empire-error { width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
        .empire-loader {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: #faf7f2;
        }
        .empire-loader::after {
          content: '';
          width: 24px; height: 24px;
          border: 2px solid #e0d5c5;
          border-top-color: #c9a959;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empire-caption { text-align: center; padding-top: 1rem; font-family: Georgia, serif; }
        .empire-caption h3 { font-size: 0.9rem; color: #5c4033; margin-bottom: 0.25rem; }
        .empire-caption p { font-size: 0.75rem; color: #8b7355; font-style: italic; }
        .empire-caption span { font-size: 0.7rem; color: #c9a959; font-weight: 600; }
      `}</style>
    </div>
  );
}

export function EmpireLayout({ photos, onPhotoClick, onHidePhoto }: EmpireLayoutProps) {
  return (
    <div className="py-8 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center mb-8 text-3xl text-amber-600">⚜</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 max-w-7xl mx-auto">
        {photos.map((photo, index) => (
          <EmpireCard
            key={photo.path}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
            onHidePhoto={onHidePhoto}
          />
        ))}
      </div>
    </div>
  );
}
