'use client';

import { Photo } from './types';
import { useState } from 'react';

interface MediterraneanLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

type Variant =
  | 'arch'
  | 'tile'
  | 'circle'
  | 'window'
  | 'polaroid'
  | 'diamond'
  | 'oval'
  | 'hexagon'
  | 'film'
  | 'postcard'
  | 'porthole'
  | 'vintage'
  | 'mosaic'
  | 'banner'
  | 'shadow';

// 15 variants, period-15 rotation
const VARIANT_PATTERN: Variant[] = [
  'arch', 'tile', 'circle', 'window', 'polaroid',
  'diamond', 'oval', 'hexagon', 'film', 'postcard',
  'porthole', 'vintage', 'mosaic', 'banner', 'shadow',
];

// Some variants look better wider — they'll span 2 cols
const WIDE_VARIANTS: Set<Variant> = new Set(['banner', 'film', 'postcard']);

function getVariant(index: number): Variant {
  return VARIANT_PATTERN[index % VARIANT_PATTERN.length];
}

// ── shared image loader ───────────────────────────────────────────────────────
function MedImg({
  photo,
  className = '',
  style = {},
}: {
  photo: Photo;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const src = `/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`;

  if (error)
    return (
      <div className={`flex items-center justify-center bg-teal-50 text-2xl ${className}`} style={style}>
        ⚠️
      </div>
    );

  return (
    <div className={`relative ${className}`} style={style}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-teal-50">
          <div className="w-5 h-5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={photo.name}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
      />
    </div>
  );
}

// ── hover title overlay ───────────────────────────────────────────────────────
function HoverTitle({ title, icon = '📷' }: { title: string; icon?: string }) {
  return (
    <div className="absolute inset-0 flex items-end justify-start opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ background: 'linear-gradient(transparent 50%, rgba(0,77,102,0.85))' }}>
      <span className="text-white text-[11px] px-2 pb-2 truncate max-w-full">{icon} {title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ALL CARD VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

function MediterraneanCard({
  photo, index, variant, onClick,
}: { photo: Photo; index: number; variant: Variant; onClick: () => void }) {
  const title = photo.name.replace(/\.[^/.]+$/, '');

  // ── 1. ARCH ──────────────────────────────────────────────────────────────
  if (variant === 'arch') return (
    <div onClick={onClick} className="cursor-pointer group transition-transform duration-300 hover:-translate-y-2">
      <div className="relative overflow-hidden shadow-md"
        style={{ borderRadius: '50% 50% 4px 4px', padding: '5px', background: 'linear-gradient(180deg,#b8d8e8,#88b8cc)' }}>
        <MedImg photo={photo} className="relative overflow-hidden"
          style={{ borderRadius: '50% 50% 2px 2px', aspectRatio: '3/4' }} />
        <HoverTitle title={title} icon="🧭" />
      </div>
      <div className="text-center text-teal-600 text-[10px] opacity-60 mt-0.5">╍╍╍</div>
    </div>
  );

  // ── 2. TILE ───────────────────────────────────────────────────────────────
  if (variant === 'tile') return (
    <div onClick={onClick} className="cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 hover:-rotate-1">
      <div className="relative overflow-hidden"
        style={{ background: '#fff', padding: '5px', borderRadius: '3px', borderBottom: '4px solid #4db6ac', boxShadow: '0 4px 14px rgba(0,77,102,0.18)' }}>
        <MedImg photo={photo} className="relative overflow-hidden" style={{ aspectRatio: '1' }} />
        <HoverTitle title={title} icon="⚓" />
      </div>
    </div>
  );

  // ── 3. CIRCLE ─────────────────────────────────────────────────────────────
  if (variant === 'circle') return (
    <div onClick={onClick} className="cursor-pointer group flex flex-col items-center transition-transform duration-300 hover:scale-105">
      <div style={{ borderRadius: '50%', padding: '5px', background: 'conic-gradient(#4db6ac,#006064,#4db6ac)', boxShadow: '0 6px 20px rgba(0,96,100,0.35)' }}>
        <div style={{ borderRadius: '50%', padding: '3px', background: '#e0f2f1', overflow: 'hidden' }}>
          <div className="relative overflow-hidden" style={{ borderRadius: '50%', aspectRatio: '1' }}>
            <MedImg photo={photo} className="w-full h-full" style={{ borderRadius: '50%' }} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'rgba(0,96,100,0.65)', borderRadius: '50%' }}>
              <span className="text-white text-[11px] text-center px-2">🐚<br />{title}</span>
            </div>
          </div>
        </div>
      </div>
      <span className="mt-1 text-teal-700 text-[10px] text-center truncate max-w-full px-1">{title}</span>
    </div>
  );

  // ── 4. WINDOW ─────────────────────────────────────────────────────────────
  if (variant === 'window') return (
    <div onClick={onClick} className="cursor-pointer group transition-transform duration-300 hover:-translate-y-2">
      <div className="relative shadow-lg"
        style={{ background: 'linear-gradient(135deg,#f5f0e0,#e8dcc4)', padding: '8px 8px 0', borderRadius: '6px 6px 0 0', border: '2px solid #c8b89a' }}>
        <div className="absolute inset-0 z-10 pointer-events-none opacity-30 group-hover:opacity-0 transition-opacity duration-300 flex"
          style={{ borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
          {[0,1,2].map(i => (
            <div key={i} className="flex-1" style={{ background: '#8b6914', margin: '0 1px' }} />
          ))}
        </div>
        <MedImg photo={photo} className="relative overflow-hidden" style={{ aspectRatio: '4/3' }} />
        <HoverTitle title={title} icon="🌅" />
      </div>
      <div className="flex justify-center py-1 text-sm" style={{ background: 'linear-gradient(180deg,#8b4513,#6b3410)', borderRadius: '0 0 4px 4px' }}>🌸🌺🌸</div>
    </div>
  );

  // ── 5. POLAROID ───────────────────────────────────────────────────────────
  if (variant === 'polaroid') return (
    <div onClick={onClick} className="cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:rotate-1"
      style={{ filter: 'drop-shadow(0 6px 14px rgba(0,77,102,0.25))' }}>
      <div style={{ background: '#fff', padding: '7px 7px 28px', borderRadius: '2px' }}>
        <MedImg photo={photo} className="relative overflow-hidden" style={{ aspectRatio: '4/3' }} />
        <HoverTitle title={title} icon="⚓" />
        <p className="text-center truncate mt-1" style={{ fontFamily: 'cursive', color: '#5a7a8a', fontSize: '0.7rem' }}>{title}</p>
      </div>
    </div>
  );

  // ── 6. DIAMOND ────────────────────────────────────────────────────────────
  if (variant === 'diamond') return (
    <div onClick={onClick} className="cursor-pointer group flex justify-center items-center transition-transform duration-300 hover:scale-105">
      <div className="relative" style={{ width: '85%', aspectRatio: '1' }}>
        <div className="absolute inset-0 transition-transform duration-300"
          style={{ transform: 'rotate(45deg)', background: 'linear-gradient(135deg,#4db6ac,#006064)', borderRadius: '6px', padding: '5px' }}>
          <div className="w-full h-full overflow-hidden"
            style={{ transform: 'rotate(-45deg) scale(1.42)', borderRadius: '2px' }}>
            <img src={`/api/images?path=${encodeURIComponent(photo.path)}&size=thumbnail`} alt={photo.name}
              className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <span className="text-white text-[11px] text-center bg-teal-900/70 px-2 py-1 rounded" style={{ maxWidth: '70%' }}>🌊<br />{title}</span>
        </div>
      </div>
    </div>
  );

  // ── 7. OVAL ───────────────────────────────────────────────────────────────
  if (variant === 'oval') return (
    <div onClick={onClick} className="cursor-pointer group transition-transform duration-300 hover:-translate-y-2 flex flex-col items-center">
      <div style={{ borderRadius: '50%', padding: '5px', background: 'linear-gradient(160deg,#80cbc4,#00796b,#004d40)', boxShadow: '0 8px 24px rgba(0,77,64,0.3)' }}>
        <MedImg photo={photo} className="relative overflow-hidden"
          style={{ borderRadius: '50%', width: '100%', aspectRatio: '3/4' }} />
        <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: 'linear-gradient(transparent 50%,rgba(0,77,64,0.8))', borderRadius: '50%' }}>
          <span className="text-white text-[11px]">🫧 {title}</span>
        </div>
      </div>
      <div className="w-6 h-1 rounded-full mt-1 opacity-40" style={{ background: '#00796b' }} />
    </div>
  );

  // ── 8. HEXAGON ────────────────────────────────────────────────────────────
  if (variant === 'hexagon') return (
    <div onClick={onClick} className="cursor-pointer group transition-transform duration-300 hover:scale-105 flex justify-center">
      <div className="relative" style={{ width: '90%' }}>
        <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,96,100,0.3))' }}>
          <polygon points="50,5 95,28 95,87 50,110 5,87 5,28"
            fill="#26a69a" stroke="#00695c" strokeWidth="2" />
          <polygon points="50,11 90,32 90,83 50,104 10,83 10,32"
            fill="white" />
        </svg>
        <div className="relative" style={{ clipPath: 'polygon(50% 4%,93% 26%,93% 74%,50% 96%,7% 74%,7% 26%)', aspectRatio: '0.87' }}>
          <MedImg photo={photo} className="w-full h-full" style={{ aspectRatio: '0.87' }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'rgba(0,96,100,0.7)', clipPath: 'inherit' }}>
            <span className="text-white text-[11px] text-center px-4">🔷<br />{title}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 9. FILM STRIP (wide) ──────────────────────────────────────────────────
  if (variant === 'film') return (
    <div onClick={onClick} className="cursor-pointer group transition-transform duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden rounded" style={{ background: '#1a1a2e', padding: '8px 4px' }}>
        {/* sprocket holes top */}
        <div className="flex justify-between px-1 mb-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-sm" style={{ background: '#fff', opacity: 0.4 }} />
          ))}
        </div>
        <MedImg photo={photo} className="relative overflow-hidden" style={{ aspectRatio: '16/9' }} />
        <HoverTitle title={title} icon="🎞️" />
        {/* sprocket holes bottom */}
        <div className="flex justify-between px-1 mt-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-sm" style={{ background: '#fff', opacity: 0.4 }} />
          ))}
        </div>
        <p className="text-center text-[10px] mt-0.5 truncate px-2" style={{ color: '#f5c842', fontFamily: 'monospace' }}>{String(index + 1).padStart(4, '0')} ◆ {title}</p>
      </div>
    </div>
  );

  // ── 10. POSTCARD (wide) ───────────────────────────────────────────────────
  if (variant === 'postcard') return (
    <div onClick={onClick} className="cursor-pointer group transition-all duration-300 hover:-translate-y-1"
      style={{ filter: 'drop-shadow(0 5px 12px rgba(0,60,100,0.25))' }}>
      <div className="flex rounded-sm overflow-hidden" style={{ background: '#fdf6e3', border: '1px solid #d4c4a0' }}>
        {/* photo side */}
        <div className="relative overflow-hidden" style={{ flex: '1.4', minWidth: 0 }}>
          <MedImg photo={photo} className="w-full h-full" style={{ aspectRatio: '4/3' }} />
          <HoverTitle title={title} icon="🌊" />
        </div>
        {/* message side */}
        <div className="flex flex-col justify-between p-2" style={{ flex: 1, borderLeft: '1px solid #d4c4a0', minWidth: 0 }}>
          <div>
            {/* stamp */}
            <div className="float-right ml-1 mb-1 flex-shrink-0">
              <div className="flex items-center justify-center text-[9px] text-white font-bold"
                style={{ width: 28, height: 36, background: 'linear-gradient(135deg,#2196f3,#0d47a1)', border: '1px dashed #fff', borderRadius: '1px' }}>
                🐚
              </div>
            </div>
            <div style={{ borderBottom: '1px solid #ccc', marginBottom: 4, paddingBottom: 2 }} />
            <div style={{ borderBottom: '1px solid #ccc', marginBottom: 4, paddingBottom: 2 }} />
          </div>
          <p className="text-[9px] truncate" style={{ color: '#7a6a4a', fontFamily: 'cursive' }}>{title}</p>
          <p className="text-[8px] opacity-50 mt-1" style={{ color: '#7a6a4a' }}>
            {new Date(photo.lastModified).toLocaleDateString('ru-RU')}
          </p>
        </div>
      </div>
    </div>
  );

  // ── 11. PORTHOLE ──────────────────────────────────────────────────────────
  if (variant === 'porthole') return (
    <div onClick={onClick} className="cursor-pointer group flex flex-col items-center transition-transform duration-300 hover:scale-105">
      <div className="relative" style={{ width: '90%', aspectRatio: '1' }}>
        {/* outer ring with bolts */}
        <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg,#b0bec5,#78909c,#546e7a)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5),0 6px 20px rgba(0,0,0,0.3)' }} />
        {/* bolt decorations */}
        {[0, 90, 180, 270].map(deg => (
          <div key={deg} className="absolute w-3 h-3 rounded-full"
            style={{
              background: 'linear-gradient(135deg,#d4d4d4,#888)',
              border: '1px solid #444',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateY(-46%) translateX(-50%)`,
            }} />
        ))}
        {/* inner frame */}
        <div className="absolute" style={{ inset: '12%', borderRadius: '50%', border: '3px solid #455a64', overflow: 'hidden' }}>
          <MedImg photo={photo} className="w-full h-full" style={{ borderRadius: '50%' }} />
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'rgba(0,40,70,0.7)' }}>
            <span className="text-white text-[11px] text-center px-4">⚓<br />{title}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 12. VINTAGE ───────────────────────────────────────────────────────────
  if (variant === 'vintage') return (
    <div onClick={onClick} className="cursor-pointer group transition-all duration-300 hover:-translate-y-1.5">
      <div className="relative" style={{ padding: '6px', background: '#f5ead5', boxShadow: '2px 2px 0 #d4b896, 4px 4px 0 #c4a88a, 0 8px 20px rgba(0,0,0,0.2)' }}>
        {/* corner notches */}
        {[
          'top-0 left-0 border-t-4 border-l-4',
          'top-0 right-0 border-t-4 border-r-4',
          'bottom-0 left-0 border-b-4 border-l-4',
          'bottom-0 right-0 border-b-4 border-r-4',
        ].map((pos, i) => (
          <div key={i} className={`absolute w-4 h-4 ${pos}`} style={{ borderColor: '#a0856a' }} />
        ))}
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', filter: 'sepia(0.35) contrast(1.05)' }}>
          <MedImg photo={photo} className="w-full h-full" />
          <HoverTitle title={title} icon="🗺️" />
        </div>
        <p className="text-center text-[10px] mt-1 truncate" style={{ fontFamily: 'cursive', color: '#7a5a3a' }}>{title}</p>
      </div>
    </div>
  );

  // ── 13. MOSAIC ────────────────────────────────────────────────────────────
  if (variant === 'mosaic') return (
    <div onClick={onClick} className="cursor-pointer group transition-transform duration-300 hover:-translate-y-1.5">
      {/* mosaic tile border */}
      <div className="relative p-2"
        style={{
          background: `repeating-linear-gradient(45deg, #26a69a 0, #26a69a 4px, #fff 4px, #fff 10px,
            #80cbc4 10px, #80cbc4 14px, #fff 14px, #fff 20px)`,
          borderRadius: '4px',
          boxShadow: '0 4px 16px rgba(0,96,100,0.25)',
        }}>
        <div className="relative overflow-hidden rounded-sm" style={{ background: '#fff' }}>
          <MedImg photo={photo} className="relative overflow-hidden" style={{ aspectRatio: '1' }} />
          <HoverTitle title={title} icon="🌀" />
        </div>
      </div>
    </div>
  );

  // ── 14. BANNER ────────────────────────────────────────────────────────────
  if (variant === 'banner') return (
    <div onClick={onClick} className="cursor-pointer group transition-transform duration-300 hover:-translate-y-1">
      <div className="relative" style={{ background: '#fdf6e3', border: '2px solid #c8a96e', borderRadius: '4px', padding: '4px', boxShadow: '0 4px 16px rgba(100,70,0,0.2)' }}>
        {/* rope decoration top */}
        <div className="absolute -top-2 left-0 right-0 flex justify-between px-3 pointer-events-none">
          {['🪢', '🪢', '🪢'].map((k, i) => <span key={i} className="text-xs opacity-60">{k}</span>)}
        </div>
        <MedImg photo={photo} className="relative overflow-hidden rounded-sm" style={{ aspectRatio: '16/7' }} />
        <HoverTitle title={title} icon="🌊" />
        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-teal-700 opacity-40 text-xs">⚓</span>
          <p className="text-[11px] truncate mx-2 flex-1 text-center" style={{ color: '#7a6a4a', fontFamily: 'serif' }}>{title}</p>
          <span className="text-teal-700 opacity-40 text-xs">⚓</span>
        </div>
      </div>
    </div>
  );

  // ── 15. SHADOW ────────────────────────────────────────────────────────────
  if (variant === 'shadow') return (
    <div onClick={onClick} className="cursor-pointer group transition-all duration-300 hover:-translate-y-2 hover:rotate-2">
      <div className="relative">
        {/* coloured shadow layers */}
        <div className="absolute inset-0 rounded" style={{ transform: 'translate(6px,6px)', background: '#26a69a', opacity: 0.3 }} />
        <div className="absolute inset-0 rounded" style={{ transform: 'translate(3px,3px)', background: '#00796b', opacity: 0.25 }} />
        <div className="relative overflow-hidden rounded" style={{ aspectRatio: '4/3', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <MedImg photo={photo} className="w-full h-full" />
          <HoverTitle title={title} icon="💎" />
        </div>
      </div>
    </div>
  );

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

export function MediterraneanLayout({ photos, onPhotoClick }: MediterraneanLayoutProps) {
  return (
    <div
      className="py-8 px-4 min-h-screen"
      style={{ background: 'linear-gradient(180deg,#e8f4f8 0%,#d0e8f0 35%,#e8dcc4 100%)' }}
    >
      {/* header */}
      <header className="text-center mb-10">
        <div className="text-4xl mb-2">🐚</div>
        <h1 className="text-2xl font-serif text-teal-800">Mediterranean Gallery</h1>
        <p className="text-xs text-teal-600 mt-1 uppercase tracking-widest">
          {photos.length} photographs · {VARIANT_PATTERN.length} frame styles
        </p>
      </header>

      {/*
        Grid: 2 cols mobile → 3 tablet → 4 desktop → 5 xl
        Wide variants (film, postcard, banner) span 2 cols.
        grid-auto-flow:dense fills gaps from wide spans.
      */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5 max-w-7xl mx-auto [grid-auto-flow:dense]"
      >
        {photos.map((photo, index) => {
          const variant = getVariant(index);
          const isWide = WIDE_VARIANTS.has(variant);
          return (
            <div
              key={photo.path}
              className={isWide ? 'col-span-2' : 'col-span-1'}
            >
              <MediterraneanCard
                photo={photo}
                index={index}
                variant={variant}
                onClick={() => onPhotoClick(photo, index)}
              />
            </div>
          );
        })}
      </div>

      <footer className="text-center mt-12 text-xl opacity-40">⚓ &nbsp; 🐚 &nbsp; 🌊 &nbsp; 🧭 &nbsp; ⚓</footer>
    </div>
  );
}
