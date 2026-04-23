'use client';

import { Photo } from './types';
import { PhotoCard } from './PhotoCard';

interface EmpireLayoutProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onHidePhoto?: (photo: Photo) => void;
  onDeletePhoto?: (photo: Photo) => void;
  panoramaPaths?: string[];
  onTogglePanorama?: (photo: Photo) => void;
  coverPaths?: string[];
  onToggleCover?: (photo: Photo) => void;
}

function slot(photos: Photo[], i: number): Photo {
  if (photos.length === 0) throw new Error('EmpireLayout requires photos');
  return photos[Math.min(i, photos.length - 1)];
}

export function EmpireLayout({
  photos,
  onPhotoClick,
  onHidePhoto,
  onDeletePhoto,
  panoramaPaths,
  onTogglePanorama,
  coverPaths,
  onToggleCover,
}: EmpireLayoutProps) {
  if (photos.length === 0) return null;

  const p = (i: number) => slot(photos, i);
  const idx = (i: number) => Math.min(i, photos.length - 1);

  const cardProps = (photo: Photo, index: number, extra?: { frameLabel?: string }) => ({
    photo,
    index,
    total: photos.length,
    onClick: () => onPhotoClick(photo, index),
    onHidePhoto,
    onDeletePhoto,
    onTogglePanorama,
    isPanorama: panoramaPaths?.includes(photo.path),
    onToggleCover,
    isCover: coverPaths?.includes(photo.path),
    aspectRatio: '' as const,
    className: 'min-h-0 h-full w-full',
    thumbnailSize: 500,
    ...extra,
  });

  return (
    <div
      className="mx-auto grid w-full max-w-6xl gap-2.5 px-1"
      style={{
        gridTemplateColumns: '1fr 2fr 1fr',
        gridTemplateRows: 'minmax(160px, 1fr) minmax(160px, 1fr)',
        minHeight: 380,
      }}
    >
      <div
        className="grid h-full min-h-0 gap-2.5"
        style={{ gridColumn: '1', gridRow: '1 / span 2', gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
      >
        <PhotoCard {...cardProps(p(1), idx(1))} />
        <PhotoCard {...cardProps(p(2), idx(2))} />
      </div>
      <div
        className="min-h-0 h-full overflow-hidden rounded-[var(--r-sm)] border border-[var(--surface-border)]"
        style={{ gridColumn: '2', gridRow: '1 / span 2' }}
      >
        <PhotoCard {...cardProps(p(0), idx(0), { frameLabel: 'HERO' })} />
      </div>
      <div
        className="grid h-full min-h-0 gap-2.5"
        style={{ gridColumn: '3', gridRow: '1 / span 2', gridTemplateRows: 'repeat(3, minmax(0, 1fr))' }}
      >
        <PhotoCard {...cardProps(p(3), idx(3))} />
        <PhotoCard {...cardProps(p(4), idx(4))} />
        <PhotoCard {...cardProps(p(5), idx(5))} />
      </div>
    </div>
  );
}
