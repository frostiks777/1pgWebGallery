'use client';

import { Photo } from './types';
import { useState } from 'react';

interface EmpireLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  mode?: 'demo' | 'webdav';
}

function EmpirePhotoCard({
  photo,
  index,
  onClick
}: {
  photo: Photo;
  index: number;
  onClick: () => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = `/api/photo-file?path=${encodeURIComponent(photo.path)}`;
  
  const frameStyles = ['ornate-frame-gold', 'ornate-frame-bronze', 'ornate-frame-silver'];
  const frameStyle = frameStyles[index % frameStyles.length];

  return (
    <div className="empire-container group">
      <div className="empire-ornament-top">
        <svg viewBox="0 0 100 20" className="w-full h-5">
          <path d="M0 20 L10 10 L20 15 L30 5 L40 10 L50 0 L60 10 L70 5 L80 15 L90 10 L100 20" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <div className={`empire-frame ${frameStyle} cursor-pointer`} onClick={onClick}>
        <div className="empire-inner-border relative">
          {hasError ? (
            <div className="w-full h-48 flex flex-col items-center justify-center bg-slate-200">
              <span className="text-3xl mb-2">⚠️</span>
              <span className="text-xs text-slate-500">{photo.name}</span>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
                </div>
              )}
              <img
                src={imageUrl}
                alt={photo.name}
                className={`w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                loading="lazy"
                onLoad={() => setIsLoading(false)}
                onError={() => { setHasError(true); setIsLoading(false); }}
              />
            </>
          )}
          <div className="empire-corner empire-corner-tl">❧</div>
          <div className="empire-corner empire-corner-tr">❧</div>
          <div className="empire-corner empire-corner-bl">❧</div>
          <div className="empire-corner empire-corner-br">❧</div>
        </div>
      </div>

      <div className="empire-caption">
        <h3 className="empire-title">{photo.name.replace(/\.[^/.]+$/, '')}</h3>
        <p className="empire-date">
          {new Date(photo.lastModified).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <span className="empire-number">№ {String(index + 1).padStart(3, '0')}</span>
      </div>

      <div className="empire-ornament-bottom">
        <svg viewBox="0 0 100 20" className="w-full h-5">
          <path d="M0 0 L10 10 L20 5 L30 15 L40 10 L50 20 L60 10 L70 15 L80 5 L90 10 L100 0" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <style jsx>{`
        .empire-container {
          position: relative;
          padding: 1.5rem;
          background: linear-gradient(135deg, #faf7f2 0%, #f5ebe0 50%, #edede9 100%);
          border-radius: 4px;
          box-shadow: 0 4px 6px rgba(139, 109, 76, 0.1), 0 10px 20px rgba(139, 109, 76, 0.05);
        }
        .empire-ornament-top, .empire-ornament-bottom { color: #c9a959; opacity: 0.6; }
        .empire-frame {
          position: relative;
          padding: 12px;
          background: linear-gradient(145deg, #d4af37, #c9a959, #b8860b);
          box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3), 0 8px 24px rgba(139, 109, 76, 0.3);
          transition: all 0.5s ease;
        }
        .empire-frame:hover { transform: scale(1.02); }
        .empire-frame.ornate-frame-bronze { background: linear-gradient(145deg, #cd7f32, #b87333, #8b4513); }
        .empire-frame.ornate-frame-silver { background: linear-gradient(145deg, #c0c0c0, #a8a8a8, #808080); }
        .empire-inner-border {
          background: linear-gradient(135deg, #faf7f2, #fff);
          padding: 8px;
          position: relative;
        }
        .empire-corner {
          position: absolute;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease;
        }
        .empire-corner-tl { top: 4px; left: 8px; }
        .empire-corner-tr { top: 4px; right: 8px; }
        .empire-corner-bl { bottom: 4px; left: 8px; }
        .empire-corner-br { bottom: 4px; right: 8px; }
        .empire-caption { text-align: center; padding-top: 1rem; font-family: Georgia, serif; }
        .empire-title { font-size: 0.9rem; font-weight: 500; color: #5c4033; margin-bottom: 0.25rem; }
        .empire-date { font-size: 0.75rem; color: #8b7355; font-style: italic; margin-bottom: 0.25rem; }
        .empire-number { font-size: 0.7rem; color: #c9a959; font-weight: 600; letter-spacing: 2px; }
      `}</style>
    </div>
  );
}

export function EmpireLayout({ photos, onPhotoClick, mode = 'demo' }: EmpireLayoutProps) {
  return (
    <div className="empire-background py-8">
      <div className="text-center mb-12">
        <div className="empire-header-ornament">
          <span className="text-4xl">⚜</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 max-w-7xl mx-auto">
        {photos.map((photo, index) => (
          <EmpirePhotoCard
            key={photo.path}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
          />
        ))}
      </div>
      <style jsx global>{`
        .empire-background {
          background: linear-gradient(135deg, rgba(250, 247, 242, 0.95), rgba(245, 235, 224, 0.95));
          min-height: 100%;
        }
        .empire-header-ornament { color: #c9a959; animation: empire-shimmer 3s ease-in-out infinite; }
        @keyframes empire-shimmer { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
      `}</style>
    </div>
  );
}
