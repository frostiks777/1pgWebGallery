'use client';

import { Photo } from './types';
import { useState } from 'react';

interface MediterraneanLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

type Variant = 'tile' | 'arch' | 'window' | 'circle' | 'polaroid' | 'diamond';

// Period-6 rotation of all frame variants
const VARIANT_PATTERN: Variant[] = ['arch', 'tile', 'circle', 'window', 'polaroid', 'diamond'];

function getVariant(index: number): Variant {
  return VARIANT_PATTERN[index % VARIANT_PATTERN.length];
}

// ─── individual cards ────────────────────────────────────────────────────────

function MediterraneanCard({
  photo,
  index,
  variant,
  onClick,
}: {
  photo: Photo;
  index: number;
  variant: Variant;
  onClick: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const src = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;
  const title = photo.name.replace(/\.[^/.]+$/, '');

  const img = hasError ? (
    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-2xl rounded">⚠️</div>
  ) : (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-teal-50 rounded">
          <div className="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={photo.name}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => { setHasError(true); setIsLoading(false); }}
      />
    </>
  );

  // ── Arch ────────────────────────────────────────────────────────────────────
  if (variant === 'arch') {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer group transition-transform duration-300 hover:-translate-y-2"
      >
        <div
          className="relative overflow-hidden shadow-lg"
          style={{
            borderRadius: '50% 50% 4px 4px',
            background: 'linear-gradient(180deg, #c8dfe8, #a8c8d8)',
            padding: '6px',
          }}
        >
          <div
            className="relative overflow-hidden"
            style={{ borderRadius: '50% 50% 2px 2px', aspectRatio: '3/4' }}
          >
            {img}
            <div
              className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(transparent 50%, rgba(0,77,102,0.85))' }}
            >
              <span className="text-white text-xs text-center px-2 truncate">🧭 {title}</span>
            </div>
          </div>
        </div>
        {/* arch base decorations */}
        <div className="flex justify-center gap-1 mt-1 opacity-60">
          <span className="text-teal-600 text-xs">╍╍╍</span>
        </div>
      </div>
    );
  }

  // ── Window with shutters ─────────────────────────────────────────────────────
  if (variant === 'window') {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer group transition-transform duration-300 hover:-translate-y-2"
      >
        <div
          className="relative shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f5f0e0, #e8dcc4)',
            padding: '8px 8px 0',
            borderRadius: '6px 6px 0 0',
            border: '2px solid #c8b89a',
          }}
        >
          {/* shutter bars — open on hover */}
          <div
            className="absolute inset-0 z-10 pointer-events-none grid grid-cols-3 gap-0 opacity-30 group-hover:opacity-0 transition-opacity duration-300"
            style={{ borderRadius: '6px 6px 0 0', overflow: 'hidden' }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} style={{ background: '#8b6914', opacity: 0.6 }} />
            ))}
          </div>
          <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {img}
            <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(transparent 55%, rgba(60,40,0,0.75))' }}>
              <span className="text-amber-100 text-xs px-2 pb-2 truncate">{title}</span>
            </div>
          </div>
        </div>
        {/* flower box */}
        <div
          className="flex justify-center py-1 text-sm"
          style={{ background: 'linear-gradient(180deg, #8b4513, #6b3410)', borderRadius: '0 0 4px 4px' }}
        >
          🌸🌺🌸
        </div>
      </div>
    );
  }

  // ── Circle ──────────────────────────────────────────────────────────────────
  if (variant === 'circle') {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer group flex flex-col items-center transition-transform duration-300 hover:scale-105"
      >
        {/* outer decorative ring */}
        <div
          className="relative"
          style={{
            borderRadius: '50%',
            padding: '5px',
            background: 'conic-gradient(#4db6ac, #00838f, #006064, #4db6ac)',
            boxShadow: '0 6px 20px rgba(0,96,100,0.35)',
          }}
        >
          <div
            style={{ borderRadius: '50%', padding: '3px', background: '#e0f2f1', overflow: 'hidden' }}
          >
            <div
              className="relative overflow-hidden"
              style={{ borderRadius: '50%', width: '100%', aspectRatio: '1' }}
            >
              {img}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'rgba(0,96,100,0.65)', borderRadius: '50%' }}
              >
                <span className="text-white text-xs text-center px-3 leading-tight">🐚<br />{title}</span>
              </div>
            </div>
          </div>
        </div>
        <span className="mt-1 text-teal-700 text-[10px] text-center truncate max-w-full px-1">{title}</span>
      </div>
    );
  }

  // ── Polaroid ────────────────────────────────────────────────────────────────
  if (variant === 'polaroid') {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:rotate-1"
        style={{ filter: 'drop-shadow(0 6px 14px rgba(0,77,102,0.25))' }}
      >
        <div style={{ background: '#fff', padding: '7px 7px 28px', borderRadius: '2px' }}>
          <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {img}
            <div
              className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(transparent 55%, rgba(0,77,102,0.8))' }}
            >
              <span className="text-white text-xs px-2 pb-1 truncate">⚓ {title}</span>
            </div>
          </div>
          <p
            className="text-center truncate mt-1"
            style={{ fontFamily: 'cursive', color: '#5a7a8a', fontSize: '0.7rem' }}
          >
            {title}
          </p>
        </div>
      </div>
    );
  }

  // ── Diamond (rotated square) ────────────────────────────────────────────────
  if (variant === 'diamond') {
    return (
      <div
        onClick={onClick}
        className="cursor-pointer group flex justify-center items-center transition-transform duration-300 hover:scale-105"
      >
        <div className="relative" style={{ width: '85%', aspectRatio: '1' }}>
          {/* rotated frame */}
          <div
            className="absolute inset-0 transition-transform duration-300 group-hover:rotate-3"
            style={{
              transform: 'rotate(45deg)',
              background: 'linear-gradient(135deg, #4db6ac, #006064)',
              borderRadius: '6px',
              padding: '5px',
            }}
          >
            <div
              className="w-full h-full overflow-hidden"
              style={{ transform: 'rotate(-45deg) scale(1.42)', borderRadius: '2px' }}
            >
              {img}
            </div>
          </div>
          {/* hover overlay (not rotated) */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          >
            <span
              className="text-white text-xs text-center bg-teal-900/70 px-2 py-1 rounded"
              style={{ maxWidth: '70%', lineHeight: 1.3 }}
            >
              🌊<br />{title}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Tile (default) ──────────────────────────────────────────────────────────
  return (
    <div
      onClick={onClick}
      className="cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:-rotate-1"
    >
      <div
        className="relative overflow-hidden"
        style={{
          background: 'white',
          padding: '5px',
          boxShadow: '0 4px 14px rgba(0,77,102,0.18)',
          borderRadius: '3px',
          borderBottom: '4px solid #4db6ac',
        }}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: '1' }}>
          {img}
          <div
            className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(transparent 50%, rgba(0,105,148,0.85))' }}
          >
            <div className="text-white px-2 pb-2">
              <p className="text-xs font-medium truncate">⚓ {title}</p>
              <p className="text-[10px] opacity-75">{new Date(photo.lastModified).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── layout ──────────────────────────────────────────────────────────────────

export function MediterraneanLayout({ photos, onPhotoClick }: MediterraneanLayoutProps) {
  return (
    <div
      className="py-8 px-4 min-h-screen"
      style={{ background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 35%, #e8dcc4 100%)' }}
    >
      {/* header */}
      <header className="text-center mb-10">
        <div className="text-4xl mb-2">🐚</div>
        <h1 className="text-2xl font-serif text-teal-800">Mediterranean Gallery</h1>
        <p className="text-xs text-teal-600 mt-1 uppercase tracking-widest">
          {photos.length} photographs
        </p>
        {/* variant legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-4 text-[10px] text-teal-700 opacity-70">
          {(['arch','tile','circle','window','polaroid','diamond'] as Variant[]).map(v => (
            <span key={v} className="capitalize">◆ {v}</span>
          ))}
        </div>
      </header>

      {/* grid — NO row-span on wrapper divs, so indices always match */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 max-w-7xl mx-auto">
        {photos.map((photo, index) => (
          <MediterraneanCard
            key={photo.path}
            photo={photo}
            index={index}
            variant={getVariant(index)}
            onClick={() => onPhotoClick(photo, index)}
          />
        ))}
      </div>

      <footer className="text-center mt-12 text-2xl opacity-40">⚓ 🐚 🌊</footer>
    </div>
  );
}
