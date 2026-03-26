'use client';

import { Photo } from './types';
import { memo } from 'react';

interface MediterraneanLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

const MediterraneanPhotoCard = memo(function MediterraneanPhotoCard({
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
  if (variant === 'arch') {
    return (
      <div className="med-arch-card group cursor-pointer" onClick={onClick}>
        <div className="med-arch-frame">
          <img
            src={`/api/photos${photo.path}`}
            alt={photo.name}
            className="med-arch-image"
            loading="lazy"
          />
          <div className="med-arch-overlay">
            <div className="med-arch-content">
              <span className="med-icon">🧭</span>
              <span className="med-name">{photo.name.replace(/\.[^/.]+$/, '')}</span>
            </div>
          </div>
        </div>

        <style jsx>{`
          .med-arch-card {
            position: relative;
          }

          .med-arch-frame {
            position: relative;
            background: linear-gradient(180deg, #e8dcc4 0%, #d4c4a8 100%);
            padding: 1rem;
            border-radius: 50% 50% 0 0;
            overflow: hidden;
            box-shadow: 
              0 4px 12px rgba(0, 77, 102, 0.15),
              inset 0 2px 0 rgba(255, 255, 255, 0.5);
            transition: all 0.4s ease;
          }

          .med-arch-card:hover .med-arch-frame {
            transform: translateY(-4px);
            box-shadow: 
              0 8px 24px rgba(0, 77, 102, 0.2),
              inset 0 2px 0 rgba(255, 255, 255, 0.5);
          }

          .med-arch-image {
            width: 100%;
            aspect-ratio: 3/4;
            object-fit: cover;
            border-radius: 50% 50% 0 0;
            transition: transform 0.6s ease;
          }

          .med-arch-card:hover .med-arch-image {
            transform: scale(1.03);
          }

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

          .med-arch-card:hover .med-arch-overlay {
            opacity: 1;
          }

          .med-arch-content {
            text-align: center;
            color: white;
          }

          .med-icon {
            font-size: 1.5rem;
            display: block;
            margin-bottom: 0.5rem;
          }

          .med-name {
            font-size: 0.8rem;
            font-weight: 500;
            letter-spacing: 0.05em;
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'window') {
    return (
      <div className="med-window-card group cursor-pointer" onClick={onClick}>
        {/* Shutters */}
        <div className="med-shutter med-shutter-left">
          <div className="med-shutter-slat" />
          <div className="med-shutter-slat" />
          <div className="med-shutter-slat" />
        </div>
        <div className="med-shutter med-shutter-right">
          <div className="med-shutter-slat" />
          <div className="med-shutter-slat" />
          <div className="med-shutter-slat" />
        </div>

        {/* Window frame */}
        <div className="med-window-frame">
          <div className="med-window-inner">
            <img
              src={`/api/photos${photo.path}`}
              alt={photo.name}
              className="med-window-image"
              loading="lazy"
            />
          </div>
          
          {/* Flower box */}
          <div className="med-flower-box">
            <span className="med-flower">🌸</span>
            <span className="med-flower">🌺</span>
            <span className="med-flower">🌸</span>
          </div>
        </div>

        <div className="med-window-caption">
          <span className="med-caption-text">{photo.name.replace(/\.[^/.]+$/, '')}</span>
        </div>

        <style jsx>{`
          .med-window-card {
            position: relative;
            perspective: 800px;
          }

          .med-window-frame {
            position: relative;
            background: linear-gradient(135deg, #f5f5dc 0%, #e8dcc4 100%);
            padding: 0.5rem;
            border-radius: 8px 8px 0 0;
            box-shadow: 
              0 4px 12px rgba(0, 77, 102, 0.15),
              inset 0 2px 0 rgba(255, 255, 255, 0.8);
          }

          .med-window-inner {
            overflow: hidden;
            background: #87ceeb;
          }

          .med-window-image {
            width: 100%;
            aspect-ratio: 4/3;
            object-fit: cover;
            transition: transform 0.5s ease;
          }

          .med-window-card:hover .med-window-image {
            transform: scale(1.05);
          }

          .med-shutter {
            position: absolute;
            top: 0;
            width: 35%;
            height: 70%;
            background: linear-gradient(180deg, #2d5a7b 0%, #1a3a52 100%);
            transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
          }

          .med-shutter-left {
            left: -30%;
            border-radius: 8px 0 0 0;
            transform-origin: right center;
          }

          .med-shutter-right {
            right: -30%;
            border-radius: 8px 8px 0 0;
            transform-origin: left center;
          }

          .med-window-card:hover .med-shutter-left {
            transform: rotateY(-120deg);
            left: -35%;
          }

          .med-window-card:hover .med-shutter-right {
            transform: rotateY(120deg);
            right: -35%;
          }

          .med-shutter-slat {
            height: 30%;
            margin: 5%;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
          }

          .med-flower-box {
            position: absolute;
            bottom: -1.5rem;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(180deg, #8b4513 0%, #654321 100%);
            padding: 0.5rem 1rem;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .med-flower {
            margin: 0 0.25rem;
            font-size: 1rem;
          }

          .med-window-caption {
            text-align: center;
            padding-top: 2rem;
          }

          .med-caption-text {
            font-size: 0.75rem;
            color: #2d5a7b;
            letter-spacing: 0.05em;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  // Default tile variant
  return (
    <div className="med-tile-card group cursor-pointer" onClick={onClick}>
      <div className="med-tile-frame">
        <img
          src={`/api/photos${photo.path}`}
          alt={photo.name}
          className="med-tile-image"
          loading="lazy"
        />
        <div className="med-tile-overlay">
          <div className="med-tile-info">
            <span className="med-tile-icon">⚓</span>
            <span className="med-tile-name">{photo.name.replace(/\.[^/.]+$/, '')}</span>
            <span className="med-tile-date">
              {new Date(photo.lastModified).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short'
              })}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .med-tile-card {
          position: relative;
        }

        .med-tile-frame {
          position: relative;
          background: white;
          padding: 0.75rem;
          box-shadow: 
            0 4px 12px rgba(0, 77, 102, 0.1),
            0 2px 4px rgba(0, 77, 102, 0.05);
          transition: all 0.4s ease;
        }

        .med-tile-card:hover .med-tile-frame {
          transform: translateY(-6px) rotate(-1deg);
          box-shadow: 
            0 12px 24px rgba(0, 77, 102, 0.15),
            0 4px 8px rgba(0, 77, 102, 0.1);
        }

        .med-tile-image {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .med-tile-card:hover .med-tile-image {
          transform: scale(1.05);
        }

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

        .med-tile-card:hover .med-tile-overlay {
          opacity: 1;
        }

        .med-tile-info {
          color: white;
        }

        .med-tile-icon {
          font-size: 1.25rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .med-tile-name {
          font-size: 0.85rem;
          font-weight: 600;
          display: block;
          margin-bottom: 0.25rem;
        }

        .med-tile-date {
          font-size: 0.7rem;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
});

export function MediterraneanLayout({ photos, onPhotoClick }: MediterraneanLayoutProps) {
  // Assign variants in pattern
  const getVariant = (index: number): 'tile' | 'arch' | 'window' => {
    const pattern: ('tile' | 'arch' | 'window')[] = ['tile', 'tile', 'window', 'tile', 'arch', 'tile'];
    return pattern[index % pattern.length];
  };

  return (
    <div className="med-container">
      {/* Decorative background elements */}
      <div className="med-bg-elements">
        <div className="med-wave med-wave-1" />
        <div className="med-wave med-wave-2" />
        <div className="med-wave med-wave-3" />
      </div>

      {/* Header */}
      <header className="med-header">
        <div className="med-header-icon">🐚</div>
        <h1 className="med-title">Mediterranean Gallery</h1>
        <p className="med-subtitle">{photos.length} photographs</p>
      </header>

      {/* Photo grid */}
      <div className="med-grid">
        {photos.map((photo, index) => (
          <div key={photo.path} className={`med-item med-item-${getVariant(index)}`}>
            <MediterraneanPhotoCard
              photo={photo}
              index={index}
              onClick={() => onPhotoClick(photo, index)}
              variant={getVariant(index)}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="med-footer">
        <div className="med-footer-decor">
          <span>⚓</span>
          <span>🐚</span>
          <span>⚓</span>
        </div>
      </footer>

      <style jsx>{`
        .med-container {
          position: relative;
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f4f8 0%, #d4e8ee 30%, #c9dde6 60%, #e8dcc4 100%);
          padding: 3rem 2rem;
          overflow: hidden;
        }

        .med-bg-elements {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .med-wave {
          position: absolute;
          width: 200%;
          height: 100px;
          background: rgba(0, 105, 148, 0.03);
          border-radius: 100% 100% 0 0;
        }

        .med-wave-1 {
          bottom: 10%;
          left: -50%;
          animation: med-wave 15s ease-in-out infinite;
        }

        .med-wave-2 {
          bottom: 15%;
          left: -30%;
          animation: med-wave 18s ease-in-out infinite reverse;
          opacity: 0.5;
        }

        .med-wave-3 {
          bottom: 5%;
          left: -70%;
          animation: med-wave 20s ease-in-out infinite;
          opacity: 0.3;
        }

        @keyframes med-wave {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(5%) translateY(-10px); }
        }

        .med-header {
          text-align: center;
          margin-bottom: 4rem;
          position: relative;
          z-index: 1;
        }

        .med-header-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          animation: med-float 3s ease-in-out infinite;
        }

        @keyframes med-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .med-title {
          font-size: 1.75rem;
          font-weight: 600;
          color: #004d66;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          font-family: Georgia, serif;
        }

        .med-subtitle {
          font-size: 0.8rem;
          color: #2d5a7b;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .med-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 2.5rem;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .med-item {
          transition: transform 0.3s ease;
        }

        .med-item-arch {
          grid-row: span 2;
        }

        .med-item-window {
          grid-column: span 1;
        }

        .med-footer {
          text-align: center;
          margin-top: 4rem;
          position: relative;
          z-index: 1;
        }

        .med-footer-decor {
          font-size: 1.5rem;
          letter-spacing: 2rem;
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
}
