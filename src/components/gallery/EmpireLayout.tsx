'use client';

import { Photo } from './types';
import { memo } from 'react';

interface EmpireLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

const EmpirePhotoCard = memo(function EmpirePhotoCard({
  photo,
  index,
  onClick
}: {
  photo: Photo;
  index: number;
  onClick: () => void;
}) {
  // Alternating elegant frame styles
  const frameStyles = [
    'ornate-frame-gold',
    'ornate-frame-bronze',
    'ornate-frame-silver',
  ];
  const frameStyle = frameStyles[index % frameStyles.length];

  return (
    <div className="empire-container group">
      {/* Decorative top ornament */}
      <div className="empire-ornament-top">
        <svg viewBox="0 0 100 20" className="w-full h-5">
          <path
            d="M0 20 L10 10 L20 15 L30 5 L40 10 L50 0 L60 10 L70 5 L80 15 L90 10 L100 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Main frame */}
      <div
        className={`empire-frame ${frameStyle} cursor-pointer transition-all duration-500 group-hover:scale-[1.02]`}
        onClick={onClick}
      >
        {/* Inner decorative border */}
        <div className="empire-inner-border">
          <img
            src={`/api/photos${photo.path}`}
            alt={photo.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Corner decorations */}
        <div className="empire-corner empire-corner-tl">❧</div>
        <div className="empire-corner empire-corner-tr">❧</div>
        <div className="empire-corner empire-corner-bl">❧</div>
        <div className="empire-corner empire-corner-br">❧</div>
      </div>

      {/* Caption with classic typography */}
      <div className="empire-caption">
        <h3 className="empire-title">{photo.name.replace(/\.[^/.]+$/, '')}</h3>
        <p className="empire-date">
          {new Date(photo.lastModified).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        <span className="empire-number">№ {String(index + 1).padStart(3, '0')}</span>
      </div>

      {/* Decorative bottom ornament */}
      <div className="empire-ornament-bottom">
        <svg viewBox="0 0 100 20" className="w-full h-5">
          <path
            d="M0 0 L10 10 L20 5 L30 15 L40 10 L50 20 L60 10 L70 15 L80 5 L90 10 L100 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      <style jsx>{`
        .empire-container {
          position: relative;
          padding: 1.5rem;
          background: linear-gradient(135deg, #faf7f2 0%, #f5ebe0 50%, #edede9 100%);
          border-radius: 4px;
          box-shadow: 
            0 4px 6px rgba(139, 109, 76, 0.1),
            0 10px 20px rgba(139, 109, 76, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .empire-ornament-top,
        .empire-ornament-bottom {
          color: #c9a959;
          opacity: 0.6;
        }

        .empire-frame {
          position: relative;
          padding: 12px;
          background: linear-gradient(145deg, #d4af37, #c9a959, #b8860b);
          box-shadow: 
            inset 0 2px 4px rgba(255, 255, 255, 0.3),
            inset 0 -2px 4px rgba(0, 0, 0, 0.1),
            0 8px 24px rgba(139, 109, 76, 0.3);
          transition: all 0.5s ease;
        }

        .empire-frame.ornate-frame-bronze {
          background: linear-gradient(145deg, #cd7f32, #b87333, #8b4513);
        }

        .empire-frame.ornate-frame-silver {
          background: linear-gradient(145deg, #c0c0c0, #a8a8a8, #808080);
        }

        .empire-inner-border {
          background: linear-gradient(135deg, #faf7f2, #fff);
          padding: 8px;
          box-shadow: inset 0 2px 8px rgba(139, 109, 76, 0.1);
        }

        .empire-corner {
          position: absolute;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease;
        }

        .empire-corner-tl { top: 4px; left: 8px; transform: rotate(-45deg); }
        .empire-corner-tr { top: 4px; right: 8px; transform: rotate(45deg); }
        .empire-corner-bl { bottom: 4px; left: 8px; transform: rotate(-135deg); }
        .empire-corner-br { bottom: 4px; right: 8px; transform: rotate(135deg); }

        .empire-container:hover .empire-corner {
          transform: scale(1.2);
        }
        .empire-container:hover .empire-corner-tl { transform: rotate(-45deg) scale(1.2); }
        .empire-container:hover .empire-corner-tr { transform: rotate(45deg) scale(1.2); }
        .empire-container:hover .empire-corner-bl { transform: rotate(-135deg) scale(1.2); }
        .empire-container:hover .empire-corner-br { transform: rotate(135deg) scale(1.2); }

        .empire-caption {
          text-align: center;
          padding-top: 1rem;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        .empire-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: #5c4033;
          text-transform: capitalize;
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .empire-date {
          font-size: 0.75rem;
          color: #8b7355;
          font-style: italic;
          margin-bottom: 0.25rem;
        }

        .empire-number {
          font-size: 0.7rem;
          color: #c9a959;
          font-weight: 600;
          letter-spacing: 2px;
        }
      `}</style>
    </div>
  );
});

export function EmpireLayout({ photos, onPhotoClick }: EmpireLayoutProps) {
  return (
    <div className="empire-background py-8">
      {/* Decorative header */}
      <div className="text-center mb-12">
        <div className="empire-header-ornament">
          <span className="text-4xl">⚜</span>
        </div>
      </div>

      {/* Photo grid */}
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
          background: 
            linear-gradient(135deg, rgba(250, 247, 242, 0.95), rgba(245, 235, 224, 0.95)),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a959' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          min-height: 100%;
        }

        .empire-header-ornament {
          color: #c9a959;
          text-shadow: 2px 2px 4px rgba(139, 109, 76, 0.2);
          animation: empire-shimmer 3s ease-in-out infinite;
        }

        @keyframes empire-shimmer {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
