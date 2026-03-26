'use client';

import { Photo } from './types';
import { useState } from 'react';

interface MediterraneanLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  mode?: 'demo' | 'webdav';
}

function MediterraneanPhotoCard({
  photo,
  index,
  onClick,
  variant
}: {
  photo: Photo;
  index: number;
  onClick: () => void;
  variant: 'tile' | 'arch' | 'window';
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = `/api/photo-file?path=${encodeURIComponent(photo.path)}`;
  
  const imageContent = hasError ? (
    <div className="flex items-center justify-center bg-slate-200 text-3xl" style={{ width: '100%', aspectRatio: variant === 'arch' ? '3/4' : variant === 'window' ? '4/3' : 1 }}>
      ⚠️
    </div>
  ) : (
    <div className="relative" style={{ width: '100%', aspectRatio: variant === 'arch' ? '3/4' : variant === 'window' ? '4/3' : 1 }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={photo.name}
        className={`w-full h-full object-cover transition-all duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => { setHasError(true); setIsLoading(false); }}
      />
    </div>
  );

  if (variant === 'arch') {
    return (
      <div className="med-arch-card group cursor-pointer" onClick={onClick}>
        <div className="med-arch-frame">
          {imageContent}
          <div className="med-arch-overlay">
            <div className="med-arch-content">
              <span className="text-2xl">🧭</span>
              <span className="text-sm font-medium">{photo.name.replace(/\.[^/.]+$/, '')}</span>
            </div>
          </div>
        </div>
        <style jsx>{`
          .med-arch-card { position: relative; }
          .med-arch-frame {
            position: relative;
            background: linear-gradient(180deg, #e8dcc4 0%, #d4c4a8 100%);
            padding: 1rem;
            border-radius: 50% 50% 0 0;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 77, 102, 0.15);
            transition: all 0.4s ease;
          }
          .med-arch-card:hover .med-arch-frame { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0, 77, 102, 0.2); }
          .med-arch-overlay {
            position: absolute;
            inset: 1rem;
            border-radius: 50% 50% 0 0;
            background: linear-gradient(180deg, transparent 40%, rgba(0, 77, 102, 0.8) 100%);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 1.5rem;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .med-arch-card:hover .med-arch-overlay { opacity: 1; }
          .med-arch-content { text-align: center; color: white; }
        `}</style>
      </div>
    );
  }

  if (variant === 'window') {
    return (
      <div className="med-window-card group cursor-pointer" onClick={onClick}>
        <div className="med-window-frame">
          <div className="med-window-inner">
            {imageContent}
          </div>
          <div className="med-flower-box">
            <span>🌸</span><span>🌺</span><span>🌸</span>
          </div>
        </div>
        <div className="text-center pt-6 text-sm text-teal-700 font-medium">
          {photo.name.replace(/\.[^/.]+$/, '')}
        </div>
        <style jsx>{`
          .med-window-card { position: relative; }
          .med-window-frame {
            position: relative;
            background: linear-gradient(135deg, #f5f5dc 0%, #e8dcc4 100%);
            padding: 0.5rem;
            border-radius: 8px 8px 0 0;
            box-shadow: 0 4px 12px rgba(0, 77, 102, 0.15);
          }
          .med-window-inner { overflow: hidden; position: relative; }
          .med-flower-box {
            position: absolute;
            bottom: -1.5rem;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(180deg, #8b4513 0%, #654321 100%);
            padding: 0.5rem 1rem;
            border-radius: 0 0 8px 8px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="med-tile-card group cursor-pointer" onClick={onClick}>
      <div className="med-tile-frame">
        {imageContent}
        <div className="med-tile-overlay">
          <div className="med-tile-info">
            <span className="text-xl block mb-1">⚓</span>
            <span className="text-sm font-semibold block">{photo.name.replace(/\.[^/.]+$/, '')}</span>
            <span className="text-xs opacity-80 uppercase tracking-wider">
              {new Date(photo.lastModified).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .med-tile-card { position: relative; }
        .med-tile-frame {
          position: relative;
          background: white;
          padding: 0.75rem;
          box-shadow: 0 4px 12px rgba(0, 77, 102, 0.1);
          transition: all 0.4s ease;
        }
        .med-tile-card:hover .med-tile-frame { transform: translateY(-6px) rotate(-1deg); box-shadow: 0 12px 24px rgba(0, 77, 102, 0.15); }
        .med-tile-overlay {
          position: absolute;
          inset: 0.75rem;
          background: linear-gradient(180deg, transparent 50%, rgba(0, 105, 148, 0.85) 100%);
          display: flex;
          align-items: flex-end;
          padding: 1rem;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .med-tile-card:hover .med-tile-overlay { opacity: 1; }
        .med-tile-info { color: white; }
      `}</style>
    </div>
  );
}

export function MediterraneanLayout({ photos, onPhotoClick, mode = 'demo' }: MediterraneanLayoutProps) {
  const getVariant = (index: number): 'tile' | 'arch' | 'window' => {
    const pattern: ('tile' | 'arch' | 'window')[] = ['tile', 'tile', 'window', 'tile', 'arch', 'tile'];
    return pattern[index % pattern.length];
  };

  return (
    <div className="med-container">
      <div className="med-bg-elements">
        <div className="med-wave med-wave-1" />
        <div className="med-wave med-wave-2" />
      </div>
      <header className="text-center mb-12 relative z-10">
        <div className="text-4xl mb-4 animate-pulse">🐚</div>
        <h1 className="text-2xl font-semibold text-teal-800 font-serif">Mediterranean Gallery</h1>
        <p className="text-sm text-teal-600 uppercase tracking-widest mt-2">{photos.length} photographs</p>
      </header>
      <div className="med-grid">
        {photos.map((photo, index) => (
          <div key={photo.path} className={getVariant(index) === 'arch' ? 'row-span-2' : ''}>
            <MediterraneanPhotoCard
              photo={photo}
              index={index}
              onClick={() => onPhotoClick(photo, index)}
              variant={getVariant(index)}
            />
          </div>
        ))}
      </div>
      <footer className="text-center mt-12 relative z-10 text-2xl opacity-40 tracking-widest">
        ⚓ 🐚 ⚓
      </footer>
      <style jsx global>{`
        .med-container {
          position: relative;
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f4f8 0%, #d4e8ee 30%, #c9dde6 60%, #e8dcc4 100%);
          padding: 3rem 2rem;
          overflow: hidden;
        }
        .med-bg-elements { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .med-wave { position: absolute; width: 200%; height: 100px; background: rgba(0, 105, 148, 0.03); border-radius: 100% 100% 0 0; }
        .med-wave-1 { bottom: 10%; left: -50%; animation: med-wave 15s ease-in-out infinite; }
        .med-wave-2 { bottom: 20%; left: -30%; animation: med-wave 18s ease-in-out infinite reverse; opacity: 0.5; }
        @keyframes med-wave { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(5%); } }
        .med-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 2.5rem; max-width: 1400px; margin: 0 auto; position: relative; z-index: 1; }
      `}</style>
    </div>
  );
}
