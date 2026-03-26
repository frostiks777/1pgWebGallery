'use client';

import { Photo } from './types';
import { useState } from 'react';

interface MinimalismLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  mode?: 'demo' | 'webdav';
}

function MinimalistPhotoCard({
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
    <div className="minimalist-card group cursor-pointer" onClick={onClick}>
      <div className="minimalist-image-wrapper">
        {hasError ? (
          <div className="minimalist-error">
            <span>⚠️</span>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="minimalist-loader">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={photo.name}
              className={`minimalist-image ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              loading="lazy"
              onLoad={() => setIsLoading(false)}
              onError={() => { setHasError(true); setIsLoading(false); }}
            />
          </>
        )}
        
        {/* Subtle overlay on hover */}
        <div className="minimalist-overlay">
          <span className="minimalist-index">{String(index + 1).padStart(2, '0')}</span>
        </div>
      </div>
      
      {/* Minimal caption */}
      <div className="minimalist-caption">
        <span className="minimalist-name">{photo.name.replace(/\.[^/.]+$/, '')}</span>
      </div>

      <style jsx>{`
        .minimalist-card {
          position: relative;
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .minimalist-card:hover {
          transform: translateY(-4px);
        }

        .minimalist-image-wrapper {
          position: relative;
          overflow: hidden;
          background: #fafafa;
        }

        .minimalist-image {
          width: 100%;
          height: auto;
          aspect-ratio: 1;
          object-fit: cover;
          filter: grayscale(10%);
          transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .minimalist-card:hover .minimalist-image {
          filter: grayscale(0%);
          transform: scale(1.02);
        }

        .minimalist-loader {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .minimalist-error {
          width: 100%;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }

        .minimalist-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.02);
          opacity: 0;
          transition: opacity 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .minimalist-card:hover .minimalist-overlay {
          opacity: 1;
        }

        .minimalist-index {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 3rem;
          font-weight: 200;
          color: white;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
        }

        .minimalist-caption {
          padding: 1rem 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .minimalist-name {
          font-size: 0.8rem;
          font-weight: 400;
          color: #1a1a1a;
          letter-spacing: 0.02em;
          text-transform: lowercase;
        }
      `}</style>
    </div>
  );
}

export function MinimalismLayout({ photos, onPhotoClick, mode = 'demo' }: MinimalismLayoutProps) {
  return (
    <div className="minimalism-container">
      {/* Header */}
      <header className="minimalism-header">
        <div className="minimalism-line" />
        <h1 className="minimalism-title">gallery</h1>
        <div className="minimalism-line" />
        <p className="minimalism-count">{photos.length} pieces</p>
      </header>

      {/* Grid */}
      <div className="minimalism-grid">
        {photos.map((photo, index) => (
          <MinimalistPhotoCard
            key={photo.path}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photo, index)}
            mode={mode}
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="minimalism-footer">
        <div className="minimalism-line" />
        <p className="minimalism-footer-text">© photo gallery</p>
      </footer>

      <style jsx>{`
        .minimalism-container {
          background: #ffffff;
          min-height: 100vh;
          padding: 4rem 2rem;
        }

        .minimalism-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .minimalism-title {
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #1a1a1a;
          margin: 1.5rem 0;
        }

        .minimalism-line {
          width: 40px;
          height: 1px;
          background: #e0e0e0;
          margin: 0 auto;
        }

        .minimalism-count {
          font-size: 0.7rem;
          color: #999;
          letter-spacing: 0.1em;
          margin-top: 1rem;
        }

        .minimalism-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 3rem 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .minimalism-footer {
          text-align: center;
          margin-top: 6rem;
          padding-top: 2rem;
        }

        .minimalism-footer-text {
          font-size: 0.65rem;
          color: #ccc;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
