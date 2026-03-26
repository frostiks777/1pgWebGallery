'use client';

import { Photo } from './types';
import { useState } from 'react';

interface MediterraneanLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

function MediterraneanCard({ photo, index, variant, onClick }: { 
  photo: Photo; 
  index: number; 
  variant: 'tile' | 'arch' | 'window';
  onClick: () => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const size = variant === 'arch' ? 400 : variant === 'window' ? 350 : 300;
  const thumbnailUrl = `/api/thumbnail?path=${encodeURIComponent(photo.path)}&size=${size}`;
  
  const imageContent = hasError ? (
    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-2xl">⚠️</div>
  ) : (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-teal-50">
          <div className="w-6 h-6 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={thumbnailUrl}
        alt={photo.name}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => { setHasError(true); setIsLoading(false); }}
      />
    </div>
  );

  if (variant === 'arch') {
    return (
      <div className="med-arch group cursor-pointer" onClick={onClick}>
        <div className="med-arch-frame">
          {imageContent}
          <div className="med-arch-overlay">
            <div className="text-center text-white">
              <span className="text-2xl">🧭</span>
              <p className="text-sm mt-1">{photo.name.replace(/\.[^/.]+$/, '')}</p>
            </div>
          </div>
        </div>
        <style jsx>{`
          .med-arch { transition: transform 0.3s; }
          .med-arch:hover { transform: translateY(-4px); }
          .med-arch-frame {
            background: linear-gradient(180deg, #e8dcc4, #d4c4a8);
            padding: 0.75rem;
            border-radius: 50% 50% 0 0;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 77, 102, 0.15);
          }
          .med-arch-frame :global(img) { border-radius: 50% 50% 0 0; aspect-ratio: 3/4; }
          .med-arch-overlay {
            position: absolute; inset: 0.75rem;
            border-radius: 50% 50% 0 0;
            background: linear-gradient(transparent 50%, rgba(0, 77, 102, 0.8));
            display: flex; align-items: flex-end; justify-content: center;
            padding-bottom: 1.5rem;
            opacity: 0; transition: opacity 0.3s;
          }
          .med-arch:hover .med-arch-overlay { opacity: 1; }
        `}</style>
      </div>
    );
  }

  if (variant === 'window') {
    return (
      <div className="med-window group cursor-pointer" onClick={onClick}>
        <div className="med-window-frame">
          {imageContent}
          <div className="med-flower-box">🌸🌺🌸</div>
        </div>
        <p className="text-center text-sm text-teal-700 mt-2">{photo.name.replace(/\.[^/.]+$/, '')}</p>
        <style jsx>{`
          .med-window { transition: transform 0.3s; }
          .med-window:hover { transform: translateY(-4px); }
          .med-window-frame {
            position: relative;
            background: linear-gradient(135deg, #f5f5dc, #e8dcc4);
            padding: 0.5rem;
            border-radius: 8px 8px 0 0;
            box-shadow: 0 4px 12px rgba(0, 77, 102, 0.1);
          }
          .med-window-frame :global(img) { aspect-ratio: 4/3; }
          .med-flower-box {
            position: absolute; bottom: -1rem; left: 50%; transform: translateX(-50%);
            background: linear-gradient(180deg, #8b4513, #654321);
            padding: 0.25rem 0.75rem;
            border-radius: 0 0 8px 8px;
            font-size: 0.875rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="med-tile group cursor-pointer" onClick={onClick}>
      <div className="med-tile-frame">
        {imageContent}
        <div className="med-tile-overlay">
          <div className="text-white text-center">
            <span className="text-xl">⚓</span>
            <p className="text-sm font-medium mt-1">{photo.name.replace(/\.[^/.]+$/, '')}</p>
            <p className="text-xs opacity-75">{new Date(photo.lastModified).toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>
      <style jsx>{`
        .med-tile { transition: transform 0.3s; }
        .med-tile:hover { transform: translateY(-6px) rotate(-1deg); }
        .med-tile-frame {
          position: relative;
          background: white;
          padding: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 77, 102, 0.1);
        }
        .med-tile-frame :global(img) { aspect-ratio: 1; }
        .med-tile-overlay {
          position: absolute; inset: 0.5rem;
          background: linear-gradient(transparent 50%, rgba(0, 105, 148, 0.85));
          display: flex; align-items: flex-end; padding: 1rem;
          opacity: 0; transition: opacity 0.3s;
        }
        .med-tile:hover .med-tile-overlay { opacity: 1; }
      `}</style>
    </div>
  );
}

export function MediterraneanLayout({ photos, onPhotoClick }: MediterraneanLayoutProps) {
  const getVariant = (i: number) => {
    const pattern: ('tile' | 'arch' | 'window')[] = ['tile', 'tile', 'window', 'tile', 'arch', 'tile'];
    return pattern[i % pattern.length];
  };

  return (
    <div className="med-bg py-8 px-4">
      <header className="text-center mb-12 relative z-10">
        <div className="text-4xl mb-2">🐚</div>
        <h1 className="text-2xl font-serif text-teal-800">Mediterranean Gallery</h1>
        <p className="text-sm text-teal-600 mt-1 uppercase tracking-widest">{photos.length} photographs</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto relative z-10">
        {photos.map((photo, index) => (
          <div key={photo.path} className={getVariant(index) === 'arch' ? 'row-span-2' : ''}>
            <MediterraneanCard
              photo={photo}
              index={index}
              variant={getVariant(index)}
              onClick={() => onPhotoClick(photo, index)}
            />
          </div>
        ))}
      </div>
      <footer className="text-center mt-12 text-2xl opacity-40">⚓ 🐚 ⚓</footer>
      <style jsx global>{`
        .med-bg {
          background: linear-gradient(180deg, #e8f4f8 0%, #d4e8ee 30%, #e8dcc4 100%);
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
}
